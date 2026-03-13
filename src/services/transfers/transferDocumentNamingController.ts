const sanitizeTransferFileNameSegment = (value: string): string =>
  value
    .trim()
    .replace(/[^\p{L}\p{N}._ -]+/gu, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

export const buildTransferDocumentFileName = (
  prefix: string,
  patientName: string,
  extension: string
): string => {
  const safePrefix = sanitizeTransferFileNameSegment(prefix) || 'Documento';
  const safePatientName = sanitizeTransferFileNameSegment(patientName) || 'Paciente';
  const normalizedExtension = extension.startsWith('.') ? extension : `.${extension}`;
  return `${safePrefix}_${safePatientName}${normalizedExtension}`;
};

export const getSuggestedExtension = (suggestedName: string): string => {
  const extension = suggestedName.split('.').pop();
  return extension ? `.${extension}` : '.bin';
};
