import { describe, expect, it } from 'vitest';
import { Document, Table } from 'docx';

import { createTransferDocxSection } from '@/services/transfers/transferDocxSectionFactory';
import {
  createTransferDocxTable,
  createTransferTableRows,
} from '@/services/transfers/transferDocxTableController';
import {
  getQuestionnaireResponseText,
  normalizeQuestionnaireResponseValue,
} from '@/services/transfers/transferQuestionnaireResponseController';
import { populateTransferIaasWorkbook } from '@/services/transfers/transferIaasWorkbookController';

describe('transfer docx controllers', () => {
  it('normaliza respuestas de cuestionario', () => {
    expect(normalizeQuestionnaireResponseValue(true)).toBe('SÍ');
    expect(normalizeQuestionnaireResponseValue(['A', 'B'])).toBe('A, B');
    expect(normalizeQuestionnaireResponseValue(7)).toBe('7');
  });

  it('obtiene texto de una respuesta por questionId', () => {
    const responses = {
      responses: [{ questionId: 'q1', value: 'Valor' }],
    } as never;
    expect(getQuestionnaireResponseText(responses, 'q1')).toBe('Valor');
    expect(getQuestionnaireResponseText(responses, 'q2')).toBe('');
  });

  it('crea filas y tabla docx estandar', () => {
    const rows = createTransferTableRows([
      ['Nombre', 'Juan'],
      ['Rut', '1-9'],
    ]);
    expect(rows).toHaveLength(2);
    const table = createTransferDocxTable([
      ['Nombre', 'Juan'],
      ['Rut', '1-9'],
    ]);
    expect(table).toBeInstanceOf(Table);
  });

  it('crea una seccion docx con margenes estandar', () => {
    const section = createTransferDocxSection([]);
    expect(section.properties.page.margin.top).toBe(720);
    const doc = new Document({ sections: [section] });
    expect(doc).toBeInstanceOf(Document);
  });

  it('puebla el workbook IAAS con hoja y datos esperados', () => {
    const rows: unknown[][] = [];
    const workbook = {
      addWorksheet: () => ({
        getColumn: () => ({ width: 0 }),
        mergeCells: () => undefined,
        getCell: () => ({ value: '', font: {}, fill: {}, alignment: {} }),
        addRow: (row: unknown[]) => {
          rows.push(row);
          return { getCell: () => ({ font: {} }) };
        },
      }),
    } as never;

    populateTransferIaasWorkbook(
      workbook,
      { patientName: 'Juan', rut: '1-9' } as never,
      {
        responses: [{ questionId: 'tipoPrecauciones', value: 'Contacto' }],
      } as never
    );

    expect(rows[0]).toEqual(['Nombre:', 'Juan']);
    expect(rows[1]).toEqual(['Rut:', '1-9']);
    expect(rows[2]).toEqual(['Precauciones:', 'Contacto']);
  });
});
