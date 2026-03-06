import { classifyPatientMovementForRecord } from '@/application/patient-flow/clinicalEpisode';

interface ResolveIsNewAdmissionForRecordParams {
  recordDate: string;
  admissionDate?: string;
  admissionTime?: string;
}

export const resolveIsNewAdmissionForRecord = ({
  recordDate,
  admissionDate,
  admissionTime,
}: ResolveIsNewAdmissionForRecordParams): boolean =>
  classifyPatientMovementForRecord(recordDate, { admissionDate, admissionTime }).isNewAdmission;
