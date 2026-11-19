const ALLOWED_BROWSER_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_SOURCE_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

export interface CompressedClinicalImageResult {
  blob: Blob;
  filename: string;
  originalKb: number;
  compressedKb: number;
}

/**
 * Optimiza capturas de ecografía o colposcopía en el navegador antes de subirlas
 * al bucket privado, manteniendo alta nitidez diagnóstica (~150-250 KB en JPEG).
 */
export async function compressClinicalImageFile(
  file: File,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  }
): Promise<CompressedClinicalImageResult> {
  if (!ALLOWED_BROWSER_IMAGE_TYPES.has(file.type)) {
    throw new Error(
      `Formato no permitido para "${file.name}". Use imágenes JPG, PNG o WebP.`
    );
  }

  if (file.size <= 0 || file.size > MAX_SOURCE_FILE_BYTES) {
    throw new Error(
      `El archivo "${file.name}" supera el límite de 15 MB o está vacío.`
    );
  }

  const maxWidth = options?.maxWidth ?? 1280;
  const maxHeight = options?.maxHeight ?? 960;
  const quality = options?.quality ?? 0.84;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(new Error(`No se pudo decodificar la imagen "${file.name}".`));
      element.src = objectUrl;
    });

    const ratio = Math.min(
      1,
      maxWidth / Math.max(1, img.naturalWidth),
      maxHeight / Math.max(1, img.naturalHeight)
    );
    const targetWidth = Math.max(1, Math.round(img.naturalWidth * ratio));
    const targetHeight = Math.max(1, Math.round(img.naturalHeight * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("El navegador no soporta compresión Canvas 2D.");
    }

    // Fondo blanco limpio para PNGs con canal alfa al convertir a JPEG
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((res) => resolve(res), "image/jpeg", quality)
    );

    if (!blob) {
      throw new Error(`Error generando JPEG optimizado para "${file.name}".`);
    }

    const cleanBase =
      file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "_") ||
      "captura";

    return {
      blob,
      filename: `${cleanBase}.jpg`,
      originalKb: Math.max(1, Math.round(file.size / 1024)),
      compressedKb: Math.max(1, Math.round(blob.size / 1024)),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
