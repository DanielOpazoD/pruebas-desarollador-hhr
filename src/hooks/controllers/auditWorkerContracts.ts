import type { AuditLogEntry, GroupedAuditLogEntry, AuditStats } from '@/types/audit';

export interface AuditWorkerResults {
  filteredLogs: AuditLogEntry[];
  displayLogs: (AuditLogEntry | GroupedAuditLogEntry)[];
  stats: AuditStats | null;
}
