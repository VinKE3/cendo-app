export const PDF_COMPRESSION_THRESHOLD_BYTES = 3 * 1024 * 1024; // 3 MB

export interface CompressPdfOptions {
  maxDimension?: number;
  renderScale?: number;
  jpegQuality?: number;
  onProgress?: (page: number, total: number) => void;
}

export interface CompressPdfResult {
  file: File;
  compressed: boolean;
  originalBytes: number;
  finalBytes: number;
  pageCount: number;
}

/**
 * Optimiza PDFs pesados (ej. placas de ecógrafo VINNO > 3 MB) en el navegador
 * renderizando páginas a JPEG clínico y reensamblándolas con pdf-lib.
 */
export async function compressPdfInBrowser(
  file: File,
  options?: CompressPdfOptions
): Promise<CompressPdfResult> {
  const originalBytes = file.size;
  const maxDimension = options?.maxDimension ?? 1600;
  const renderScale = options?.renderScale ?? 1.5;
  const jpegQuality = options?.jpegQuality ?? 0.8;

  if (typeof window === "undefined") {
    return {
      file,
      compressed: false,
      originalBytes,
      finalBytes: originalBytes,
      pageCount: 0,
    };
  }

  const [{ PDFDocument }, pdfjs] = await Promise.all([
    import("pdf-lib"),
    import("pdfjs-dist"),
  ]);

  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const srcBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(srcBuffer),
    useSystemFonts: true,
  });
  const srcPdf = await loadingTask.promise;
  const pageCount = srcPdf.numPages;

  const outPdf = await PDFDocument.create();

  try {
    for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
      options?.onProgress?.(pageIndex, pageCount);
      const page = await srcPdf.getPage(pageIndex);
      const baseViewport = page.getViewport({ scale: 1 });
      const longestSide = Math.max(baseViewport.width, baseViewport.height) || 1;
      const clampedScale = Math.min(renderScale, maxDimension / longestSide);
      const viewport = page.getViewport({
        scale: Math.max(0.5, clampedScale),
      });

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("No se pudo inicializar el lienzo 2D del navegador.");
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        canvas,
        viewport,
      }).promise;

      const jpegBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", jpegQuality)
      );

      // Liberar memoria de canvas por página
      canvas.width = 0;
      canvas.height = 0;

      if (!jpegBlob) {
        throw new Error(`No se pudo comprimir la página ${pageIndex} del PDF.`);
      }

      const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
      const embedded = await outPdf.embedJpg(jpegBytes);
      const outPage = outPdf.addPage([baseViewport.width, baseViewport.height]);
      outPage.drawImage(embedded, {
        x: 0,
        y: 0,
        width: baseViewport.width,
        height: baseViewport.height,
      });
    }
  } finally {
    await srcPdf.cleanup();
    await loadingTask.destroy();
  }

  const outBytes = await outPdf.save({ useObjectStreams: true });
  if (outBytes.byteLength >= originalBytes) {
    return {
      file,
      compressed: false,
      originalBytes,
      finalBytes: originalBytes,
      pageCount,
    };
  }

  const compressedFile = new File(
    [outBytes.buffer.slice(outBytes.byteOffset, outBytes.byteOffset + outBytes.byteLength) as ArrayBuffer],
    file.name,
    { type: "application/pdf" }
  );

  return {
    file: compressedFile,
    compressed: true,
    originalBytes,
    finalBytes: compressedFile.size,
    pageCount,
  };
}
