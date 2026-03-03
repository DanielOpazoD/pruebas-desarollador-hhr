export type MedicalHandoffScope = 'all' | 'upc' | 'no-upc';

interface ScopedMedicalSignature {
  doctorName: string;
  signedAt: string;
  userAgent?: string;
}

interface MedicalHandoffScopeRecordLike {
  medicalHandoffSentAt?: string;
  medicalHandoffSentAtByScope?: Partial<Record<MedicalHandoffScope, string>>;
  medicalSignatureLinkTokenByScope?: Partial<Record<MedicalHandoffScope, string>>;
  medicalSignature?: ScopedMedicalSignature;
  medicalSignatureByScope?: Partial<Record<MedicalHandoffScope, ScopedMedicalSignature>>;
}

const VALID_SCOPES: MedicalHandoffScope[] = ['all', 'upc', 'no-upc'];

export const resolveMedicalHandoffScope = (
  rawScope: string | null | undefined
): MedicalHandoffScope => {
  if (rawScope && VALID_SCOPES.includes(rawScope as MedicalHandoffScope)) {
    return rawScope as MedicalHandoffScope;
  }

  return 'all';
};

export const buildMedicalHandoffSignatureLink = (
  origin: string,
  date: string,
  scope: MedicalHandoffScope,
  token?: string | null
): string => {
  const params = new URLSearchParams({
    mode: 'signature',
    date,
    scope,
  });
  if (token) {
    params.set('token', token);
  }
  return `${origin}?${params.toString()}`;
};

export const resolveScopedMedicalSignatureToken = (
  record: MedicalHandoffScopeRecordLike | null | undefined,
  scope: MedicalHandoffScope
): string | null => {
  if (!record) return null;
  return record.medicalSignatureLinkTokenByScope?.[scope] || null;
};

export const resolveScopedMedicalHandoffSentAt = (
  record: MedicalHandoffScopeRecordLike | null | undefined,
  scope: MedicalHandoffScope
): string | null => {
  if (!record) return null;

  if (record.medicalHandoffSentAtByScope?.[scope]) {
    return record.medicalHandoffSentAtByScope[scope] || null;
  }

  return scope === 'all' ? record.medicalHandoffSentAt || null : null;
};

export const resolveScopedMedicalSignature = (
  record: MedicalHandoffScopeRecordLike | null | undefined,
  scope: MedicalHandoffScope
): ScopedMedicalSignature | null => {
  if (!record) return null;

  if (record.medicalSignatureByScope?.[scope]) {
    return record.medicalSignatureByScope[scope] || null;
  }

  return scope === 'all' ? record.medicalSignature || null : null;
};
