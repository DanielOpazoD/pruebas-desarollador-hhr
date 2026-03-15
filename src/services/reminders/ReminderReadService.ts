import { getDoc, getDocs, setDoc } from 'firebase/firestore';
import type { ReminderReadReceipt, ReminderShift } from '@/types';
import { logger } from '@/services/utils/loggerService';
import {
  buildReminderReadReceiptId,
  getReminderReadReceiptDocRef,
  getReminderReadReceiptsCollectionRef,
  normalizeReminderReadReceipt,
} from './reminderShared';

const reminderReadLogger = logger.child('ReminderReadService');

export const ReminderReadService = {
  async markAsRead(reminderId: string, receipt: ReminderReadReceipt): Promise<void> {
    const receiptId = buildReminderReadReceiptId(
      receipt.userId,
      receipt.shift,
      receipt.dateKey ?? receipt.readAt.slice(0, 10)
    );
    await setDoc(getReminderReadReceiptDocRef(reminderId, receiptId), receipt);
  },

  async hasUserRead(
    reminderId: string,
    userId: string,
    shift: ReminderShift,
    dateKey: string
  ): Promise<boolean> {
    const snapshot = await getDoc(
      getReminderReadReceiptDocRef(reminderId, buildReminderReadReceiptId(userId, shift, dateKey))
    );
    return snapshot.exists();
  },

  async getReadReceipts(reminderId: string): Promise<ReminderReadReceipt[]> {
    try {
      const snapshot = await getDocs(getReminderReadReceiptsCollectionRef(reminderId));
      return snapshot.docs
        .map(docSnap => normalizeReminderReadReceipt(docSnap.data()))
        .filter((item): item is ReminderReadReceipt => Boolean(item))
        .sort((left, right) => right.readAt.localeCompare(left.readAt));
    } catch (error) {
      reminderReadLogger.error('Error loading reminder receipts', error);
      return [];
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
