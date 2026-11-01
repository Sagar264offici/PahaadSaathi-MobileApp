import type { BLEDevice } from 'munim-bluetooth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { relayEngine } from './engine';
import type { RelayMessage } from './protocol';
import { addRelayedHazard, hazardTypes, type HazardType } from '@/data/hazardStore';

const SERVICE_UUID = 'bf2c2b18-4e93-4a02-bc06-08e3a8791a10';
const CHARACTERISTIC_UUID = 'bf2c2b18-4e93-4a02-bc06-08e3a8791a11';
const CHUNK_DATA_BYTES = 14;
const BLUETOOTH_RELAY_PREF_KEY = 'pahaadsaathi:bluetooth_relay_enabled';

export type BluetoothPeer = { id: string; name: string; connected: boolean; rssi?: number };
export type BluetoothRelayState = {
  enabled: boolean;
  available: boolean;
  status: 'off' | 'searching' | 'error';
  peers: BluetoothPeer[];
  error?: string;
};

const peers = new Map<string, BluetoothPeer>();
const connecting = new Set<string>();
const sentMessages = new Set<string>();
const fragments = new Map<string, { count: number; parts: Array<Uint8Array | undefined> }>();
const listeners = new Set<(state: BluetoothRelayState) => void>();
let bleApi: typeof import('munim-bluetooth') | undefined;
const eventRemovers: Array<() => void> = [];
let relayUnsubscribe: (() => void) | undefined;
let state: BluetoothRelayState = { enabled: false, available: true, status: 'off', peers: [] };

export function getBluetoothRelayState() {
  return state;
}

export function subscribeBluetoothRelay(listener: (state: BluetoothRelayState) => void) {
  listeners.add(listener);
  listener(state);
  return () => { listeners.delete(listener); };
}

function publish(next: Partial<BluetoothRelayState>) {
  state = { ...state, ...next, peers: [...peers.values()] };
  listeners.forEach((listener) => listener(state));
}

export async function startBluetoothRelay() {
  if (state.enabled) return;
  try {
    try {
      bleApi = await import('munim-bluetooth');
    } catch {
      throw new Error('Bluetooth support is missing from this app build. Install a rebuilt iOS or Android app to use nearby relay.');
    }
    await relayEngine.init();
    const granted = await bleApi.requestBluetoothPermission(['scan', 'connect', 'advertise']);
    if (!granted) throw new Error('Bluetooth permission was not granted.');

    if (!(await bleApi.isBluetoothEnabled()) && !(await bleApi.requestEnable())) throw new Error('Turn on Bluetooth to find nearby PahaadSaathi phones.');
    const capabilities = await bleApi.getCapabilities();
    if (!capabilities.supportsBlePeripheral || !capabilities.supportsBleCentral) {
      throw new Error('This phone does not support Bluetooth relay.');
    }

    bleApi.setServices([
      {
        uuid: SERVICE_UUID,
        characteristics: [{
          uuid: CHARACTERISTIC_UUID,
          properties: ['read', 'write', 'writeWithoutResponse', 'notify'],
          value: '00',
        }],
      },
    ]);

    eventRemovers.push(bleApi.addEventListener('deviceFound', (device) => {
      void connectPeer(device);
    }));
    eventRemovers.push(bleApi.addEventListener('deviceConnected', ({ deviceId }) => {
      const peer = peers.get(deviceId);
      peers.set(deviceId, { id: deviceId, name: peer?.name || 'Nearby traveller', connected: true, rssi: peer?.rssi });
      publish({ status: 'searching' });
    }));
    eventRemovers.push(bleApi.addEventListener('deviceDisconnected', ({ deviceId }) => {
      const peer = peers.get(deviceId);
      if (peer) peers.set(deviceId, { ...peer, connected: false });
      for (const token of sentMessages) if (token.startsWith(`${deviceId}:`)) sentMessages.delete(token);
      publish({ status: 'searching' });
    }));
    eventRemovers.push(bleApi.addEventListener('peripheralWriteRequest', ({ centralId, value }) => {
      void receiveChunk(centralId, value);
    }));
    eventRemovers.push(bleApi.addEventListener('scanFailed', ({ message }) => {
      publish({ status: 'error', error: message });
    }));
    eventRemovers.push(bleApi.addEventListener('advertisingStartFailed', ({ message, error }) => {
      publish({ status: 'error', error: message || error || 'Bluetooth advertising could not start.' });
    }));
    eventRemovers.push(bleApi.addEventListener('backgroundSessionStartFailed', ({ error }) => {
      publish({ status: 'error', error: `Background Bluetooth relay could not start: ${error}` });
    }));

    relayUnsubscribe = relayEngine.onEvent((event) => {
      if (event.type === 'message_received') {
        void broadcastMessage(event.message as RelayMessage, event.message.relayMetadata.isLocallyCreated ? undefined : event.message.relayMetadata.sourceDeviceId);
      }
    });

    bleApi.startBackgroundSession({
      serviceUUIDs: [SERVICE_UUID],
      localName: 'PahaadSaathi',
      scanMode: 'lowPower',
      androidNotificationChannelName: 'Nearby safety relay',
      androidNotificationTitle: 'PahaadSaathi relay is on',
      androidNotificationText: 'Sharing safety reports with nearby phones',
    });
    await AsyncStorage.setItem(BLUETOOTH_RELAY_PREF_KEY, 'true');
    publish({ enabled: true, available: true, status: 'searching', error: undefined });
  } catch (error) {
    bleApi?.stopBackgroundSession();
    cleanupListeners();
    const message = error instanceof Error ? error.message : 'Bluetooth could not start.';
    const unavailable = message.includes('does not support') || message.includes('missing from this app build');
    publish({ enabled: false, available: !unavailable, status: 'error', error: message });
    throw error;
  }
}

