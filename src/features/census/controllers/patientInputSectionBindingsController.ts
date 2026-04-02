import type {
  PatientInputSectionBindings,
  PatientInputSectionSharedProps,
  PatientInputSectionBindingsParams,
} from '@/features/census/components/patient-row/patientInputSectionContracts';

const buildPatientInputSectionSharedProps = ({
  data,
  currentDateString,
  isNewAdmission,
  isSubRow,
  isEmpty,
  isLocked,
}: Pick<
  PatientInputSectionBindingsParams,
  'data' | 'currentDateString' | 'isNewAdmission' | 'isSubRow' | 'isEmpty' | 'isLocked'
>): PatientInputSectionSharedProps => ({
  data,
  currentDateString,
  isNewAdmission,
  isSubRow,
  isEmpty,
  isLocked,
});

export const buildPatientInputSectionBindings = ({
  data,
  currentDateString,
  isNewAdmission,
  isSubRow,
  isEmpty,
  isLocked,
  diagnosisMode,
  hasRutError,
  handleDebouncedText,
  onDemo,
  onChange,
}: PatientInputSectionBindingsParams): PatientInputSectionBindings => {
  const shared = buildPatientInputSectionSharedProps({
    data,
    currentDateString,
    isNewAdmission,
    isSubRow,
    isEmpty,
    isLocked,
  });

  return {
    identity: {
      shared,
      hasRutError,
      handleDebouncedText,
      onDemo,
      onChange,
    },
    clinical: {
      shared,
      diagnosisMode,
      handleDebouncedText,
      onChange,
    },
    flow: {
      shared,
      handleDebouncedText,
      onChange,
    },
    flags: {
      shared,
      onChange,
    },
  } satisfies PatientInputSectionBindings;
};
