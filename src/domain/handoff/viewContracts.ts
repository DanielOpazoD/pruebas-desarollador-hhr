import type { MedicalHandoffScope } from '@/types/medicalHandoff';

export interface HandoffMedicalPatientContract {
  patientName?: string;
  specialty?: string;
  isUPC?: boolean;
}

export interface HandoffMedicalRecordContract {
  beds: Record<string, HandoffMedicalPatientContract | undefined>;
  medicalHandoffSentAt?: string;
  medicalHandoffSentAtByScope?: Partial<Record<MedicalHandoffScope, string>>;
  medicalSignatureLinkTokenByScope?: Partial<Record<MedicalHandoffScope, string>>;
  medicalSignature?: {
    doctorName: string;
    signedAt: string;
    userAgent?: string;
  };
  medicalSignatureByScope?: Partial<
    Record<
      MedicalHandoffScope,
      {
        doctorName: string;
        signedAt: string;
        userAgent?: string;
      }
    >
  >;
}
