import type { BluetoothRelayState } from './bluetoothTransport.native';

const state: BluetoothRelayState = {
  enabled: false,
  available: false,
  status: 'off',
  peers: [],
};

export function getBluetoothRelayState() {
  return state;
}

export function subscribeBluetoothRelay(listener: (state: BluetoothRelayState) => void) {
  listener(state);
  return () => {};
}

export async function startBluetoothRelay() {
  throw new Error('Bluetooth peering is available in the iOS and Android app, not the web version.');
}

export function stopBluetoothRelay() {}

export async function resumeBluetoothRelay() {}
