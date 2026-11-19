import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { db } from "@/db";
import { clinicalAuditLogs, profiles } from "@/db/schema";
import { uploadPrivateStorageObject } from "@/lib/supabase/storage";

const SOURCE_PDF_PATH = "C:/Users/kejem/Downloads/informe/informe.pdf";
const SCRATCH_DIR =
  "C:/Users/kejem/.gemini/antigravity/brain/8e95056c-acd9-4a3d-b33e-0c609ccfae9e/scratch";
const RAW_JPG_PATH = path.join(SCRATCH_DIR, "dr-patrick-raw.jpg");
const PREVIEW_PNG_PATH = path.join(SCRATCH_DIR, "dr-patrick-signature-preview.png");

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const DR_PATRICK_ID = "a0000000-0000-0000-0000-000000000001";
const STORAGE_PATH = `signatures/${TENANT_ID}/${DR_PATRICK_ID}.png`;

function hasPngMagicBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function buildTransparentPngScript(inputPath: string, outputPath: string): string {
  const escapedIn = inputPath.replaceAll("'", "''");
  const escapedOut = outputPath.replaceAll("'", "''");

  return `
$csharp = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;

public static class SignatureCleaner {
  public static void ConvertToTransparentPng(string inputPath, string outputPath) {
    using (var src = new Bitmap(inputPath)) {
      int w = src.Width;
      int h = src.Height;
      using (var argb = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
        int minX = w, minY = h, maxX = -1, maxY = -1;

        for (int y = 0; y < h; y++) {
          for (int x = 0; x < w; x++) {
            Color c = src.GetPixel(x, y);
            double lum = 0.299 * c.R + 0.587 * c.G + 0.114 * c.B;
            int maxC = Math.Max(c.R, Math.Max(c.G, c.B));
            int minC = Math.Min(c.R, Math.Min(c.G, c.B));
            int chroma = maxC - minC;

            int alpha;
            int outR = c.R;
            int outG = c.G;
            int outB = c.B;

            if (lum >= 238.0 && chroma <= 18) {
              alpha = 0;
            } else if (lum >= 195.0 && chroma <= 32) {
              double aNorm = (238.0 - lum) / (238.0 - 195.0);
              aNorm = Math.Max(0.0, Math.Min(1.0, aNorm));
              alpha = (int)Math.Round(aNorm * 255.0);
              double denom = Math.Max(0.22, aNorm);
              outR = Math.Max(0, Math.Min(255, (int)Math.Round((c.R - 255.0 * (1.0 - aNorm)) / denom * 0.90)));
              outG = Math.Max(0, Math.Min(255, (int)Math.Round((c.G - 255.0 * (1.0 - aNorm)) / denom * 0.90)));
              outB = Math.Max(0, Math.Min(255, (int)Math.Round((c.B - 255.0 * (1.0 - aNorm)) / denom * 0.95)));
            } else {
              alpha = 255;
            }

            argb.SetPixel(x, y, Color.FromArgb(alpha, outR, outG, outB));
            if (alpha > 8) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX < minX || maxY < minY) {
          throw new InvalidOperationException("No ink pixels detected in extracted signature.");
        }

        int pad = 8;
        int cropX = Math.Max(0, minX - pad);
        int cropY = Math.Max(0, minY - pad);
        int cropW = Math.Min(w - cropX, (maxX - minX + 1) + pad * 2);
        int cropH = Math.Min(h - cropY, (maxY - minY + 1) + pad * 2);

        using (var cropped = new Bitmap(cropW, cropH, PixelFormat.Format32bppArgb))
        using (var g = Graphics.FromImage(cropped)) {
          g.Clear(Color.Transparent);
          g.DrawImage(argb, new Rectangle(0, 0, cropW, cropH), new Rectangle(cropX, cropY, cropW, cropH), GraphicsUnit.Pixel);
          cropped.Save(outputPath, ImageFormat.Png);
        }
      }
    }
  }
}
"@
Add-Type -TypeDefinition $csharp -ReferencedAssemblies System.Drawing
[SignatureCleaner]::ConvertToTransparentPng('${escapedIn}', '${escapedOut}')
`;
}

