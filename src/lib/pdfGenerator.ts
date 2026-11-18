import { PDFDocument } from "pdf-lib";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Combina múltiples archivos PDF (Uint8Array / ArrayBuffer) en un único PDF A4 listo para descargar o imprimir.
 */
export async function mergePdfDocuments(pdfBuffers: Array<Uint8Array | ArrayBuffer>): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    const srcPdf = await PDFDocument.load(buffer);
    const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  return mergedPdf.save();
}

/**
 * Descarga un arreglo de bytes PDF en el navegador con el nombre indicado.
 */
export function downloadPdfBlob(pdfBytes: Uint8Array, filename: string): void {
  const safeBytes = new Uint8Array(pdfBytes);
  const blob = new Blob([safeBytes.buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Convierte un File o Blob a Uint8Array para procesarlo con pdf-lib.
 */
export async function readFileAsUint8Array(file: Blob): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Abre una ventana de impresión A4 limpia para el elemento HTML indicado,
 * preservando hojas con salto de página calibrado (.page-sheet) y forzando modo claro para impresión.
 */
export function printHtmlElement(elementId: string, documentTitle = "Informe CENDO"): boolean {
  const sourceElement = document.getElementById(elementId);
  if (!sourceElement) return false;

  const printWindow = window.open("", "_blank", "width=1024,height=768");
  if (!printWindow) return false;

  const styleNodes = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join("\n");

  const safeTitle = escapeHtml(documentTitle);

  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html>
<html lang="es" class="light" style="color-scheme: light;">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    ${styleNodes}
    <style>
      :root, html, body {
        color-scheme: light !important;
        --background: #ffffff !important;
        --foreground: #0b1b24 !important;
        --card: #ffffff !important;
        --card-foreground: #0b1b24 !important;
        --primary: #064059 !important;
        --primary-foreground: #ffffff !important;
        --warning: #eba419 !important;
        --border: #d5e0e5 !important;
        --muted-foreground: #526875 !important;
      }
      @page {
        size: A4 portrait;
        margin: 0;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .no-print {
          display: none !important;
        }
        .page-sheet {
          width: 210mm !important;
          min-height: 297mm !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
          page-break-after: always !important;
          break-after: page !important;
        }
        .page-sheet:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
      }
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #0b1b24;
      }
    </style>
  </head>
  <body>
    <div id="print-root">${sourceElement.innerHTML}</div>
  </body>
</html>`);
  printWindow.document.close();

  let hasPrinted = false;
  const triggerPrint = () => {
    if (hasPrinted) return;
    hasPrinted = true;
    printWindow.focus();
    printWindow.print();
  };

  printWindow.onload = () => {
    setTimeout(triggerPrint, 250);
  };
  setTimeout(triggerPrint, 900);

  return true;
}