export function stopBluetoothRelay() {
  void AsyncStorage.setItem(BLUETOOTH_RELAY_PREF_KEY, 'false');
  bleApi?.stopBackgroundSession();
  peers.forEach((peer) => { if (peer.connected) bleApi?.disconnect(peer.id); });
  cleanupListeners();
  peers.clear();
  connecting.clear();
  sentMessages.clear();
  fragments.clear();
  publish({ enabled: false, status: 'off', error: undefined });
}

export async function resumeBluetoothRelay() {
  if ((await AsyncStorage.getItem(BLUETOOTH_RELAY_PREF_KEY)) !== 'true') return;
  try {
    await startBluetoothRelay();
    await relayEngine.setRelayActive(true);
  } catch {
    // The state is surfaced in the front-page Bluetooth card for the user.
  }
}

function cleanupListeners() {
  eventRemovers.splice(0).forEach((remove) => remove());
  relayUnsubscribe?.();
  relayUnsubscribe = undefined;
}

async function connectPeer(device: BLEDevice) {
    if (device.serviceUUIDs?.length && !device.serviceUUIDs.some((uuid) => uuid.toLowerCase() === SERVICE_UUID)) return;
  if (peers.get(device.id)?.connected || connecting.has(device.id)) return;
  connecting.add(device.id);
  peers.set(device.id, {
    id: device.id,
    name: device.name || device.localName || 'Nearby traveller',
    connected: false,
    rssi: device.rssi,
  });
  publish({ status: 'searching' });
  try {
    await bleApi!.connect(device.id, { timeoutMs: 12000 });
    await bleApi!.discoverServices(device.id);
    const peer = peers.get(device.id);
    if (peer) peers.set(device.id, { ...peer, connected: true });
    publish({ status: 'searching' });
    await sendQueuedMessages(device.id);
  } catch {
    const peer = peers.get(device.id);
    if (peer) peers.set(device.id, { ...peer, connected: false });
  } finally {
    connecting.delete(device.id);
    publish({ status: 'searching' });
  }
}

async function broadcastMessage(message: RelayMessage, sourceDeviceId?: string) {
  await Promise.all([...peers.values()].filter((peer) => peer.connected && peer.id !== sourceDeviceId).map((peer) => sendMessage(peer.id, message)));
}

