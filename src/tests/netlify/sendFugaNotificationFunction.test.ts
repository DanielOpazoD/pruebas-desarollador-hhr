import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendCensusEmailMock = vi.fn();
const authorizeRoleRequestMock = vi.fn();
const extractBearerTokenMock = vi.fn();
const getFirebaseServerMock = vi.fn();

vi.mock('@/services/email/gmailClient', () => ({
  sendCensusEmail: (...args: unknown[]) => sendCensusEmailMock(...args),
}));

vi.mock('../../../netlify/functions/lib/firebase-auth', () => ({
  authorizeRoleRequest: (...args: unknown[]) => authorizeRoleRequestMock(...args),
  extractBearerToken: (...args: unknown[]) => extractBearerTokenMock(...args),
}));

vi.mock('../../../netlify/functions/lib/firebase-server', () => ({
  getFirebaseServer: () => getFirebaseServerMock(),
}));

import {
  buildFugaNotificationBody,
  handler,
  resolveFugaRecipients,
} from '../../../netlify/functions/send-fuga-notification';

describe('send-fuga-notification netlify function', () => {
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

    sendCensusEmailMock.mockResolvedValue({ id: 'gmail-fuga-123' });
    extractBearerTokenMock.mockReturnValue('token-123');
    authorizeRoleRequestMock.mockResolvedValue({
      email: 'admin@hospital.cl',
      role: 'admin',
      token: { sub: 'uid-1' },
    });
    getFirebaseServerMock.mockReturnValue({ db: { kind: 'firestore' } });
  });

  it('resuelve destinatarios psiquiatría en modo normal', () => {
    expect(
      resolveFugaRecipients({ specialty: 'Psiquiatría', recipients: ['otro@hospital.cl'] })
    ).toEqual(['angelica.vargas@hospitalhangaroa.cl', 'mariapaz.ureta@hospitalhangaroa.cl']);
  });

  it('resuelve destinatario único en modo prueba', () => {
    expect(
      resolveFugaRecipients({
        specialty: 'Psiquiatría',
        recipients: ['otro@hospital.cl'],
        testMode: true,
        testRecipient: 'test@hospital.cl',
      })
    ).toEqual(['test@hospital.cl']);
  });

  it('compone cuerpo final con mensaje automático y nota opcional', () => {
    expect(
      buildFugaNotificationBody({
        automaticMessage: 'Mensaje base',
        note: 'Detalle clínico',
        nursesSignature: 'Enf A / Enf B',
      })
    ).toContain('Enf A / Enf B');

    expect(
      buildFugaNotificationBody({ automaticMessage: 'Solo automático', note: '   ' })
    ).toContain('Enfermería - Servicio Hospitalizados');
  });

  it('envía solo a correo de prueba cuando testMode=true', async () => {
    const response = await handler({
      httpMethod: 'POST',
      headers: {
        origin: 'https://app.example.com',
        authorization: 'Bearer token-123',
      },
      body: JSON.stringify({
        patientName: 'Paciente Uno',
        rut: '1-9',
        diagnosis: 'Diagnóstico',
        bedName: 'A-1',
        specialty: 'Psiquiatría',
        recordDate: '2026-03-31',
        time: '10:00',
        automaticMessage: 'Mensaje editable',
        note: 'Nota',
        testMode: true,
        testRecipient: 'qa@hospital.cl',
      }),
      path: '/.netlify/functions/send-fuga-notification',
    });

    expect(response.statusCode).toBe(200);
    expect(sendCensusEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipients: ['qa@hospital.cl'],
        subject: 'Notificación de fuga paciente Paciente Uno - 31-03-2026',
        body: expect.stringContaining('Nota'),
      })
    );
  });

  it('rechaza modo prueba si rol no es admin', async () => {
    authorizeRoleRequestMock.mockResolvedValue({
      email: 'nurse@hospital.cl',
      role: 'nurse_hospital',
      token: { sub: 'uid-2' },
    });

    const response = await handler({
      httpMethod: 'POST',
      headers: {
        origin: 'https://app.example.com',
        authorization: 'Bearer token-123',
      },
      body: JSON.stringify({
        patientName: 'Paciente Dos',
        rut: '2-7',
        diagnosis: 'Diag',
        bedName: 'A-2',
        specialty: 'Cirugía',
        recordDate: '2026-03-31',
        time: '11:00',
        automaticMessage: 'Mensaje editable',
        recipients: ['destino@hospital.cl'],
        testMode: true,
        testRecipient: 'qa@hospital.cl',
      }),
      path: '/.netlify/functions/send-fuga-notification',
    });

    expect(response.statusCode).toBe(403);
    expect(response.body).toContain('Solo un usuario admin puede usar modo prueba');
    expect(sendCensusEmailMock).not.toHaveBeenCalled();
  });
});
