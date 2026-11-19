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

export type PrintPaperFormat = "A4" | "A5";

/**
 * Abre una ventana de impresión A4/A5 limpia para el elemento HTML indicado,
 * preservando hojas con salto de página calibrado (.page-sheet) y forzando modo claro para impresión.
 */
export function printHtmlElement(
  elementId: string,
  documentTitle = "Informe CENDO",
  options?: { paperFormat?: PrintPaperFormat }
): boolean {
  const sourceElement = document.getElementById(elementId);
  if (!sourceElement) return false;

  const printWindow = window.open("", "_blank", "width=1024,height=768");
  if (!printWindow) return false;

  const format: PrintPaperFormat = options?.paperFormat ?? "A4";
  const pageSize = format === "A5" ? "A5 portrait" : "A4 portrait";
  const sheetWidth = format === "A5" ? "148mm" : "210mm";
  const sheetMinHeight = format === "A5" ? "210mm" : "297mm";

  const styleNodes = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join("\n");

  const safeTitle = escapeHtml(documentTitle);
  const baseHref = escapeHtml(`${window.location.origin}/`);
  const rootFontClasses = document.documentElement.className
    .split(/\s+/)
    .filter((cls) => cls && cls !== "dark" && cls !== "light");
  const safeHtmlClasses = escapeHtml(["light", ...rootFontClasses].join(" "));

  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html>
<html lang="es" class="${safeHtmlClasses}" style="color-scheme: light;">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <base href="${baseHref}" />
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
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #0b1b24;
        font-family: var(--font-inter), "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif !important;
      }
      .font-serif {
        font-family: var(--font-lora), "Lora", Georgia, serif !important;
      }
      .font-mono {
        font-family: var(--font-jetbrains-mono), "JetBrains Mono", ui-monospace, monospace !important;
      }
      @page {
        size: ${pageSize};
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
          width: ${sheetWidth} !important;
          min-height: ${sheetMinHeight} !important;
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
    </style>
  </head>
  <body>
    <div id="print-root">${sourceElement.innerHTML}</div>
  </body>
</html>`);
  let hasPrinted = false;
  const triggerPrint = () => {
    if (hasPrinted) return;
    hasPrinted = true;
    printWindow.focus();
    printWindow.print();
  };

  const waitForImagesAndPrint = async () => {
    const images = Array.from(printWindow.document.images);
    if (images.length > 0) {
      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              const finish = () => {
                if (typeof img.decode === "function") {
                  img
                    .decode()
                    .catch(() => undefined)
                    .finally(resolve);
                } else {
                  resolve();
                }
              };
              if (img.complete) {
                finish();
              } else {
                img.addEventListener("load", finish, { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
              }
            })
        )
      );
    }
    setTimeout(triggerPrint, 120);
  };

  printWindow.onload = () => {
    void waitForImagesAndPrint();
  };

  printWindow.document.close();
  if (printWindow.document.readyState === "complete") {
    void waitForImagesAndPrint();
  }
  setTimeout(triggerPrint, 2500);

  return true;
}
