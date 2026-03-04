export interface BackupImportSummary {
  success: number;
  failed: number;
  repaired: number;
  outcome: 'clean' | 'repaired' | 'partial' | 'blocked';
}

export const summarizeBackupImportOutcome = (result: BackupImportSummary): string => {
  if (result.outcome === 'clean') {
    return `Se han restaurado ${result.success} registros correctamente.`;
  }
  if (result.outcome === 'repaired') {
    return `Se restauraron ${result.success} registros. ${result.repaired} requirieron reparación automática.`;
  }
  if (result.outcome === 'partial') {
    return `Se restauraron ${result.success} registros, ${result.failed} fallaron y ${result.repaired} requirieron reparación.`;
  }
  return 'No fue posible restaurar registros desde el respaldo.';
};
