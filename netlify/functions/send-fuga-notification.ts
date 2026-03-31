import { z } from 'zod';
import { sendCensusEmail } from '../../src/services/email/gmailClient';
import { getFirebaseServer } from './lib/firebase-server';
import {
  buildCorsHeaders,
  buildJsonResponse,
  buildTextResponse,
  getRequestOrigin,
  isOriginAllowed,
  parseJsonBody,
  type NetlifyEventLike,
} from './lib/http';
import { authorizeRoleRequest, extractBearerToken } from './lib/firebase-auth';
import { formatDateDDMMYYYY } from '../../src/utils/dateUtils';

const ALLOWED_ROLES = new Set(['nurse_hospital', 'admin']);

const FugaNotificationPayloadSchema = z.object({
  patientName: z.string().min(1),
  rut: z.string().min(1),
  diagnosis: z.string().min(1),
  bedName: z.string().min(1),
  specialty: z.string().optional(),
  recordDate: z.string().min(1),
  time: z.string().min(1),
  automaticMessage: z.string().min(1),
  nursesSignature: z.string().optional(),
  note: z.string().optional(),
  recipients: z.array(z.string().email()).optional(),
  testMode: z.boolean().optional(),
  testRecipient: z.string().email().optional(),
});

const PSYCHIATRY_RECIPIENTS = [
  'angelica.vargas@hospitalhangaroa.cl',
  'mariapaz.ureta@hospitalhangaroa.cl',
] as const;

const normalizeText = (value?: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const isPsychiatrySpecialty = (value?: string): boolean => {
  const normalized = normalizeText(value);
  return normalized === 'psiquiatria' || normalized.includes('psiquiatr');
};

export const buildFugaNotificationBody = (input: {
  automaticMessage: string;
  nursesSignature?: string;
  note?: string;
}): string => {
  const automaticBlock = input.automaticMessage.trim();
  const trimmedNote = input.note?.trim();
  const trimmedNursesSignature = input.nursesSignature?.trim();

  const signatureBlock = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    trimmedNursesSignature || '',
    'Enfermería - Servicio Hospitalizados',
    'Hospital Hanga Roa',
    'Anexo MINSAL 328388',
  ]
    .filter(Boolean)
    .join('\n');

  if (!trimmedNote) {
    return `${automaticBlock}\n\n${signatureBlock}`;
  }

  return `${automaticBlock}\n\nNota complementaria (ingresada por enfermería):\n${trimmedNote}\n\n${signatureBlock}`;
};

export const resolveFugaRecipients = (input: {
  specialty?: string;
  recipients?: string[];
  testMode?: boolean;
  testRecipient?: string;
}): string[] => {
  if (input.testMode) {
    return input.testRecipient ? [input.testRecipient] : [];
  }

  return isPsychiatrySpecialty(input.specialty)
    ? [...PSYCHIATRY_RECIPIENTS]
    : input.recipients || [];
};

export const handler = async (event: NetlifyEventLike) => {
  const requestOrigin = getRequestOrigin(event);
  const corsHeaders = buildCorsHeaders(requestOrigin, {
    allowedHeaders: 'Content-Type, Authorization, Accept, X-User-Role',
    allowedMethods: 'POST,OPTIONS',
  });

  if (!isOriginAllowed(requestOrigin)) {
    return buildJsonResponse(403, { error: 'Origin not allowed' }, { requestOrigin });
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return buildTextResponse(405, 'Método no permitido', { requestOrigin });
  }

  try {
    const { db } = getFirebaseServer();
    const authorizationHeader =
      typeof event.headers?.authorization === 'string'
        ? event.headers.authorization
        : typeof event.headers?.Authorization === 'string'
          ? event.headers.Authorization
          : undefined;

    try {
      extractBearerToken(authorizationHeader);
    } catch (error) {
      return buildTextResponse(
        401,
        error instanceof Error ? error.message : 'Authentication required.',
        { requestOrigin }
      );
    }

    let authContext: Awaited<ReturnType<typeof authorizeRoleRequest>>;
    try {
      authContext = await authorizeRoleRequest(db, authorizationHeader, ALLOWED_ROLES);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No autorizado para enviar notificaciones de fuga.';
      const statusCode =
        message.includes('Access denied') || message.includes('no email claim') ? 403 : 401;
      return buildTextResponse(statusCode, message, { requestOrigin });
    }

    const parsedBody = parseJsonBody<unknown>(event.body);
    if (!parsedBody.ok) {
      return buildTextResponse(400, parsedBody.error, { requestOrigin });
    }

    const validatedBody = FugaNotificationPayloadSchema.safeParse(parsedBody.value);
    if (!validatedBody.success) {
      return buildTextResponse(400, 'Solicitud inválida para notificación de fuga.', {
        requestOrigin,
      });
    }

    const payload = validatedBody.data;

    if (payload.testMode && authContext.role !== 'admin') {
      return buildTextResponse(403, 'Solo un usuario admin puede usar modo prueba.', {
        requestOrigin,
      });
    }

    const resolvedRecipients = resolveFugaRecipients(payload);

    if (resolvedRecipients.length === 0) {
      return buildTextResponse(
        400,
        'Debe ingresar al menos un correo destinatario para notificar la fuga.',
        { requestOrigin }
      );
    }

    const subject = `Notificación de fuga paciente ${payload.patientName} - ${formatDateDDMMYYYY(payload.recordDate)}`;
    const body = buildFugaNotificationBody(payload);

    const gmailResponse = await sendCensusEmail({
      date: payload.recordDate,
      recipients: resolvedRecipients,
      subject,
      body,
    });

    return buildJsonResponse(
      200,
      {
        success: true,
        message: 'Notificación de fuga enviada correctamente.',
        gmailId: gmailResponse.id || '',
      },
      { requestOrigin }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error enviando notificación de fuga.';
    return buildTextResponse(500, message, { requestOrigin });
  }
};
