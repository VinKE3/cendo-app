import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import { wordImportCommitItemSchema } from "@/features/documentos/documentos.schema";
import { commitWordImportBatch } from "@/features/documentos/services/word-import.service";
import {
  DomainError,
  getAuthenticatedContext,
} from "@/lib/security/action-guard";
import { uploadLimiter } from "@/lib/security/rate-limit";

const commitPayloadSchema = z
  .object({
    items: z.array(wordImportCommitItemSchema).min(1).max(20),
  })
  .strict();

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
          error: "Solo médicos o administradores pueden confirmar la importación Word.",
        },
        { status: 403 }
      );
    }

    const rate = uploadLimiter.check(`word-commit:${ctx.userId}`);
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
    const rawPayload = String(formData.get("payload") ?? "");
    if (!rawPayload) {
      return NextResponse.json(
        { success: false, error: "Payload de importación vacío." },
        { status: 400 }
      );
    }

    let jsonParsed: unknown;
    try {
      jsonParsed = JSON.parse(rawPayload);
    } catch {
      return NextResponse.json(
        { success: false, error: "JSON de importación inválido." },
        { status: 400 }
      );
    }

    const validated = commitPayloadSchema.safeParse(jsonParsed);
    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            validated.error.issues[0]?.message ||
            "Datos de importación inválidos.",
        },
        { status: 422 }
      );
    }

    const filesByKey = new Map<string, Uint8Array>();
    for (const [fieldKey, val] of formData.entries()) {
      if (fieldKey.startsWith("file:") && val instanceof Blob) {
        const key = fieldKey.slice("file:".length);
        filesByKey.set(key, new Uint8Array(await val.arrayBuffer()));
      }
    }

    const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
    const actorName = actor
      ? `${actor.doctorTitle} ${actor.fullName}`
      : ctx.userId;

    const summary = await commitWordImportBatch(ctx, actorName, {
      items: validated.data.items,
      filesByKey,
    });

    revalidatePath("/pacientes");
    revalidatePath("/dashboard");
    for (const patientRef of summary.affectedPatients) {
      revalidatePath(`/pacientes/${patientRef.id}`);
    }

    return NextResponse.json({ success: true, data: summary }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof DomainError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 400 }
      );
    }
    console.error("[POST /api/word-import/commit Error]:", err);
    return NextResponse.json(
      { success: false, error: "Error guardando lote Word en base de datos." },
      { status: 500 }
    );
  }
}
