import { NextResponse } from "next/server";
import {
  deleteWordHistorySchema,
  listWordHistoriesSchema,
  viewWordHistorySchema,
} from "@/features/documentos/documentos.schema";
import {
  getWordHistoryBinary,
  listWordHistoriesByPatient,
  softDeleteWordHistoryDocument,
} from "@/features/documentos/services/documentos.service";
import {
  DomainError,
  getAuthenticatedContext,
} from "@/lib/security/action-guard";
import { handleGuardedApi } from "@/lib/security/api-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function GET(request: Request) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx || !ctx.tenantId) {
      return NextResponse.json(
        { success: false, error: "Sesión inválida o expirada." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawId = searchParams.get("id")?.trim();
    const rawPatientId = searchParams.get("patientId")?.trim();

    if (rawId) {
      const parsedId = viewWordHistorySchema.safeParse({ id: rawId });
      if (!parsedId.success) {
        return NextResponse.json(
          { success: false, error: "ID de documento Word inválido." },
          { status: 400 }
        );
      }

      const file = await getWordHistoryBinary(ctx.tenantId, parsedId.data.id);
      if (!file) {
        return NextResponse.json(
          { success: false, error: "Historia Word no encontrada." },
          { status: 404 }
        );
      }

      return new NextResponse(file.buffer, {
        status: 200,
        headers: {
          "Content-Type": DOCX_MIME,
          "Content-Disposition": `attachment; filename="${file.fileName}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const parsedPatient = listWordHistoriesSchema.safeParse({
      patientId: rawPatientId ?? "",
    });
    if (!parsedPatient.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Indique patientId o id de documento Word válido.",
        },
        { status: 400 }
      );
    }

    const items = await listWordHistoriesByPatient(
      ctx.tenantId,
      parsedPatient.data.patientId
    );
    return NextResponse.json({ success: true, data: items }, { status: 200 });
  } catch (err: unknown) {
    console.error("[GET /api/word-histories Error]:", err);
    return NextResponse.json(
      { success: false, error: "Error interno al obtener historia Word." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryId = searchParams.get("id")?.trim();

  return handleGuardedApi({
    requiredRole: "moderator",
    handler: async ({ ctx, actorName }) => {
      const rate = mutationLimiter.check(`wdoc-del:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }

      let rawPayload: unknown = queryId ? { id: queryId } : undefined;
      if (!rawPayload) {
        try {
          rawPayload = await request.json();
        } catch {
          throw new DomainError("Debe indicar el identificador del archivo Word.");
        }
      }

      const parsed = deleteWordHistorySchema.parse(rawPayload);
      return softDeleteWordHistoryDocument(ctx, actorName, parsed.id);
    },
  });
}
