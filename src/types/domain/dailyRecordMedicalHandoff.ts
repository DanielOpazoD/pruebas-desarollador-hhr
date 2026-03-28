export type MedicalSpecialty =
  | 'cirugia'
  | 'traumatologia'
  | 'ginecobstetricia'
  | 'pediatria'
  | 'psiquiatria'
  | 'medicinaInterna';

export type MedicalSignatureScope = 'all' | 'upc' | 'no-upc';

export interface MedicalHandoffActor {
  uid: string;
  displayName: string;
  email: string;
  specialty?: MedicalSpecialty;
  role?: string;
}

export interface MedicalHandoffDailyContinuityEntry {
  status: 'updated_by_specialist' | 'confirmed_no_changes';
  confirmedBy?: MedicalHandoffActor;
  confirmedAt?: string;
  comment?: string;
}

export interface MedicalSpecialtyHandoffNote {
  note: string;
  createdAt: string;
  updatedAt: string;
  author: MedicalHandoffActor;
  lastEditor?: MedicalHandoffActor;
  version: number;
  dailyContinuity?: Record<string, MedicalHandoffDailyContinuityEntry>;
}

export type MedicalHandoffBySpecialty = Partial<
  Record<MedicalSpecialty, MedicalSpecialtyHandoffNote>
>;

export interface MedicalSignature {
  doctorName: string;
  signedAt: string;
  userAgent?: string;
}

export type MedicalSignatureByScope = Partial<Record<MedicalSignatureScope, MedicalSignature>>;
export type MedicalSignatureTimestampByScope = Partial<Record<MedicalSignatureScope, string>>;
