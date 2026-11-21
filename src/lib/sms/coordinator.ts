import * as SMS from 'expo-sms';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeIndianPhoneNumber } from './directory';

export type RecipientSmsStatus =
  | 'queued'
  | 'composer_open'
  | 'awaiting_user_confirmation'
  | 'os_reported_sent'
  | 'user_reports_pressed_send'
  | 'composer_cancelled'
  | 'user_said_not_sent'
  | 'user_unsure'
  | 'sms_unavailable'
  | 'failed_to_open';

export interface RecipientDispatchState {
  recipientId: string;
  recipientName: string;
  phoneNumber: string;
  status: RecipientSmsStatus;
  openedAt?: string;
  confirmedAt?: string;
  userNote?: string;
}

export interface SmsSessionState {
  incidentId: string;
  messageBody: string;
  recipients: RecipientDispatchState[];
  currentRecipientIndex: number;
  sessionStartedAt: string;
  isComplete: boolean;
}

const SMS_SESSION_KEY = 'pahaadsaathi:sms:active_session';

export class SmsCoordinator {
  private activeSession: SmsSessionState | null = null;
  private isLoaded = false;

  private async ensureLoaded(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const raw = await AsyncStorage.getItem(SMS_SESSION_KEY);
      if (raw) {
        this.activeSession = JSON.parse(raw);
        // Recovery: if app was terminated with composer_open, recover to awaiting confirmation
        if (this.activeSession) {
          for (const r of this.activeSession.recipients) {
            if (r.status === 'composer_open') {
              r.status = 'awaiting_user_confirmation';
            }
          }
        }
      }
    } catch {
      // Ignored
    }
    this.isLoaded = true;
  }

  private async persist(): Promise<void> {
    try {
      if (this.activeSession) {
        await AsyncStorage.setItem(SMS_SESSION_KEY, JSON.stringify(this.activeSession));
      } else {
        await AsyncStorage.removeItem(SMS_SESSION_KEY);
      }
    } catch {
      // Ignored
    }
  }

  async startSession(
    incidentId: string,
    messageBody: string,
    recipients: { id: string; name: string; phone: string }[]
  ): Promise<SmsSessionState> {
    await this.ensureLoaded();

    const dispatchRecipients: RecipientDispatchState[] = recipients.map((r) => ({
      recipientId: r.id,
      recipientName: r.name,
      phoneNumber: normalizeIndianPhoneNumber(r.phone),
      status: 'queued',
    }));

    this.activeSession = {
      incidentId,
      messageBody,
      recipients: dispatchRecipients,
      currentRecipientIndex: 0,
      sessionStartedAt: new Date().toISOString(),
      isComplete: false,
    };

    await this.persist();
    return this.activeSession;
  }

  async getActiveSession(): Promise<SmsSessionState | null> {
    await this.ensureLoaded();
    return this.activeSession;
  }

  /**
   * Open the native SMS composer for the SINGLE current recipient.
   * Strictly opens one recipient at a time to prevent multi-recipient MMS traps.
   */
  async openCurrentRecipientComposer(): Promise<{
    success: boolean;
    recipient?: RecipientDispatchState;
    error?: string;
  }> {
    await this.ensureLoaded();
    if (!this.activeSession) {
      return { success: false, error: 'No active emergency SMS session' };
    }

    const { recipients, currentRecipientIndex, messageBody } = this.activeSession;
    const recipient = recipients[currentRecipientIndex];

    if (!recipient) {
      this.activeSession.isComplete = true;
      await this.persist();
      return { success: false, error: 'All recipients processed' };
    }

    // Step 1: Check SMS availability
    const isAvailable = await SMS.isAvailableAsync().catch(() => false);
    if (!isAvailable) {
      recipient.status = 'sms_unavailable';
      await this.persist();
      return {
        success: false,
        recipient,
        error: 'Cellular SMS composer is not available on this device',
      };
    }

    // Step 2: Mark state BEFORE opening native composer
    recipient.status = 'composer_open';
    recipient.openedAt = new Date().toISOString();
    await this.persist();

    // Step 3: Open native composer with single recipient
    try {
      const response = await SMS.sendSMSAsync([recipient.phoneNumber], messageBody);

      // On Android/iOS: response.result indicates whether OS dispatched composer
      if (response.result === 'sent') {
        recipient.status = 'awaiting_user_confirmation';
      } else {
        recipient.status = 'composer_cancelled';
      }
      await this.persist();
      return { success: true, recipient };
    } catch (err: any) {
      recipient.status = 'failed_to_open';
      await this.persist();
      return {
        success: false,
        recipient,
        error: err?.message || 'Failed to launch native SMS application',
      };
    }
  }

  /**
   * Records user's honest post-composer confirmation:
   * - 'yes': user confirmed pressing Send in SMS app
   * - 'no': user did not press Send
   * - 'unsure': user is unsure
   */
  async recordUserConfirmation(
    recipientId: string,
    outcome: 'yes' | 'no' | 'unsure'
  ): Promise<RecipientDispatchState | null> {
    await this.ensureLoaded();
    if (!this.activeSession) return null;

    const recipient = this.activeSession.recipients.find((r) => r.recipientId === recipientId);
    if (!recipient) return null;

    recipient.confirmedAt = new Date().toISOString();

    if (outcome === 'yes') {
      recipient.status = 'user_reports_pressed_send';
      recipient.userNote =
        'User confirmed pressing Send. Delivery to recipient has not been verified.';
    } else if (outcome === 'no') {
      recipient.status = 'user_said_not_sent';
      recipient.userNote = 'User indicated message was not sent.';
    } else {
      recipient.status = 'user_unsure';
      recipient.userNote = 'User indicated outcome is unsure.';
    }

    // Advance to next recipient
    this.activeSession.currentRecipientIndex += 1;
    if (this.activeSession.currentRecipientIndex >= this.activeSession.recipients.length) {
      this.activeSession.isComplete = true;
    }

    await this.persist();
    return recipient;
  }

  async clearSession(): Promise<void> {
    this.activeSession = null;
    await AsyncStorage.removeItem(SMS_SESSION_KEY);
  }
}

export const smsCoordinator = new SmsCoordinator();
