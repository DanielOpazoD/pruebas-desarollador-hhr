import { BEDS } from '@/constants';
import type { DailyRecord, DailyRecordPatch } from '@/types';
import type { MedicalHandoffScope } from '@/features/handoff/controllers';
import {
  buildMedicalHandoffSignatureLink,
  resolveScopedMedicalSignatureToken,
} from '@/features/handoff/controllers';
import { buildMedicalSentPatch } from '@/features/handoff/controllers/handoffManagementController';
import {
  formatHandoffMessage,
  sendWhatsAppMessage,
} from '@/services/integrations/whatsapp/whatsappService';
import { defaultBrowserWindowRuntime } from '@/shared/runtime/browserWindowRuntime';
import {
  createApplicationFailed,
  createApplicationSuccess,
  type ApplicationOutcome,
} from '@/application/shared/applicationOutcome';

const generateMedicalSignatureLinkToken = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `sig_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
};

export interface SendMedicalHandoffInput {
  record: DailyRecord;
  templateContent: string;
  targetGroupId: string;
  patchRecord: (partial: DailyRecordPatch) => Promise<void>;
  getPreviousDay: (date: string) => Promise<DailyRecord | null>;
  scope?: MedicalHandoffScope;
}

export interface SendMedicalHandoffOutput {
  sentAt: string;
  doctorName: string;
  handoffUrl: string;
}

const ensureScopedMedicalHandoffSignatureLink = async (
  record: DailyRecord,
  scope: MedicalHandoffScope,
  patchRecord: (partial: DailyRecordPatch) => Promise<void>
): Promise<string> => {
  const existingToken = resolveScopedMedicalSignatureToken(record, scope);
  if (existingToken) {
    return buildMedicalHandoffSignatureLink(
      defaultBrowserWindowRuntime.getLocationOrigin(),
      record.date,
      scope,
      existingToken
    );
  }

  const nextToken = generateMedicalSignatureLinkToken();
  await patchRecord({
    medicalSignatureLinkTokenByScope: {
      ...(record.medicalSignatureLinkTokenByScope || {}),
      [scope]: nextToken,
    },
  });

  return buildMedicalHandoffSignatureLink(
    defaultBrowserWindowRuntime.getLocationOrigin(),
    record.date,
    scope,
    nextToken
  );
};

const resolveDoctorName = async (
  record: DailyRecord,
  getPreviousDay: (date: string) => Promise<DailyRecord | null>
): Promise<string> => {
  if (record.medicalHandoffDoctor) {
    return record.medicalHandoffDoctor;
  }

  const previousRecord = await getPreviousDay(record.date);
  return previousRecord?.medicalHandoffDoctor || 'Sin especificar';
};

const resolveHandoffStats = (record: DailyRecord) => {
  const activeExtras = record.activeExtraBeds || [];
  const visibleBeds = BEDS.filter(bed => !bed.isExtra || activeExtras.includes(bed.id));

  const hospitalized = visibleBeds.filter(
    b => record.beds[b.id]?.patientName && !record.beds[b.id]?.isBlocked
  ).length;
  const blockedBeds = visibleBeds.filter(b => record.beds[b.id]?.isBlocked).length;
  const freeBeds = visibleBeds.length - hospitalized - blockedBeds;

  return { hospitalized, freeBeds };
};

export const executeSendMedicalHandoff = async (
  input: SendMedicalHandoffInput
): Promise<ApplicationOutcome<SendMedicalHandoffOutput | null>> => {
  try {
    const scope = input.scope || 'all';
    const doctorName = await resolveDoctorName(input.record, input.getPreviousDay);
    const { hospitalized, freeBeds } = resolveHandoffStats(input.record);
    const handoffUrl = await ensureScopedMedicalHandoffSignatureLink(
      input.record,
      scope,
      input.patchRecord
    );

    const [year, month, day] = input.record.date.split('-');
    const dateStr = `${day}-${month}-${year}`;
    const sentAt = new Date().toISOString();

    const message = formatHandoffMessage(input.templateContent, {
      date: dateStr,
      signedBy: doctorName,
      signedAt: new Date(sentAt).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      hospitalized,
      freeBeds,
      newAdmissions: 0,
      discharges: 0,
      handoffUrl,
    });

    const result = await sendWhatsAppMessage(input.targetGroupId, message);
    if (!result.success) {
      throw new Error(result.error);
    }

    await input.patchRecord(buildMedicalSentPatch(input.record, doctorName, scope));

    return createApplicationSuccess({
      sentAt,
      doctorName,
      handoffUrl,
    });
  } catch (error) {
    return createApplicationFailed(null, [
      {
        kind: 'unknown',
        message: error instanceof Error ? error.message : 'No se pudo enviar la entrega médica.',
      },
    ]);
  }
};
