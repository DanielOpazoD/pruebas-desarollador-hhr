/**
 * PDF Base Utilities
 *
 * Common functions for PDF manipulation using pdf-lib.
 */
import { PDFDocument, PDFName } from 'pdf-lib';

/**
 * Injects a JavaScript auto-print action into the PDF catalog.
 */
export const injectPrintScript = (pdfDoc: PDFDocument): void => {
  pdfDoc.catalog.set(
    PDFName.of('OpenAction'),
    pdfDoc.context.obj({
      Type: 'Action',
      S: 'JavaScript',
      JS: 'this.print({bUI: true, bSilent: false, bShrinkToFit: true});',
    })
  );
};

/**
 * Saves and triggers a browser download for a PDF document.
 * Supports File System Access API (Save As) with fallback.
 */
export const saveAndDownloadPdf = async (
  pdfSource: PDFDocument | Uint8Array,
  suggestedName: string
): Promise<void> => {
  const pdfBytes: Uint8Array =
    pdfSource instanceof PDFDocument ? await pdfSource.save() : pdfSource;

  // Try native Save As dialog
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (
        window as unknown as {
          showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle>;
        }
      ).showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: 'PDF Document',
            accept: { 'application/pdf': ['.pdf'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(pdfBytes as unknown as BufferSource);
      await writable.close();
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }

  // Fallback: classic download link
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Opens the browser print dialog for a generated PDF without forcing a file download.
 */
export const openPdfPrintDialog = async (
  pdfSource: PDFDocument | Uint8Array,
  fallbackName: string
): Promise<void> => {
  const pdfBytes: Uint8Array =
    pdfSource instanceof PDFDocument ? await pdfSource.save() : pdfSource;

  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');

  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
      URL.revokeObjectURL(url);
    }, 1000);
  };

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanup();
      void saveAndDownloadPdf(pdfBytes, fallbackName);
      return;
    }

    const afterPrintListener = () => cleanup();
    frameWindow.addEventListener('afterprint', afterPrintListener, { once: true });

    window.setTimeout(() => {
      frameWindow.focus();
      frameWindow.print();
    }, 150);

    window.setTimeout(cleanup, 60000);
  };

  iframe.src = url;
  document.body.appendChild(iframe);
};
