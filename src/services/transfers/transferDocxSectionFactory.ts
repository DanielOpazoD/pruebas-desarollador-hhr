import { Paragraph, Table } from 'docx';

export const createTransferDocxSection = (children: (Paragraph | Table)[]) => ({
  properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
  children,
});
