import React, { useMemo, useState } from 'react';
import { BaseModal } from '@/components/shared/BaseModal';
import { MailWarning } from 'lucide-react';
import type { DischargeData } from '@/types/domain/movements';
import { sendFugaNotification } from '@/services/integrations/fugaNotificationService';
import { useAuthState } from '@/hooks/useAuthState';

interface FugaNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dischargeItem: DischargeData;
  recordDate: string;
}

const PSYCHIATRY_RECIPIENTS = [
  'angelica.vargas@hospitalhangaroa.cl',
  'mariapaz.ureta@hospitalhangaroa.cl',
] as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const parseEmails = (input: string): string[] =>
  input
    .split(/[;,\n\s]+/)
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

const buildDefaultAutomaticMessage = (input: {
  patientName: string;
  rut: string;
  time: string;
  bedName: string;
  diagnosis: string;
  specialty: string;
  recordDate: string;
}): string =>
  [
    'Estimad@s,',
    '',
    `Se informa fuga del siguiente paciente ${input.patientName} (RUT/ID: ${input.rut}) a las ${input.time}.`,
    '',
    `Cama: ${input.bedName}`,
    `Diagnóstico: ${input.diagnosis}`,
    `Especialidad: ${input.specialty || 'No especificada'}`,
    `Fecha de egreso: ${input.recordDate}`,
    '',
    'Este reporte es automático desde el sistema de censo diario.',
  ].join('\n');

