import type { SyncTask } from '@/services/storage/syncQueueTypes';

export interface SyncQueueStorePort {
  listAll(): Promise<SyncTask[]>;
  listRecent(limit: number): Promise<SyncTask[]>;
  listReadyPending(now: number, limit: number): Promise<SyncTask[]>;
  findReusableTask(type: SyncTask['type'], key: string): Promise<SyncTask | null>;
  add(task: SyncTask): Promise<void>;
  update(taskId: number, patch: Partial<SyncTask>): Promise<void>;
  delete(taskId: number): Promise<void>;
}

export interface SyncRuntimePort {
  isOnline(): boolean;
  onOnline(callback: () => void): void;
}

export interface SyncTransportPort {
  run(task: SyncTask): Promise<void>;
}
