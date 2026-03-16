export type BackupCrudFailureStatus =
  | 'not_found'
  | 'unauthenticated'
  | 'permission_denied'
  | 'invalid_input'
  | 'unknown';

export type BackupCrudResult<T> =
  | { status: 'success'; data: T }
  | { status: BackupCrudFailureStatus; data: null; error: unknown };

const PERMISSION_PATTERNS = [
  'permission-denied',
  'missing or insufficient permissions',
  'forbidden',
];

export const resolveBackupCrudStatus = (error: unknown): BackupCrudFailureStatus => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('no autenticado') || message.includes('unauthenticated')) {
      return 'unauthenticated';
    }

    if (PERMISSION_PATTERNS.some(pattern => message.includes(pattern))) {
      return 'permission_denied';
    }

    if (
      message.includes('not found') ||
      message.includes('no encontrado') ||
      message.includes('document data is undefined')
    ) {
      return 'not_found';
    }

    if (message.includes('inval') || message.includes('undefined')) {
      return 'invalid_input';
    }
  }

  return 'unknown';
};

export const createBackupCrudSuccess = <T>(data: T): BackupCrudResult<T> => ({
  status: 'success',
  data,
});

export const createBackupCrudFailure = <T = null>(
  error: unknown,
  status: BackupCrudFailureStatus = resolveBackupCrudStatus(error)
): BackupCrudResult<T> => ({
  status,
  data: null,
  error,
});
