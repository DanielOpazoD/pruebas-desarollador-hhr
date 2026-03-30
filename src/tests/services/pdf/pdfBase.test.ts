import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { openPdfPrintDialog } from '@/services/pdf/pdfBase';

describe('pdfBase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf-test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('prints the generated PDF through an iframe once it loads', async () => {
    const originalCreateElement = document.createElement.bind(document);
    const fakeIframe = originalCreateElement('iframe');
    const printSpy = vi.fn();
    const focusSpy = vi.fn();

    Object.defineProperty(fakeIframe, 'contentWindow', {
      configurable: true,
      value: {
        print: printSpy,
        focus: focusSpy,
      },
    });

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) =>
      tagName === 'iframe'
        ? fakeIframe
        : originalCreateElement(tagName)) as typeof document.createElement);

    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage();
    const bytes = await pdfDoc.save();

    await openPdfPrintDialog(bytes as Uint8Array, 'handoff.pdf');
    fakeIframe.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(300);

    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(document.body.contains(fakeIframe)).toBe(true);
  });
});
