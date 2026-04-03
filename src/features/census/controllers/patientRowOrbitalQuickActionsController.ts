export interface PatientRowOrbitalQuickActionsAvailability {
  showClinicalDocumentsAction: boolean;
  showExamRequestAction: boolean;
  showImagingRequestAction: boolean;
  showMedicalIndicationsAction?: boolean;
}

export type PatientRowOrbitalQuickActionAsset =
  | 'rongorongo'
  | 'mangai'
  | 'ahutepitokura'
  | 'manutara';

export interface PatientRowOrbitalQuickActionItem {
  id: 'clinical-documents' | 'exam-request' | 'imaging-request' | 'medical-indications';
  label: string;
  tooltip: string;
  iconAsset: PatientRowOrbitalQuickActionAsset;
  buttonClassName: string;
}

const ORBITAL_ACTION_DEFINITIONS: Array<
  PatientRowOrbitalQuickActionItem & {
    visible: keyof PatientRowOrbitalQuickActionsAvailability;
  }
> = [
  {
    id: 'clinical-documents',
    label: 'Documentos',
    tooltip: 'Documentos clínicos',
    iconAsset: 'rongorongo',
    buttonClassName: 'bg-white text-slate-700 hover:bg-slate-100',
    visible: 'showClinicalDocumentsAction',
  },
  {
    id: 'exam-request',
    label: 'Laboratorio',
    tooltip: 'Solicitud Exámenes',
    iconAsset: 'mangai',
    buttonClassName: 'bg-white text-slate-700 hover:bg-slate-100',
    visible: 'showExamRequestAction',
  },
  {
    id: 'imaging-request',
    label: 'Imágenes',
    tooltip: 'Solicitud de Imágenes',
    iconAsset: 'ahutepitokura',
    buttonClassName: 'bg-white text-slate-700 hover:bg-slate-100',
    visible: 'showImagingRequestAction',
  },
  {
    id: 'medical-indications',
    label: 'Indicaciones',
    tooltip: 'Indicaciones médicas',
    iconAsset: 'manutara',
    buttonClassName: 'bg-white text-slate-700 hover:bg-slate-100',
    visible: 'showMedicalIndicationsAction',
  },
];

export const buildPatientRowOrbitalQuickActionItems = (
  availability: PatientRowOrbitalQuickActionsAvailability
): PatientRowOrbitalQuickActionItem[] =>
  ORBITAL_ACTION_DEFINITIONS.filter(definition => availability[definition.visible]).map(
    ({ visible: _visible, ...item }) => item
  );

export const hasPatientRowOrbitalQuickActions = (
  availability: PatientRowOrbitalQuickActionsAvailability
): boolean =>
  availability.showClinicalDocumentsAction ||
  availability.showExamRequestAction ||
  availability.showImagingRequestAction ||
  Boolean(availability.showMedicalIndicationsAction);
