export interface ConflictAuditDetails {
  changedPaths: string[];
  policyVersion: string;
  entryCount: number;
  strategyBreakdown: Record<string, number>;
  winnerBreakdown: Record<string, number>;
  reasonBreakdown: Record<string, number>;
  samplePaths: string[];
}

type ConflictLoggerFn = (date: string, details: ConflictAuditDetails) => Promise<void>;

let customConflictLogger: ConflictLoggerFn | null = null;

export const setRepositoryConflictLogger = (logger: ConflictLoggerFn | null): void => {
  customConflictLogger = logger;
};

export const logRepositoryConflictAutoMerged = async (
  date: string,
  details: ConflictAuditDetails
): Promise<void> => {
  if (customConflictLogger) {
    await customConflictLogger(date, details);
    return;
  }

  const { logConflictAutoMerged } = await import('@/services/admin/auditService');
  await logConflictAutoMerged(date, details);
};
