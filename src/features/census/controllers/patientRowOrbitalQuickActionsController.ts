export interface PatientRowOrbitalQuickActionsAvailability {
  showClinicalDocumentsAction: boolean;
  showExamRequestAction: boolean;
  showImagingRequestAction: boolean;
}

export type PatientRowOrbitalQuickActionAsset = 'rongorongo' | 'mangai' | 'ahutepitokura';

export interface PatientRowOrbitalQuickActionItem {
  id: 'clinical-documents' | 'exam-request' | 'imaging-request';
  label: string;
  tooltip: string;
  angleDeg: number;
  x: number;
  y: number;
  iconAsset: PatientRowOrbitalQuickActionAsset;
  buttonClassName: string;
}

const ORBITAL_ACTION_DEFINITIONS: Array<
  Omit<PatientRowOrbitalQuickActionItem, 'x' | 'y'> & {
    visible: keyof PatientRowOrbitalQuickActionsAvailability;
  }
> = [
  {
    id: 'clinical-documents',
    label: 'Documentos',
    tooltip: 'Documentos clínicos',
    angleDeg: -60,
    iconAsset: 'rongorongo',
    buttonClassName: 'bg-white text-slate-700 hover:bg-slate-100',
    visible: 'showClinicalDocumentsAction',
  },
  {
    id: 'exam-request',
    label: 'Laboratorio',
    tooltip: 'Solicitud Exámenes',
    angleDeg: 0,
    iconAsset: 'mangai',
    buttonClassName: 'bg-white text-slate-700 hover:bg-slate-100',
    visible: 'showExamRequestAction',
  },
  {
    id: 'imaging-request',
    label: 'Imágenes',
    tooltip: 'Solicitud de Imágenes',
    angleDeg: 60,
    iconAsset: 'ahutepitokura',
    buttonClassName: 'bg-white text-slate-700 hover:bg-slate-100',
    visible: 'showImagingRequestAction',
  },
];

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const buildPatientRowOrbitalQuickActionItems = (
  availability: PatientRowOrbitalQuickActionsAvailability,
  radius = 50
): PatientRowOrbitalQuickActionItem[] =>
  ORBITAL_ACTION_DEFINITIONS.filter(definition => availability[definition.visible]).map(
    definition => {
      const radians = toRadians(definition.angleDeg);
      return {
        ...definition,
        x: Number((Math.cos(radians) * radius).toFixed(2)),
        y: Number((Math.sin(radians) * radius).toFixed(2)),
      };
    }
  );

export const hasPatientRowOrbitalQuickActions = (
  availability: PatientRowOrbitalQuickActionsAvailability
): boolean =>
  availability.showClinicalDocumentsAction ||
  availability.showExamRequestAction ||
  availability.showImagingRequestAction;
