type ReminderErrorLike = {
  code?: string;
  message?: string;
};

export type ReminderOperationErrorKind = 'permission_denied' | 'unknown';

const normalizeText = (value: unknown): string => String(value || '').toLowerCase();

export const isReminderPermissionDeniedError = (error: unknown): boolean => {
  const typed = error as ReminderErrorLike;
  const code = normalizeText(typed?.code);
  const message = normalizeText(typed?.message);

  return (
    code.includes('permission-denied') ||
    code.includes('unauthorized') ||
    message.includes('missing or insufficient permissions') ||
    message.includes('permission denied')
  );
};

export const resolveReminderOperationErrorKind = (error: unknown): ReminderOperationErrorKind =>
  isReminderPermissionDeniedError(error) ? 'permission_denied' : 'unknown';

export const resolveReminderAdminErrorMessage = (
  error: unknown,
  options: { operation: 'firestore_write' | 'firestore_read' | 'image_upload' | 'image_delete' }
): string => {
  if (!isReminderPermissionDeniedError(error)) {
    return 'No se pudo completar la operacion de avisos.';
  }

  if (options.operation === 'image_upload') {
    return 'El aviso de texto puede guardarse, pero tu sesion no tiene permiso vigente para subir imagenes.';
  }

  if (options.operation === 'firestore_write') {
    return 'Tu cuenta no tiene permiso vigente para crear o editar avisos. Revisa rules desplegadas o privilegios de jefatura.';
  }

  if (options.operation === 'firestore_read') {
    return 'No fue posible cargar avisos. Revisa rules desplegadas o privilegios vigentes.';
  }

  return 'No fue posible eliminar la imagen del aviso por falta de permisos vigentes.';
};