async function main() {
  if (!fs.existsSync(SOURCE_PDF_PATH)) {
    throw new Error(`No se encontró el PDF fuente: ${SOURCE_PDF_PATH}`);
  }

  fs.mkdirSync(SCRATCH_DIR, { recursive: true });

  const pdfBytes = fs.readFileSync(SOURCE_PDF_PATH);
  const pdf = await PDFDocument.load(pdfBytes);

  let signatureJpgBytes: Uint8Array | null = null;
  let matchedRef = "";

  for (const [ref, obj] of pdf.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream) {
      const subtype = obj.dict.get(PDFName.of("Subtype"))?.toString();
      const width = obj.dict.get(PDFName.of("Width"))?.toString();
      const height = obj.dict.get(PDFName.of("Height"))?.toString();
      const filter = obj.dict.get(PDFName.of("Filter"))?.toString();

      if (
        subtype === "/Image" &&
        width === "191" &&
        height === "222" &&
        filter === "/DCTDecode"
      ) {
        signatureJpgBytes = obj.contents;
        matchedRef = ref.toString();
        break;
      }
    }
  }

  if (!signatureJpgBytes || signatureJpgBytes.length === 0) {
    throw new Error(
      "No se encontró el XObject JPEG 191x222 de la firma en informe.pdf."
    );
  }

  fs.writeFileSync(RAW_JPG_PATH, signatureJpgBytes);
  console.log(
    `Extraída imagen JPEG nativa (${matchedRef}, ${signatureJpgBytes.length} bytes) -> ${RAW_JPG_PATH}`
  );

  const psCommand = buildTransparentPngScript(RAW_JPG_PATH, PREVIEW_PNG_PATH);
  execFileSync("powershell.exe", ["-NoProfile", "-Command", psCommand], {
    stdio: "inherit",
  });

  const pngBytes = new Uint8Array(fs.readFileSync(PREVIEW_PNG_PATH));
  if (!hasPngMagicBytes(pngBytes)) {
    throw new Error("El archivo generado no tiene cabecera PNG válida.");
  }
  console.log(
    `PNG transparente generado (${pngBytes.byteLength} bytes) -> ${PREVIEW_PNG_PATH}`
  );

  await uploadPrivateStorageObject({
    bucket: "clinical-images",
    path: STORAGE_PATH,
    body: pngBytes,
    contentType: "image/png",
  });
  console.log(`Firma subida a Supabase Storage privado: clinical-images/${STORAGE_PATH}`);

  const [updated] = await db
    .update(profiles)
    .set({
      signatureUrl: STORAGE_PATH,
      showSignatureByDefault: true,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, DR_PATRICK_ID))
    .returning({
      id: profiles.id,
      fullName: profiles.fullName,
      signatureUrl: profiles.signatureUrl,
      showSignatureByDefault: profiles.showSignatureByDefault,
    });

  if (!updated) {
    throw new Error(`No se encontró el perfil del Dr. Patrick (${DR_PATRICK_ID}) en PostgreSQL.`);
  }

  await db.insert(clinicalAuditLogs).values({
    tenantId: TENANT_ID,
    actorId: DR_PATRICK_ID,
    actorName: "Dr. Patrick José Jacinto Gomero",
    actorRole: "admin",
    action: "UPDATE",
    entityType: "profile_signature",
    entityId: DR_PATRICK_ID,
    changesSummary: {
      source: "informe.pdf",
      pdfObjectRef: matchedRef,
      storageBucket: "clinical-images",
      storagePath: STORAGE_PATH,
      byteLength: pngBytes.byteLength,
      showSignatureByDefault: true,
    },
    ipAddress: "127.0.0.1",
  });

  console.log("Perfil actualizado y auditado en PostgreSQL:", updated);
  process.exit(0);
}

main().catch((err) => {
  console.error("[extract-dr-patrick-signature] Error:", err);
  process.exit(1);
});
