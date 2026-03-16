import { getDoc, getDocs, setDoc } from 'firebase/firestore';
import type { ReminderReadReceipt, ReminderShift } from '@/types/reminders';
import { logger } from '@/services/utils/loggerService';
import {
  buildReminderReadReceiptId,
  getReminderReadReceiptDocRef,
  getReminderReadReceiptsCollectionRef,
  normalizeReminderReadReceipt,
} from './reminderShared';
import {
  resolveReminderOperationErrorKind,
  type ReminderOperationErrorKind,
} from './reminderErrorPolicy';

const reminderReadLogger = logger.child('ReminderReadService');

export type ReminderReadLookupStatus = 'read' | 'unread' | 'unavailable';

export interface ReminderReadLookupResult {
  status: ReminderReadLookupStatus;
}

export type ReminderReadMutationResult =
  | { status: 'success' }
  | { status: ReminderOperationErrorKind; error: unknown };

export type ReminderReadReceiptsResult =
  | { status: 'success'; receipts: ReminderReadReceipt[] }
  | { status: ReminderOperationErrorKind; error: unknown; receipts: ReminderReadReceipt[] };

export const ReminderReadService = {
  async markAsRead(reminderId: string, receipt: ReminderReadReceipt): Promise<void> {
    const result = await this.markAsReadWithResult(reminderId, receipt);
    if (result.status !== 'success') {
      throw result.error;
    }
  },

  async markAsReadWithResult(
    reminderId: string,
    receipt: ReminderReadReceipt
  ): Promise<ReminderReadMutationResult> {
    const receiptId = buildReminderReadReceiptId(
      receipt.userId,
      receipt.shift,
      receipt.dateKey ?? receipt.readAt.slice(0, 10)
    );
    try {
      await setDoc(getReminderReadReceiptDocRef(reminderId, receiptId), receipt);
      reminderReadLogger.info('Stored reminder read receipt', {
        reminderId,
        receiptId,
        shift: receipt.shift,
        dateKey: receipt.dateKey,
      });
      return { status: 'success' };
    } catch (error) {
      reminderReadLogger.error('Error storing reminder read receipt', error);
      return { status: resolveReminderOperationErrorKind(error), error };
    }
  },

  async getUserShiftReadState(
    reminderId: string,
    userId: string,
    shift: ReminderShift,
    dateKey: string
  ): Promise<ReminderReadLookupResult> {
    try {
      const snapshot = await getDoc(
        getReminderReadReceiptDocRef(reminderId, buildReminderReadReceiptId(userId, shift, dateKey))
      );
      return { status: snapshot.exists() ? 'read' : 'unread' };
    } catch (error) {
      reminderReadLogger.warn('Error checking reminder read receipt', error);
      return { status: 'unavailable' };
    }
  },

  async hasUserReadForShiftWindow(
    reminderId: string,
    userId: string,
    shift: ReminderShift,
    dateKey: string
  ): Promise<boolean> {
    const result = await this.getUserShiftReadState(reminderId, userId, shift, dateKey);
    return result.status === 'read';
  },

  async getReadReceipts(reminderId: string): Promise<ReminderReadReceipt[]> {
    const result = await this.getReadReceiptsWithResult(reminderId);
    return result.receipts;
  },

  async getReadReceiptsWithResult(reminderId: string): Promise<ReminderReadReceiptsResult> {
    try {
      const snapshot = await getDocs(getReminderReadReceiptsCollectionRef(reminderId));
      return {
        status: 'success',
        receipts: snapshot.docs
          .map(docSnap => normalizeReminderReadReceipt(docSnap.data()))
          .filter((item): item is ReminderReadReceipt => Boolean(item))
          .sort((left, right) => right.readAt.localeCompare(left.readAt)),
      };
    } catch (error) {
      reminderReadLogger.error('Error loading reminder receipts', error);
      return {
        status: resolveReminderOperationErrorKind(error),
        error,
        receipts: [],
      };
    }
  },

  buildReceipt(input: {
    userId: string;
    userName: string;
    shift: ReminderShift;
    dateKey: string;
  }): ReminderReadReceipt {
    return {
      userId: input.userId,
      userName: input.userName,
      shift: input.shift,
      dateKey: input.dateKey,
      readAt: new Date().toISOString(),
    };
  },
};
