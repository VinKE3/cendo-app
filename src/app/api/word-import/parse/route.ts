import { NextResponse } from "next/server";
import { MAX_WORD_IMPORT_BATCH_FILES } from "@/features/documentos/documentos.schema";
import { parseWordBatchForPreview } from "@/features/documentos/services/word-import.service";
import {
  DomainError,
  getAuthenticatedContext,
} from "@/lib/security/action-guard";
import { uploadLimiter } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx || !ctx.tenantId) {
      return NextResponse.json(
        { success: false, error: "Sesión inválida o expirada." },
        { status: 401 }
      );
    }

    if (ctx.role !== "admin" && ctx.role !== "moderator") {
      return NextResponse.json(
        {
          success: false,
          error: "Solo usuarios con rol médico o administrador pueden importar Word.",
        },
        { status: 403 }
      );
    }

    const rate = uploadLimiter.check(`word-parse:${ctx.userId}`);
    if (!rate.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`,
        },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const fileEntries = formData.getAll("files");
    const keyEntries = formData.getAll("fileKeys").map((v) => String(v));
    const yearEntries = formData.getAll("years").map((v) => Number(v));

    if (fileEntries.length === 0) {
      return NextResponse.json(
        { success: false, error: "Adjunte uno o más archivos .docx." },
        { status: 400 }
      );
    }

    if (fileEntries.length > MAX_WORD_IMPORT_BATCH_FILES) {
      return NextResponse.json(
        {
          success: false,
          error: `Máximo ${MAX_WORD_IMPORT_BATCH_FILES} archivos .docx por lote.`,
        },
        { status: 400 }
      );
    }

    const parsedFiles = await Promise.all(
      fileEntries.map(async (item, idx) => {
        if (!(item instanceof Blob)) {
          throw new DomainError("Uno de los elementos adjuntos no es válido.");
        }
        const fileName =
          "name" in item && typeof item.name === "string" && item.name.trim()
            ? item.name.trim()
            : `archivo-${idx + 1}.docx`;
        const bytes = new Uint8Array(await item.arrayBuffer());
        const yearVal = yearEntries[idx];
        return {
          fileKey: keyEntries[idx]?.trim() || `file-${idx}`,
          fileName,
          fileSize: item.size,
          lastModifiedYear:
            Number.isFinite(yearVal) && yearVal >= 2000 && yearVal <= 2100
              ? yearVal
              : undefined,
          bytes,
        };
      })
    );

    const preview = await parseWordBatchForPreview(ctx.tenantId, parsedFiles);
    return NextResponse.json({ success: true, data: preview }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof DomainError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 400 }
      );
    }
    console.error("[POST /api/word-import/parse Error]:", err);
    return NextResponse.json(
      { success: false, error: "Error analizando archivos Word (.docx)." },
      { status: 500 }
    );
  }
}