export const FugaNotificationModal: React.FC<FugaNotificationModalProps> = ({
  isOpen,
  onClose,
  dischargeItem,
  recordDate,
}) => {
  const { role } = useAuthState();
  const isAdminUser = role === 'admin';
  const [manualRecipients, setManualRecipients] = useState('');
  const [testMode, setTestMode] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [note, setNote] = useState('');
  const [automaticMessage, setAutomaticMessage] = useState(() =>
    buildDefaultAutomaticMessage({
      patientName: dischargeItem.patientName,
      rut: dischargeItem.rut,
      diagnosis: dischargeItem.diagnosis,
      bedName: dischargeItem.bedName,
      specialty: String(dischargeItem.originalData?.specialty || ''),
      recordDate: dischargeItem.movementDate || recordDate,
      time: dischargeItem.time,
    })
  );
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const specialty = dischargeItem.originalData?.specialty || '';
  const isPsychiatry = useMemo(() => isPsychiatrySpecialty(String(specialty)), [specialty]);

  const resolvedRecipients = useMemo(() => {
    if (isAdminUser && testMode) {
      return testRecipient.trim() ? [testRecipient.trim().toLowerCase()] : [];
    }

    if (isPsychiatry) return [...PSYCHIATRY_RECIPIENTS];
    return parseEmails(manualRecipients);
  }, [isAdminUser, isPsychiatry, manualRecipients, testMode, testRecipient]);

  const hasInvalidEmails = useMemo(
    () => resolvedRecipients.some(email => !EMAIL_REGEX.test(email)),
    [resolvedRecipients]
  );

  React.useEffect(() => {
    setAutomaticMessage(
      buildDefaultAutomaticMessage({
        patientName: dischargeItem.patientName,
        rut: dischargeItem.rut,
        diagnosis: dischargeItem.diagnosis,
        bedName: dischargeItem.bedName,
        specialty: String(specialty || ''),
        recordDate: dischargeItem.movementDate || recordDate,
        time: dischargeItem.time,
      })
    );
    setManualRecipients('');
    setTestMode(false);
    setTestRecipient('');
    setNote('');
    setError(null);
  }, [dischargeItem, recordDate, specialty, isOpen]);

  const handleSend = async () => {
    setError(null);

    if (!automaticMessage.trim()) {
      setError('El mensaje automático es obligatorio.');
      return;
    }

    if (resolvedRecipients.length === 0) {
      setError('Debes ingresar al menos un correo destinatario para enviar la notificación.');
      return;
    }

    if (hasInvalidEmails) {
      setError('Uno o más correos ingresados no son válidos.');
      return;
    }

    if (isAdminUser && testMode && !testRecipient.trim()) {
      setError('Debes ingresar un correo de prueba válido.');
      return;
    }

    const targetLabel = resolvedRecipients.join(', ');
    const isConfirmed = window.confirm(
      `Se enviará la notificación a: ${targetLabel}${isAdminUser && testMode ? ' (modo prueba)' : ''}. ¿Deseas continuar?`
    );

    if (!isConfirmed) {
      return;
    }

    setIsSending(true);

    try {
      await sendFugaNotification({
        patientName: dischargeItem.patientName,
        rut: dischargeItem.rut,
        diagnosis: dischargeItem.diagnosis,
        bedName: dischargeItem.bedName,
        specialty: String(specialty || ''),
        recordDate: dischargeItem.movementDate || recordDate,
        time: dischargeItem.time,
        automaticMessage: automaticMessage.trim(),
        note: note.trim() || undefined,
        recipients: isPsychiatry && !(isAdminUser && testMode) ? undefined : resolvedRecipients,
        testMode: isAdminUser ? testMode : false,
        testRecipient: isAdminUser && testMode ? testRecipient.trim().toLowerCase() : undefined,
      });

      onClose();
      setManualRecipients('');
      setNote('');
      setTestMode(false);
      setTestRecipient('');
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'No se pudo enviar el correo.'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Notificar fuga"
      icon={<MailWarning size={18} />}
      size="lg"
      variant="white"
      bodyClassName="p-4 space-y-4"
    >
      <div className="space-y-3 text-sm text-slate-700">
        <p className="text-xs text-slate-600">
          Revisa y edita el mensaje automático del reporte antes de enviar. La nota complementaria
          es opcional y se agrega al final del correo.
        </p>

        {isAdminUser && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs space-y-2">
            <label className="inline-flex items-center gap-2 text-blue-900 font-semibold">
              <input
                type="checkbox"
                checked={testMode}
                onChange={event => setTestMode(event.target.checked)}
              />
              Modo prueba (admin)
            </label>
            {testMode && (
              <>
                <label className="block">
                  <span className="text-xs font-semibold text-blue-900">Correo de prueba</span>
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={event => setTestRecipient(event.target.value)}
                    placeholder="correo.prueba@hospital.cl"
                    className="mt-1 w-full rounded-lg border border-blue-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </label>
                <p className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 font-semibold text-amber-800">
                  Estás enviando en modo prueba
                </p>
              </>
            )}
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
          <p>
            <span className="font-semibold">Paciente:</span> {dischargeItem.patientName}
          </p>
          <p>
            <span className="font-semibold">RUT/ID:</span> {dischargeItem.rut}
          </p>
          <p>
            <span className="font-semibold">Hora fuga:</span> {dischargeItem.time}
          </p>
          <p>
            <span className="font-semibold">Especialidad:</span>{' '}
            {String(specialty || 'No definida')}
          </p>
        </div>

        {isPsychiatry && !(isAdminUser && testMode) ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs">
            <p className="font-semibold text-emerald-700">Destinatarios predefinidos Psiquiatría</p>
            <ul className="list-disc ml-5 mt-1 text-emerald-800">
              {PSYCHIATRY_RECIPIENTS.map(email => (
                <li key={email}>{email}</li>
              ))}
            </ul>
          </div>
        ) : !(isAdminUser && testMode) ? (
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Correos destinatarios</span>
            <textarea
              value={manualRecipients}
              onChange={event => setManualRecipients(event.target.value)}
              placeholder="ejemplo1@hospital.cl; ejemplo2@hospital.cl"
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="text-xs font-semibold text-slate-700">
            Mensaje automático (editable)
          </span>
          <textarea
            value={automaticMessage}
            onChange={event => setAutomaticMessage(event.target.value)}
            rows={8}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-700">
            Nota complementaria (opcional)
          </span>
          <textarea
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder="Agregar antecedentes clínicos o contextuales..."
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSending ? 'Enviando...' : 'Enviar notificación'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
