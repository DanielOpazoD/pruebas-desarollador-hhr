import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fillMedicalIndicationsPdf,
  type MedicalIndicationsPdfData,
} from '@/services/pdf/medicalIndicationsPdfService';

const { mockDrawText, mockGetPage, mockEmbedFont, mockSave } = vi.hoisted(() => {
  const mockDrawText = vi.fn();
  return {
    mockDrawText,
    mockGetPage: vi.fn().mockReturnValue({ drawText: mockDrawText }),
    mockEmbedFont: vi.fn().mockResolvedValue({}),
    mockSave: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  };
});

vi.mock('pdf-lib', async () => {
  const actual = await vi.importActual<typeof import('pdf-lib')>('pdf-lib');
  return {
    ...actual,
    PDFDocument: {
      load: vi.fn().mockResolvedValue({
        getPage: mockGetPage,
        embedFont: mockEmbedFont,
        save: mockSave,
      }),
    },
  };
});

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode('%PDF-1.7').buffer),
}) as unknown as typeof fetch;

describe('medicalIndicationsPdfService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes auto and manual fields onto template coordinates', async () => {
    const data: MedicalIndicationsPdfData = {
      paciente_nombre: 'PACIENTE TEST',
      paciente_rut: '11.111.111-1',
      paciente_diagnostico: 'NEUMONIA',
      paciente_edad: '72',
      fecha_nacimiento: '01-01-1954',
      paciente_alergias: 'PENICILINA',
      medicotratante: 'DR TEST',
      fecha_ingreso: '01-03-2026',
      fecha_actual: '02-04-2026',
      diasEstada: '4',
      Reposoindicacion: 'ABSOLUTO',
      Regimenindicacion: 'BLANDO',
      Kinemotora: 'X',
      Kinerespiratoria: '',
      Kinecantidadvecesdia: '2',
      Pendientes: 'EVALUAR O2',
      indicaciones: ['IND 1', 'IND 2'],
    };

    const bytes = await fillMedicalIndicationsPdf(data);

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(mockDrawText).toHaveBeenCalledWith(
      'PACIENTE TEST',
      expect.objectContaining({ x: 98.33 })
    );
    expect(mockDrawText).toHaveBeenCalledWith('ABSOLUTO', expect.objectContaining({ x: 22.33 }));
    expect(mockDrawText).toHaveBeenCalledWith('IND 1', expect.objectContaining({ x: 23 }));
    expect(mockDrawText).toHaveBeenCalledWith('IND 2', expect.objectContaining({ x: 24.33 }));
  });
});
