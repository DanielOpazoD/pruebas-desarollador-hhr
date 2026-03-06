import { logAuditEvent } from '@/services/admin/auditService';
import {
  createApplicationFailed,
  createApplicationSuccess,
  type ApplicationOutcome,
} from '@/application/shared/applicationOutcome';
import type { AuditAction, AuditLogEntry } from '@/types/audit';

export interface WriteAuditEventInput {
  userId: string;
  action: AuditAction;
  entityType: AuditLogEntry['entityType'];
  entityId: string;
  details: Record<string, unknown>;
  patientRut?: string;
  recordDate?: string;
  authors?: string;
}

export const executeWriteAuditEvent = async (
  input: WriteAuditEventInput
): Promise<ApplicationOutcome<null>> => {
  try {
    await logAuditEvent(
      input.userId,
      input.action,
      input.entityType,
      input.entityId,
      input.details,
      input.patientRut,
      input.recordDate,
      input.authors
    );
    return createApplicationSuccess(null);
  } catch (error) {
    return createApplicationFailed(null, [
      {
        kind: 'unknown',
        message:
          error instanceof Error ? error.message : 'No se pudo registrar el evento de auditoría.',
      },
    ]);
  }
};
