import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateHandoffPdf } from '@/services/pdf/handoffPdfGenerator';
import { saveAndDownloadPdf } from '@/services/pdf/pdfBase';

const docMock = {
  output: vi.fn(() => new ArrayBuffer(8)),
};

vi.mock('jspdf', () => ({
  default: vi.fn(
    class {
      output = docMock.output;
    }
  ),
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

vi.mock('@/services/pdf/pdfBase', () => ({
  saveAndDownloadPdf: vi.fn(),
}));

vi.mock('@/services/pdf/handoffPdfSections', () => ({
  addHandoffHeader: vi.fn(async () => 20),
  addStaffAndChecklist: vi.fn(() => 40),
  addPatientTable: vi.fn(() => 80),
  addMovementsSummary: vi.fn(() => 120),
  addNovedadesSection: vi.fn(),
  addCudyrTable: vi.fn(),
  addPageFooter: vi.fn(),
}));

describe('handoffPdfGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('downloads the generated day-shift handoff pdf with the expected file name', async () => {
    await generateHandoffPdf(
      {
        date: '2026-01-03',
        handoffNovedadesDayShift: '',
        handoffNovedadesNightShift: '',
      } as never,
      false,
      'day',
      {
        dayStart: '08:00',
        dayEnd: '20:00',
        nightStart: '20:00',
        nightEnd: '08:00',
      }
    );

    expect(docMock.output).toHaveBeenCalledWith('arraybuffer');
    expect(saveAndDownloadPdf).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      '03-01-2026 - Turno Largo.pdf'
    );
  });

  it('uses the night-shift file name for nocturnal exports', async () => {
    await generateHandoffPdf(
      {
        date: '2026-01-03',
        handoffNovedadesDayShift: '',
        handoffNovedadesNightShift: '',
      } as never,
      false,
      'night',
      {
        dayStart: '08:00',
        dayEnd: '20:00',
        nightStart: '20:00',
        nightEnd: '08:00',
      }
    );

    expect(saveAndDownloadPdf).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      '03-01-2026 - Turno Noche.pdf'
    );
  });
});
