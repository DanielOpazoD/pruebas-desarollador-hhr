import type { SyncQueueStorePort } from '@/services/storage/sync/syncQueuePorts';
import { hospitalDB } from '@/services/storage/indexeddb/indexedDbCore';

const matchesOwner = (ownerKey: string | null | undefined, taskOwnerKey?: string): boolean =>
  ownerKey ? taskOwnerKey === ownerKey || !taskOwnerKey : !taskOwnerKey;

export const createDexieSyncQueueStore = (): SyncQueueStorePort => ({
  async listAll(ownerKey) {
    const tasks = await hospitalDB.syncQueue.toArray();
    return tasks.filter(task => matchesOwner(ownerKey, task.ownerKey));
  },
  async listRecent(limit, ownerKey) {
    const tasks = await hospitalDB.syncQueue.orderBy('timestamp').reverse().toArray();
    return tasks.filter(task => matchesOwner(ownerKey, task.ownerKey)).slice(0, limit);
  },
  async listReadyPending(now, limit, ownerKey) {
    const tasks = await hospitalDB.syncQueue.where('status').equals('PENDING').sortBy('timestamp');
    return tasks
      .filter(task => matchesOwner(ownerKey, task.ownerKey) && (task.nextAttemptAt || 0) <= now)
      .slice(0, limit);
  },
  async findReusableTask(type, key, ownerKey) {
    const existing = await hospitalDB.syncQueue.where('type').equals(type).toArray();
    return (
      existing.find(
        task =>
          matchesOwner(ownerKey, task.ownerKey) && task.key === key && task.status !== 'FAILED'
      ) || null
    );
  },
  async add(task) {
    await hospitalDB.syncQueue.add(task);
  },
  async update(taskId, patch) {
    await hospitalDB.syncQueue.update(taskId, patch);
  },
  async delete(taskId) {
    await hospitalDB.syncQueue.delete(taskId);
  },
  async deleteAll() {
    await hospitalDB.syncQueue.clear();
  },
  async deleteByOwner(ownerKey) {
    if (!ownerKey) {
      await hospitalDB.syncQueue.filter(task => !task.ownerKey).delete();
      return;
    }

    await hospitalDB.syncQueue
      .filter(task => task.ownerKey === ownerKey || !task.ownerKey)
      .delete();
  },
  async countForeign(ownerKey) {
    if (!ownerKey) {
      return hospitalDB.syncQueue.filter(task => !!task.ownerKey).count();
    }

    return hospitalDB.syncQueue
      .filter(task => !!task.ownerKey && task.ownerKey !== ownerKey)
      .count();
  },
});