async function sendQueuedMessages(deviceId: string) {
  const queue = relayEngine.getQueue();
  for (const item of queue) {
    if (item.relayMetadata?.sourceDeviceId === deviceId) continue;
    await sendMessage(deviceId, item as RelayMessage);
  }
}

async function sendMessage(deviceId: string, message: RelayMessage) {
  const token = `${deviceId}:${message.id}`;
  if (sentMessages.has(token)) return;
  sentMessages.add(token);
  const payload = utf8Bytes(JSON.stringify({ ...message, hopCount: message.hopCount + 1, hopPath: [...message.hopPath, relayEngine.deviceId] }));
  const chunks: Uint8Array[] = [];
  for (let index = 0; index < payload.length; index += CHUNK_DATA_BYTES) chunks.push(payload.slice(index, index + CHUNK_DATA_BYTES));
  if (chunks.length > 255) {
    sentMessages.delete(token);
    return;
  }
  const transferId = (nextTransferId++ % 65535) + 1;
  try {
    for (let index = 0; index < chunks.length; index += 1) {
      const packet = new Uint8Array(6 + chunks[index].length);
      packet.set([0x50, 0x53, (transferId >> 8) & 0xff, transferId & 0xff, index, chunks.length]);
      packet.set(chunks[index], 6);
      await bleApi!.writeCharacteristic(deviceId, SERVICE_UUID, CHARACTERISTIC_UUID, bytesToHex(packet));
    }
  } catch {
    sentMessages.delete(token);
  }
}

async function receiveChunk(peerId: string, encodedPacket: string) {
  try {
    const packet = hexToBytes(encodedPacket);
    if (packet.length < 7 || packet[0] !== 0x50 || packet[1] !== 0x53) return;
    const transferId = (packet[2] << 8) | packet[3];
    const index = packet[4];
    const count = packet[5];
    if (!Number.isInteger(index) || !Number.isInteger(count) || count < 1 || count > 2000 || index < 0 || index >= count) return;
    const transferKey = `${peerId}:${transferId}`;
    const transfer = fragments.get(transferKey) || { count, parts: Array<Uint8Array | undefined>(count).fill(undefined) };
    if (transfer.count !== count) return;
    transfer.parts[index] = packet.slice(6);
    fragments.set(transferKey, transfer);
    if (transfer.parts.some((part) => !part)) return;
    fragments.delete(transferKey);
    const payload = new Uint8Array(transfer.parts.reduce((size, part) => size + (part?.length || 0), 0));
    let offset = 0;
    for (const part of transfer.parts) {
      payload.set(part!, offset);
      offset += part!.length;
    }
    const message = JSON.parse(bytesToUtf8(payload)) as RelayMessage;
    if (message.messageType !== 'SAFETY_ALERT' || !message.id || !message.expiresAt || !message.originDeviceId) return;
    await relayEngine.receiveMessage(message, peerId);
    if (!relayEngine.processedMessageIds.has(message.id)) return;
    const alert = message.alert;
    if (!alert?.hazardId || !alert.hazardType || !hazardTypes.includes(alert.hazardType as HazardType)) return;
    const createdAt = new Date(message.createdAt).getTime();
    await addRelayedHazard({
      id: `relay-${message.originDeviceId}-${alert.hazardId}`,
      type: alert.hazardType as HazardType,
      location: alert.locationLabel || 'Nearby traveller',
      description: alert.body,
      severity: alert.severity || 'Medium',
      status: alert.verificationStatus,
      time: Number.isNaN(createdAt) ? 'Recently' : new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sample: false,
      reportedBy: 'Nearby Bluetooth',
      latitude: alert.latitude ?? null,
      longitude: alert.longitude ?? null,
      photo_url: null,
    });
  } catch {
    // Ignore malformed or incomplete peer packets.
  }
}

let nextTransferId = 1;

function utf8Bytes(value: string) {
  const binary = unescape(encodeURIComponent(value));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value: string) {
  const bytePairs = value.match(/.{1,2}/g) || [];
  return Uint8Array.from(bytePairs, (byte) => parseInt(byte, 16));
}

function bytesToUtf8(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return decodeURIComponent(binary.split('').map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
}
