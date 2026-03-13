export type HandoffPdfCell =
  | string
  | { content: string; colSpan?: number; styles?: Record<string, unknown> }
  | { content: string; styles: Record<string, unknown> };

export type HandoffPdfTableRow = HandoffPdfCell[] & { _daysStr?: string };

export interface HandoffPdfMovementSummaryTable {
  title: string;
  emptyLabel: string;
  emptyOffsetX: number;
  headers: string[][];
  rows: string[][];
}
