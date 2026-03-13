import { Table, WidthType, type TableRow } from 'docx';

import { createTableRow } from './documentGeneratorUtils';

export type TransferTableRowInput = readonly [label: string, value: string];

export const createTransferTableRows = (rows: TransferTableRowInput[]): TableRow[] =>
  rows.map(([label, value]) => createTableRow(label, value));

export const createTransferDocxTable = (rows: TransferTableRowInput[]): Table =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: createTransferTableRows(rows),
  });
