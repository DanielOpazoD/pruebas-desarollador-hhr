import { describe, it, expect, vi } from 'vitest';
import type { Worksheet } from 'exceljs';
import {
  createWorkbook,
  workbookToBuffer,
  autoFitColumns,
  BORDER_THIN,
  HEADER_FILL,
} from '@/services/exporters/excelUtils';

// Mock ExcelJS
vi.mock('exceljs', () => ({
  Workbook: class MockWorkbook {
    xlsx = { writeBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)) };
  },
}));

vi.mock('exceljs/dist/exceljs.min.js', () => ({
  Workbook: class MockWorkbook {
    xlsx = { writeBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100)) };
  },
}));

describe('excelUtils', () => {
  type WorksheetColumnLike = { values: unknown[] | null; width: number };
  type WorksheetLike = { columns: WorksheetColumnLike[] };

  const asWorksheet = (value: WorksheetLike): Worksheet => value as unknown as Worksheet;

  describe('createWorkbook', () => {
    it('should create a new workbook', async () => {
      const workbook = await createWorkbook();
      expect(workbook).toBeDefined();
    });
  });

  describe('workbookToBuffer', () => {
    it('should convert workbook to buffer', async () => {
      const workbook = await createWorkbook();
      const buffer = await workbookToBuffer(workbook);
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('autoFitColumns', () => {
    it('should auto-fit columns', () => {
      const mockWorksheet = {
        columns: [
          { values: ['Header', 'Short', 'LongerValue'], width: 0 },
          { values: ['H2', 'V1', 'V2'], width: 0 },
          { values: null, width: 0 },
        ],
      };

      autoFitColumns(asWorksheet(mockWorksheet));

      // First column with values should have been fitted
      expect(mockWorksheet.columns[0].width).toBeGreaterThan(0);
      // Empty column should have default width
      expect(mockWorksheet.columns[2].width).toBe(10);
    });

    it('should respect min and max width', () => {
      const mockWorksheet = {
        columns: [{ values: ['VeryLongColumnHeaderThatExceedsMax' + 'X'.repeat(100)], width: 0 }],
      };

      autoFitColumns(asWorksheet(mockWorksheet), 10, 50);

      // Should not exceed maxWidth
      expect(mockWorksheet.columns[0].width).toBeLessThanOrEqual(50);
    });
  });

  describe('constants', () => {
    it('should export BORDER_THIN constant', () => {
      expect(BORDER_THIN).toBeDefined();
      expect(BORDER_THIN.top.style).toBe('thin');
    });

    it('should export HEADER_FILL constant', () => {
      expect(HEADER_FILL).toBeDefined();
      expect(HEADER_FILL.type).toBe('pattern');
    });
  });
});
