import {
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type { Reminder } from '@/types';
import { logger } from '@/services/utils/loggerService';
import {
  getReminderDocRef,
  getRemindersCollectionRef,
  normalizeReminderRecord,
} from './reminderShared';

const reminderRepositoryLogger = logger.child('ReminderRepository');

export const ReminderRepository = {
  subscribe(callback: (reminders: Reminder[]) => void): () => void {
    const remindersQuery = query(
      getRemindersCollectionRef(),
      orderBy('priority', 'desc'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      remindersQuery,
      snapshot => {
        const reminders = snapshot.docs
          .map(docSnap =>
            normalizeReminderRecord({ id: docSnap.id, ...docSnap.data() }, docSnap.id)
          )
          .filter((item): item is Reminder => Boolean(item));
        callback(reminders);
      },
      error => {
        reminderRepositoryLogger.error('Error subscribing reminders', error);
        callback([]);
      }
    );
  },

  async list(): Promise<Reminder[]> {
    const snapshot = await getDocs(
      query(getRemindersCollectionRef(), orderBy('priority', 'desc'), orderBy('createdAt', 'desc'))
    );
    return snapshot.docs
      .map(docSnap => normalizeReminderRecord({ id: docSnap.id, ...docSnap.data() }, docSnap.id))
      .filter((item): item is Reminder => Boolean(item));
  },

  async getById(reminderId: string): Promise<Reminder | null> {
    const snapshot = await getDoc(getReminderDocRef(reminderId));
    if (!snapshot.exists()) return null;
    return normalizeReminderRecord({ id: snapshot.id, ...snapshot.data() }, snapshot.id);
  },

  async create(reminder: Reminder): Promise<void> {
    await setDoc(getReminderDocRef(reminder.id), reminder);
  },

  async update(reminderId: string, patch: Partial<Reminder>): Promise<void> {
    await updateDoc(getReminderDocRef(reminderId), patch);
  },

  async remove(reminderId: string): Promise<void> {
    await deleteDoc(getReminderDocRef(reminderId));
  },
};
