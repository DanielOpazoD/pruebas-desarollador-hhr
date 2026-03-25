import { beforeEach, describe, expect, it, vi } from 'vitest';

const buildCensusMasterBufferMock = vi.fn();
const sendCensusEmailMock = vi.fn();
const fromDataAsyncMock = vi.fn();
const outputAsyncMock = vi.fn();
const validateExcelBufferMock = vi.fn();
const validateExcelFilenameMock = vi.fn();

vi.mock('@/services/security/passwordGenerator', () => ({
  generateCensusPassword: vi.fn(() => 'PIN-123'),
}));

vi.mock('@/services/email/gmailClient', () => ({
  sendCensusEmail: (...args: unknown[]) => sendCensusEmailMock(...args),
}));

vi.mock('@/services/exporters/censusMasterWorkbook', () => ({
  buildCensusMasterBuffer: (...args: unknown[]) => buildCensusMasterBufferMock(...args),
  getCensusMasterFilename: vi.fn(() => 'censo-2026-03-24.xlsx'),
}));

vi.mock('@/services/exporters/excelValidation', () => ({
  validateExcelBuffer: (...args: unknown[]) => validateExcelBufferMock(...args),
  validateExcelFilename: (...args: unknown[]) => validateExcelFilenameMock(...args),
  MIN_EXCEL_SIZE: 10,
}));

vi.mock('xlsx-populate', () => ({
  default: {
    fromDataAsync: (...args: unknown[]) => fromDataAsyncMock(...args),
  },
}));

import { handler } from '../../../netlify/functions/send-census-email';

describe('send-census-email netlify function', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      URL: 'https://app.example.com',
      DEPLOY_PRIME_URL: '',
      DEPLOY_URL: '',
      SITE_URL: '',
      APP_URL: '',
    };

    buildCensusMasterBufferMock.mockResolvedValue(Buffer.from('raw workbook'));
    validateExcelBufferMock.mockReturnValue({ valid: true });
    validateExcelFilenameMock.mockReturnValue({ valid: true });
    outputAsyncMock.mockResolvedValue(Buffer.from('encrypted workbook payload'));
    fromDataAsyncMock.mockResolvedValue({
      outputAsync: outputAsyncMock,
    });
    sendCensusEmailMock.mockResolvedValue({ id: 'gmail-123' });
  });

  it('answers trusted preflight requests with scoped CORS headers', async () => {
    const response = await handler({
      httpMethod: 'OPTIONS',
      headers: { origin: 'https://app.example.com' },
      body: null,
      path: '/.netlify/functions/send-census-email',
    });
    const headers = response.headers as Record<string, string>;

    expect(response.statusCode).toBe(200);
    expect(headers['Access-Control-Allow-Origin']).toBe('https://app.example.com');
    expect(headers['Access-Control-Allow-Methods']).toBe('POST,OPTIONS');
  });

  it('rejects requests from untrusted origins before touching workbook generation', async () => {
    const response = await handler({
      httpMethod: 'POST',
      headers: {
        origin: 'https://evil.example.com',
        'x-user-role': 'admin',
      },
      body: JSON.stringify({ date: '2026-03-24', records: [{ date: '2026-03-24', beds: {} }] }),
      path: '/.netlify/functions/send-census-email',
    });

    expect(response.statusCode).toBe(403);
    expect(response.body).toContain('Origin not allowed');
    expect(buildCensusMasterBufferMock).not.toHaveBeenCalled();
  });

  it('rejects legacy shareLink payloads', async () => {
    const response = await handler({
      httpMethod: 'POST',
      headers: {
        origin: 'https://app.example.com',
        'x-user-role': 'admin',
      },
      body: JSON.stringify({
        date: '2026-03-24',
        records: [{ date: '2026-03-24', beds: {} }],
        shareLink: 'https://legacy.example.com/censo',
      }),
      path: '/.netlify/functions/send-census-email',
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('acceso por link al censo fue eliminado');
    expect(buildCensusMasterBufferMock).not.toHaveBeenCalled();
  });

  it('keeps the excel flow working and returns the gmail metadata payload', async () => {
    const response = await handler({
      httpMethod: 'POST',
      headers: {
        origin: 'https://app.example.com',
        'x-user-role': 'admin',
      },
      body: JSON.stringify({
        date: '2026-03-24',
        body: 'Resumen diario',
        nursesSignature: 'Equipo de turno',
        recipients: ['destino@hospital.cl'],
        records: [{ date: '2026-03-24', beds: {} }],
      }),
      path: '/.netlify/functions/send-census-email',
    });

    expect(response.statusCode).toBe(200);
    expect(sendCensusEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-03-24',
        recipients: ['destino@hospital.cl'],
        attachmentName: 'censo-2026-03-24.xlsx',
        encryptionPin: 'PIN-123',
      })
    );
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        success: true,
        gmailId: 'gmail-123',
        exportPassword: 'PIN-123',
      })
    );
  });
});
