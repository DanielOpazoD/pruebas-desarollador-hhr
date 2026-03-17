export interface OperationalNotice {
  channel: 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export const createInfoNotice = (title: string, message: string): OperationalNotice => ({
  channel: 'info',
  title,
  message,
});

export const createWarningNotice = (title: string, message: string): OperationalNotice => ({
  channel: 'warning',
  title,
  message,
});

export const createErrorNotice = (title: string, message: string): OperationalNotice => ({
  channel: 'error',
  title,
  message,
});

export const createPassiveVerificationPermissionNotice = (
  artifactLabel: string
): OperationalNotice =>
  createInfoNotice(
    'Respaldo no verificable',
    `No se pudo confirmar ${artifactLabel} por permisos de Storage.`
  );
