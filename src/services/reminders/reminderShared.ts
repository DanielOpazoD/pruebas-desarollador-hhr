import { collection, doc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { COLLECTIONS, getActiveHospitalId, HOSPITAL_COLLECTIONS } from '@/constants/firestorePaths';
import { ReminderReadReceiptSchema, ReminderSchema } from '@/schemas/reminderSchemas';
import type { Reminder, ReminderReadReceipt } from '@/types';

export const REMINDER_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export const getRemindersCollectionPath = (hospitalId: string = getActiveHospitalId()) =>
  `${COLLECTIONS.HOSPITALS}/${hospitalId}/${HOSPITAL_COLLECTIONS.REMINDERS}`;

export const getRemindersCollectionRef = () =>
  collection(db, COLLECTIONS.HOSPITALS, getActiveHospitalId(), HOSPITAL_COLLECTIONS.REMINDERS);

export const getReminderDocRef = (reminderId: string) =>
  doc(getRemindersCollectionRef(), reminderId);

export const getReminderReadReceiptsCollectionRef = (reminderId: string) =>
  collection(getReminderDocRef(reminderId), 'readReceipts');

export const buildReminderReadReceiptId = (
  userId: string,
  shift: ReminderReadReceipt['shift'],
  dateKey: string
) => `${userId}__${dateKey}__${shift}`;

export const getReminderReadReceiptDocRef = (reminderId: string, receiptId: string) =>
  doc(getReminderReadReceiptsCollectionRef(reminderId), receiptId);

export const normalizeReminderRecord = (record: unknown, fallbackId?: string): Reminder | null => {
  const parsed = ReminderSchema.safeParse(record);
  if (parsed.success) return parsed.data;
  if (!record || typeof record !== 'object') return null;
  const raw = record as Record<string, unknown>;
  const withFallbackId = fallbackId ? { ...raw, id: raw.id || fallbackId } : raw;
  const retried = ReminderSchema.safeParse(withFallbackId);
  return retried.success ? retried.data : null;
};

export const normalizeReminderReadReceipt = (record: unknown): ReminderReadReceipt | null => {
  const parsed = ReminderReadReceiptSchema.safeParse(record);
  return parsed.success ? parsed.data : null;
};
