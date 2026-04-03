import { describe, expect, it, vi } from 'vitest';
import {
  executeAnalyzePatients,
  executeMigratePatients,
  executeResolvePatientConflict,
} from '@/application/patient-flow/patientAnalysisUseCase';
import type { MasterPatient } from '@/types/domain/patientMaster';

describe('patientAnalysisUseCase', () => {
  it('builds analysis from repository records', async () => {
    const repository = {
      getAvailableDates: vi.fn().mockResolvedValue(['2026-03-05']),
      getForDate: vi.fn().mockResolvedValue({
        date: '2026-03-05',
        beds: {
          R1: {
            rut: '11.111.111-1',
            patientName: 'John Doe',
            admissionDate: '2026-03-05',
          },
        },
        discharges: [],
        transfers: [],
      }),
      updatePartial: vi.fn(),
    };

    const outcome = await executeAnalyzePatients({ dailyRecordRepository: repository });
    expect(outcome.status).toBe('success');
    expect(outcome.data?.uniquePatients).toBe(1);
  });

  it('resolves a conflict and optionally harmonizes history', async () => {
    const repository = {
      getAvailableDates: vi.fn(),
      getForDate: vi.fn(),
      updatePartial: vi.fn().mockResolvedValue(undefined),
    };
    const analysis = {
      totalRecords: 1,
      uniquePatients: 1,
      validPatients: [
        {
          rut: '11.111.111-1',
          fullName: 'Wrong Name',
          hospitalizations: [],
          vitalStatus: 'Vivo',
          createdAt: 1,
          updatedAt: 1,
        },
      ] as MasterPatient[],
      conflicts: [
        {
          rut: '11.111.111-1',
          description: 'Diferencia',
          options: ['Wrong Name', 'Correct Name'],
          records: ['2026-03-05'],
          bedMap: { '2026-03-05': 'R1' },
        },
      ],
    };

    const outcome = await executeResolvePatientConflict({
      analysis,
      rut: '11.111.111-1',
      correctName: 'Correct Name',
      harmonizeHistory: true,
      dailyRecordRepository: repository,
      auditPort: { writeEvent: vi.fn().mockResolvedValue(undefined) },
      currentUserEmail: 'test@test.com',
    });

    expect(outcome.status).toBe('success');
    expect(repository.updatePartial).toHaveBeenCalled();
    expect(outcome.data?.conflicts).toHaveLength(0);
  });

  it('migrates valid patients through repository port', async () => {
    const outcome = await executeMigratePatients({
      analysis: {
        totalRecords: 1,
        uniquePatients: 1,
        validPatients: [
          {
            rut: '11.111.111-1',
            fullName: 'John Doe',
            hospitalizations: [],
            vitalStatus: 'Vivo',
            createdAt: 1,
            updatedAt: 1,
          },
        ] as MasterPatient[],
        conflicts: [],
      },
      patientMasterRepository: {
        bulkUpsertPatients: vi.fn().mockResolvedValue({ successes: 1, errors: 0 }),
      },
    });

    expect(outcome.status).toBe('success');
    expect(outcome.data).toEqual({ successes: 1, errors: 0 });
  });
});
