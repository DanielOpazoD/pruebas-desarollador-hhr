import { getAuditLogs } from '@/services/admin/auditService';
import {
  createApplicationFailed,
  createApplicationSuccess,
  type ApplicationOutcome,
} from '@/application/shared/applicationOutcome';
import type { AuditLogEntry } from '@/types/audit';

export interface FetchAuditLogsInput {
  limit?: number;
}

export const executeFetchAuditLogs = async ({ limit = 100 }: FetchAuditLogsInput = {}): Promise<
  ApplicationOutcome<AuditLogEntry[]>
> => {
  try {
    const logs = await getAuditLogs(limit);
    return createApplicationSuccess(logs);
  } catch (error) {
    return createApplicationFailed(
      [],
      [
        {
          kind: 'unknown',
          message:
            error instanceof Error ? error.message : 'No se pudieron cargar los logs de auditoría.',
        },
      ]
    );
  }
};
