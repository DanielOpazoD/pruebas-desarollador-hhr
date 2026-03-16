import type { SyncQueueStorePort } from '@/services/storage/sync/syncQueuePorts';
import { hospitalDB } from '@/services/storage/indexeddb/indexedDbCore';

export const createDexieSyncQueueStore = (): SyncQueueStorePort => ({
  async listAll() {
    return hospitalDB.syncQueue.toArray();
  },
  async listRecent(limit) {
    return hospitalDB.syncQueue.orderBy('timestamp').reverse().limit(limit).toArray();
  },
  async listReadyPending(now, limit) {
    const tasks = await hospitalDB.syncQueue.where('status').equals('PENDING').sortBy('timestamp');
    return tasks.filter(task => (task.nextAttemptAt || 0) <= now).slice(0, limit);
  },
  async findReusableTask(type, key) {
    const existing = await hospitalDB.syncQueue.where('type').equals(type).toArray();
    return existing.find(task => task.key === key && task.status !== 'FAILED') || null;
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
});
