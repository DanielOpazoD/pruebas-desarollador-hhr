import { BEDS } from '@/constants/beds';
import type { DailyRecord } from '@/types/domain/dailyRecord';
import type { PatientData } from '@/types/domain/patient';
import { PatientStatus, Specialty } from '@/types/domain/patientClassification';

export const parseIsoDateLocal = (iso: string): Date => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

export const createMockBeds = (
  occupiedCount: number,
  blockedCount: number = 0
): Record<string, PatientData> => {
  const beds: Record<string, PatientData> = {};
  BEDS.forEach((bed, index) => {
    const i = index + 1;
    if (i <= blockedCount) {
      beds[bed.id] = {
        bedId: bed.id,
        isBlocked: true,
        blockedReason: 'Mantención',
        bedMode: 'Cama',
        hasCompanionCrib: false,
        hasWristband: true,
        devices: [],
        surgicalComplication: false,
        isUPC: false,
        patientName: '',
        rut: '',
        pathology: '',
        specialty: Specialty.EMPTY,
        status: PatientStatus.EMPTY,
        admissionDate: '',
        admissionTime: '',
        age: '',
      };
    } else if (i <= occupiedCount + blockedCount) {
      beds[bed.id] = {
        bedId: bed.id,
        isBlocked: false,
        patientName: `Patient ${i}`,
        rut: `12.345.678-${i}`,
        pathology: 'Test Diagnosis',
        specialty: Specialty.MEDICINA,
        status: PatientStatus.ESTABLE,
        admissionDate: '2026-01-01',
        admissionTime: '10:00',
        age: '45',
        bedMode: 'Cama',
        hasCompanionCrib: false,
        hasWristband: true,
        devices: [],
        surgicalComplication: false,
        isUPC: false,
      };
    } else {
      beds[bed.id] = {
        bedId: bed.id,
        isBlocked: false,
        patientName: '',
        rut: '',
        pathology: '',
        specialty: Specialty.EMPTY,
        status: PatientStatus.EMPTY,
        admissionDate: '',
        admissionTime: '',
        age: '',
        bedMode: 'Cama',
        hasCompanionCrib: false,
        hasWristband: true,
        devices: [],
        surgicalComplication: false,
        isUPC: false,
      };
    }
  });
  return beds;
};

export const createMockRecord = (
  date: string,
  occupiedCount: number = 10,
  blockedCount: number = 0
): DailyRecord => ({
  date,
  beds: createMockBeds(occupiedCount, blockedCount),
  discharges: [],
  transfers: [],
  cma: [],
  lastUpdated: `${date}T00:00:00.000Z`,
  nurses: ['', ''],
  activeExtraBeds: [],
});
