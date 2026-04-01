import type { PatientData } from '@/features/census/controllers/censusActionPatientContracts';
import type { IeehData } from '@/types/domain/movements';
import type { DischargeFormData } from '@/services/pdf/ieehPdfService';

export interface IeehFormDraftValues {
  diagnosticoPrincipal: string;
  cie10Code: string;
  cie10Display: string;
  condicionEgreso: string;
  tieneIntervencion: boolean;
  intervencionDescrip: string;
  tieneProcedimiento: boolean;
  procedimientoDescrip: string;
  tratanteApellido1: string;
  tratanteApellido2: string;
  tratanteNombre: string;
  tratanteRut: string;
}

export const buildIeehInitialDraftValues = (
  patient: PatientData,
  savedIeehData?: IeehData
): IeehFormDraftValues => {
  if (savedIeehData) {
    return {
      diagnosticoPrincipal: savedIeehData.diagnosticoPrincipal || '',
      cie10Code: savedIeehData.cie10Code || '',
      cie10Display: savedIeehData.diagnosticoPrincipal || '',
      condicionEgreso: savedIeehData.condicionEgreso || '1',
      tieneIntervencion: savedIeehData.intervencionQuirurgica === '1',
      intervencionDescrip: savedIeehData.intervencionQuirurgDescrip || '',
      tieneProcedimiento: savedIeehData.procedimiento === '1',
      procedimientoDescrip: savedIeehData.procedimientoDescrip || '',
      tratanteApellido1: savedIeehData.tratanteApellido1 || '',
      tratanteApellido2: savedIeehData.tratanteApellido2 || '',
      tratanteNombre: savedIeehData.tratanteNombre || '',
      tratanteRut: savedIeehData.tratanteRut || '',
    };
  }

  return {
    diagnosticoPrincipal: patient.cie10Description || patient.pathology || '',
    cie10Code: patient.cie10Code || '',
    cie10Display: patient.cie10Description || '',
    condicionEgreso: '1',
    tieneIntervencion: false,
    intervencionDescrip: '',
    tieneProcedimiento: false,
    procedimientoDescrip: '',
    tratanteApellido1: '',
    tratanteApellido2: '',
    tratanteNombre: '',
    tratanteRut: '',
  };
};

export const buildPersistedIeehData = (draft: IeehFormDraftValues): IeehData => ({
  diagnosticoPrincipal: draft.diagnosticoPrincipal || undefined,
  cie10Code: draft.cie10Code || undefined,
  condicionEgreso: draft.condicionEgreso,
  intervencionQuirurgica: draft.tieneIntervencion ? '1' : '2',
  intervencionQuirurgDescrip: draft.tieneIntervencion
    ? draft.intervencionDescrip || undefined
    : undefined,
  procedimiento: draft.tieneProcedimiento ? '1' : '2',
  procedimientoDescrip: draft.tieneProcedimiento
    ? draft.procedimientoDescrip || undefined
    : undefined,
  tratanteApellido1: draft.tratanteApellido1 || undefined,
  tratanteApellido2: draft.tratanteApellido2 || undefined,
  tratanteNombre: draft.tratanteNombre || undefined,
  tratanteRut: draft.tratanteRut || undefined,
});

export const buildIeehPrintDischargeData = (
  baseDischargeData: DischargeFormData,
  draft: IeehFormDraftValues
): DischargeFormData => ({
  ...baseDischargeData,
  ...buildPersistedIeehData(draft),
});
