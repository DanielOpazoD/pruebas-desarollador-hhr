import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { RECEIVING_CENTER_EXTRASYSTEM, RECEIVING_CENTER_OTHER } from '@/constants';
import { applyTransferPatch } from '@/features/census/controllers/censusModalStateController';
import { buildTransferRuntimeActions } from '@/features/census/controllers/censusActionRuntimeAdapterController';
import { executeTransferController } from '@/features/census/controllers/censusActionRuntimeController';
import {
  buildTransferErrorNotification,
  type CensusActionNotification,
} from '@/features/census/controllers/censusActionNotificationController';
import type { CensusActionRuntimeRefs } from '@/features/census/hooks/useCensusActionRuntimeRefs';
import { useSingleFlightAsyncCommand } from '@/features/census/hooks/useSingleFlightAsyncCommand';
import type { TransferExecutionInput } from '@/features/census/domain/movements/contracts';
import type { TransferState } from '@/features/census/types/censusActionTypes';
import { useAuth } from '@/context/AuthContext';
import {
  createTransferRequest,
  getLatestOpenTransferRequestByBedId,
} from '@/services/transfers/transferService';
import type { PatientData } from '@/types';

const resolveDestinationHospital = (
  receivingCenter: string,
  receivingCenterOther: string
): string => {
  const otherValue = receivingCenterOther.trim();
  if (
    receivingCenter === RECEIVING_CENTER_OTHER ||
    receivingCenter === RECEIVING_CENTER_EXTRASYSTEM
  ) {
    return otherValue || receivingCenter;
  }
  return receivingCenter;
};

const resolveCurrentDiagnosis = (patient: PatientData): string => {
  const pathology = patient.pathology?.trim();
  if (pathology) {
    return pathology;
  }

  const cie10Description = patient.cie10Description?.trim();
  if (cie10Description) {
    return cie10Description;
  }

  const cie10Code = patient.cie10Code?.trim();
  if (cie10Code) {
    return cie10Code;
  }

  const diagnosisComment = patient.diagnosisComments?.trim();
  if (diagnosisComment) {
    return diagnosisComment;
  }

  return 'Sin diagnóstico';
};

const buildPatientSnapshot = (patient: PatientData, recordDate: string) => ({
  name: patient.patientName || 'Paciente sin nombre',
  rut: patient.rut || 'Sin RUT',
  age: Number.parseInt(patient.age || '', 10) || 0,
  birthDate: patient.birthDate,
  sex: patient.biologicalSex === 'Masculino' ? ('M' as const) : ('F' as const),
  diagnosis: resolveCurrentDiagnosis(patient),
  secondaryDiagnoses: patient.diagnosisComments ? [patient.diagnosisComments] : undefined,
  admissionDate: patient.admissionDate || recordDate,
});

interface UseCensusTransferCommandParams extends Pick<
  CensusActionRuntimeRefs,
  'transferStateRef' | 'stabilityRulesRef' | 'addTransferRef' | 'updateTransferRef' | 'recordRef'
> {
  setTransferState: Dispatch<SetStateAction<TransferState>>;
  getCurrentTime: () => string;
  notifyError: (notification: CensusActionNotification) => void;
}

export const useCensusTransferCommand = ({
  transferStateRef,
  stabilityRulesRef,
  addTransferRef,
  updateTransferRef,
  recordRef,
  setTransferState,
  getCurrentTime,
  notifyError,
}: UseCensusTransferCommandParams) => {
  const { runSingleFlight: runTransferSingleFlight } = useSingleFlightAsyncCommand();
  const { user } = useAuth();

  return useCallback(
    (data?: TransferExecutionInput) => {
      const started = runTransferSingleFlight(async () => {
        const transferState = transferStateRef.current;
        const record = recordRef.current;
        const bedId = transferState.bedId;
        const patient = bedId ? record?.beds?.[bedId] : undefined;
        const destinationHospital = resolveDestinationHospital(
          transferState.receivingCenter,
          transferState.receivingCenterOther
        );

        const result = executeTransferController({
          transferState,
          data,
          stabilityRules: stabilityRulesRef.current,
          nowTime: getCurrentTime(),
          actions: buildTransferRuntimeActions(addTransferRef.current, updateTransferRef.current),
        });

        if (!result.ok) {
          notifyError(buildTransferErrorNotification(result.error.code, result.error.message));
          return;
        }

        setTransferState(prev => applyTransferPatch(prev, result.value.closeModalPatch));

        if (!transferState.recordId && bedId && patient && destinationHospital) {
          try {
            const linkedRequest = await getLatestOpenTransferRequestByBedId(bedId);
            if (!linkedRequest) {
              const requestDate = (
                data?.movementDate ||
                record?.date ||
                new Date().toISOString()
              ).split('T')[0];

              await createTransferRequest({
                patientId: bedId,
                bedId,
                patientSnapshot: buildPatientSnapshot(patient, record?.date || requestDate),
                destinationHospital,
                transferReason: 'Traslado registrado desde Censo Diario',
                requestingDoctor: '',
                observations:
                  'Solicitud creada automáticamente desde Censo Diario para completar gestión posterior.',
                customFields: {
                  source: 'census_transfer_autocreate',
                },
                status: 'REQUESTED',
                requestDate,
                createdBy: user?.email || 'census-auto@local',
              });
            }
          } catch (syncError) {
            console.error(
              '[Transfer Sync] Failed to sync census transfer with transfer management',
              syncError
            );
            notifyError({
              title: 'Traslado registrado con advertencia',
              message:
                'Se registró el traslado en Censo, pero no se pudo sincronizar automáticamente con Gestión de Traslados.',
            });
          }
        }
      });

      if (!started) return;
    },
    [
      addTransferRef,
      getCurrentTime,
      notifyError,
      runTransferSingleFlight,
      setTransferState,
      stabilityRulesRef,
      recordRef,
      transferStateRef,
      user?.email,
      updateTransferRef,
    ]
  );
};
