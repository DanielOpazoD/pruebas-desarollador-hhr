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

  it('reuses a pre-opened window to avoid popup blockers', async () => {
    const reservedWindow = {
      location: { href: '' },
      focus: vi.fn(),
      print: vi.fn(),
    } as unknown as Window;
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage();
    const bytes = await pdfDoc.save();

    await openPdfPrintDialog(bytes as Uint8Array, 'handoff.pdf', reservedWindow);
    await vi.advanceTimersByTimeAsync(500);

    expect(reservedWindow.location.href).toBe('blob:pdf-test');
    expect(reservedWindow.focus).toHaveBeenCalledTimes(1);
    expect(reservedWindow.print).toHaveBeenCalledTimes(1);
  });

  it('falls back to popup when iframe print access is blocked by browser security', async () => {
    const originalCreateElement = document.createElement.bind(document);
    const fakeIframe = originalCreateElement('iframe');
    const popupFocus = vi.fn();
    const openSpy = vi
      .spyOn(window, 'open')
      .mockReturnValue({ focus: popupFocus } as unknown as Window);

    Object.defineProperty(fakeIframe, 'contentWindow', {
      configurable: true,
      value: {},
    });

    Object.defineProperty(fakeIframe.contentWindow, 'print', {
      configurable: true,
      get: () => {
        throw new DOMException(
          'Blocked a frame with origin from accessing a cross-origin frame.',
          'SecurityError'
        );
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

    expect(openSpy).toHaveBeenCalledWith('blob:pdf-test', '_blank');
  });
});
