import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openClinicalDocumentBrowserPrintPreview } from '@/features/clinical-documents/services/clinicalDocumentBrowserPrintService';
import {
  CLINICAL_DOCUMENT_INLINE_PRINT_ROOT_ID,
  CLINICAL_DOCUMENT_INLINE_PRINT_STYLE_ID,
  CLINICAL_DOCUMENT_SHEET_ID,
} from '@/features/clinical-documents/services/clinicalDocumentPrintSupport';

const sanitizeSheetCloneMock = vi.fn();
const getClinicalDocumentDefinitionMock = vi.fn();

vi.mock('@/features/clinical-documents/services/clinicalDocumentPrintSupport', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/clinical-documents/services/clinicalDocumentPrintSupport')
  >('@/features/clinical-documents/services/clinicalDocumentPrintSupport');
  return {
    ...actual,
    sanitizeClinicalDocumentSheetClone: (...args: unknown[]) => sanitizeSheetCloneMock(...args),
  };
});

vi.mock('@/features/clinical-documents/domain/definitions', () => ({
  getClinicalDocumentDefinition: (...args: unknown[]) => getClinicalDocumentDefinitionMock(...args),
}));

describe('clinicalDocumentBrowserPrintService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.head.innerHTML = '<title>Workspace</title>';
    document.body.className = '';
    document.body.innerHTML = '';
    getClinicalDocumentDefinitionMock.mockReturnValue({
      printOptions: { pageSize: 'letter', pageMarginMm: 8 },
    });
    sanitizeSheetCloneMock.mockResolvedValue(undefined);
  });

  it('returns false when the sheet is missing', async () => {
    await expect(openClinicalDocumentBrowserPrintPreview('Epicrisis')).resolves.toBe(false);
  });

  it('creates inline print markup, invokes print, and cleans up after print', async () => {
    vi.useFakeTimers();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    document.body.innerHTML = `<section id="${CLINICAL_DOCUMENT_SHEET_ID}"><div>Contenido</div></section>`;

    const opened = await openClinicalDocumentBrowserPrintPreview('Epicrisis médica');

    expect(opened).toBe(true);
    expect(sanitizeSheetCloneMock).toHaveBeenCalled();
    expect(document.title).toBe('Epicrisis médica');
    expect(document.body.classList.contains('clinical-document-inline-print-mode')).toBe(true);
    expect(document.getElementById(CLINICAL_DOCUMENT_INLINE_PRINT_ROOT_ID)).not.toBeNull();
    expect(document.getElementById(CLINICAL_DOCUMENT_INLINE_PRINT_STYLE_ID)?.textContent).toContain(
      '@page { size: letter; margin: 8mm; }'
    );

    await vi.advanceTimersByTimeAsync(100);
    expect(printSpy).toHaveBeenCalled();

    window.dispatchEvent(new Event('afterprint'));
    expect(document.body.classList.contains('clinical-document-inline-print-mode')).toBe(false);
    expect(document.getElementById(CLINICAL_DOCUMENT_INLINE_PRINT_ROOT_ID)).toBeNull();
    expect(document.getElementById(CLINICAL_DOCUMENT_INLINE_PRINT_STYLE_ID)).toBeNull();
    expect(document.title).toBe('Workspace');
    vi.useRealTimers();
  });
});
