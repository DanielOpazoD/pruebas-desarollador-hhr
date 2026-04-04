import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreateWorkbook, mockPopulateTransferIaasWorkbook } = vi.hoisted(() => ({
  mockCreateWorkbook: vi.fn(),
  mockPopulateTransferIaasWorkbook: vi.fn(),
}));

vi.mock('@/services/exporters/excelUtils', async () => {
  const actual = await vi.importActual<typeof import('@/services/exporters/excelUtils')>(
    '@/services/exporters/excelUtils'
  );

  return {
    ...actual,
    createWorkbook: mockCreateWorkbook,
  };
});

vi.mock('@/services/transfers/transferIaasWorkbookController', () => ({
  populateTransferIaasWorkbook: mockPopulateTransferIaasWorkbook,
}));

import {
  generateEncuestaCovid,
  generateFormularioIAAS,
  generateSolicitudAmbulancia,
  generateTapaTraslado,
} from '@/services/transfers/documentFallbacks';
import type {
  HospitalConfig,
  QuestionnaireResponse,
  TransferPatientData,
} from '@/types/transferDocuments';

const patientData: TransferPatientData = {
  patientName: 'Paciente Demo',
  rut: '11.111.111-1',
  birthDate: '1986-01-01',
  age: 40,
  diagnosis: '',
  admissionDate: '2026-03-10',
  bedName: 'B-12',
  bedType: 'Básica',
  isUPC: false,
  originHospital: 'Hospital Hanga Roa',
};

const hospital: HospitalConfig = {
  id: 'hhr',
  name: 'Hospital Hanga Roa',
  code: 'HHR',
  emails: { to: [], cc: [] },
  questions: [],
  templates: [],
};

const responses: QuestionnaireResponse = {
  responses: [
    { questionId: 'contactoCovid', value: 'Sí' },
    { questionId: 'responsableEncuesta', value: 'Enf. Demo' },
    { questionId: 'cargoResponsable', value: 'Enfermera' },
    { questionId: 'medicoTratante', value: 'Dr. Demo' },
    { questionId: 'enfermeraResponsable', value: 'Enf. Demo' },
    { questionId: 'requiereAcompanante', value: 'Sí' },
  ],
  completedAt: '2026-03-13T10:00:00Z',
  completedBy: 'Dra. Demo',
  attendingPhysician: 'Dra. Demo',
  diagnosis: 'Neumonía',
};

describe('documentFallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateWorkbook.mockResolvedValue({
      xlsx: {
        writeBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
      },
    });
  });

  it('generates docx fallbacks for cover, covid survey and ambulance request', async () => {
    const [cover, covid, ambulance] = await Promise.all([
      generateTapaTraslado(patientData, hospital),
      generateEncuestaCovid(patientData, responses, hospital),
      generateSolicitudAmbulancia(patientData, responses, hospital),
    ]);

    expect(cover).toMatchObject({
      templateId: 'tapa-traslado',
      fileName: 'Tapa_Traslado_Paciente_Demo.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    expect(covid).toMatchObject({
      templateId: 'encuesta-covid',
      fileName: 'Encuesta_COVID_Paciente_Demo.docx',
    });
    expect(ambulance).toMatchObject({
      templateId: 'solicitud-ambulancia',
      fileName: 'Solicitud_Ambulancia_Paciente_Demo.docx',
    });
    expect(cover.blob.size).toBeGreaterThan(0);
    expect(covid.blob.size).toBeGreaterThan(0);
    expect(ambulance.blob.size).toBeGreaterThan(0);
  });

  it('delegates IAAS workbook generation and returns an xlsx document', async () => {
    const result = await generateFormularioIAAS(patientData, responses, hospital);

    expect(mockCreateWorkbook).toHaveBeenCalledTimes(1);
    expect(mockPopulateTransferIaasWorkbook).toHaveBeenCalledTimes(1);
    expect(mockPopulateTransferIaasWorkbook).toHaveBeenCalledWith(
      await mockCreateWorkbook.mock.results[0]?.value,
      patientData,
      responses
    );
    expect(result).toMatchObject({
      templateId: 'formulario-iaas',
      fileName: 'Formulario_IAAS_Paciente_Demo.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    expect(result.blob.type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  });
});
