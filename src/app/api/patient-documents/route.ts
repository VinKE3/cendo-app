import { NextResponse } from "next/server";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import {
  createPatientDocumentMetaSchema,
  deletePatientDocumentSchema,
  isPdfMagicBytes,
  listPatientDocumentsSchema,
  MAX_PATIENT_PDF_BYTES,
  viewPatientDocumentSchema,
} from "@/features/documentos/documentos.schema";
import {
  getPatientDocumentBinary,
  listPatientDocumentsByPatient,
  softDeletePatientDocument,
  uploadPatientDocument,
} from "@/features/documentos/services/documentos.service";
import {
  DomainError,
  getAuthenticatedContext,
} from "@/lib/security/action-guard";
import { handleGuardedApi } from "@/lib/security/api-guard";
import { mutationLimiter, uploadLimiter } from "@/lib/security/rate-limit";

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
    const download = searchParams.get("download") === "1";

    if (rawId) {
      const parsedId = viewPatientDocumentSchema.safeParse({ id: rawId });
      if (!parsedId.success) {
        return NextResponse.json(
          { success: false, error: "ID de documento PDF inválido." },
          { status: 400 }
        );
      }

      const doc = await getPatientDocumentBinary(ctx.tenantId, parsedId.data.id);
      if (!doc) {
        return NextResponse.json(
          { success: false, error: "Documento PDF no encontrado." },
          { status: 404 }
        );
      }

      return new NextResponse(doc.buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${doc.fileName}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const parsedPatient = listPatientDocumentsSchema.safeParse({
      patientId: rawPatientId ?? "",
    });
    if (!parsedPatient.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Debe indicar el parámetro patientId o id de documento válido.",
        },
        { status: 400 }
      );
    }

    const items = await listPatientDocumentsByPatient(
      ctx.tenantId,
      parsedPatient.data.patientId
    );
    return NextResponse.json({ success: true, data: items }, { status: 200 });
  } catch (err: unknown) {
    console.error("[GET /api/patient-documents Error]:", err);
    return NextResponse.json(
      { success: false, error: "Error interno al obtener documento clínico." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx || !ctx.tenantId) {
      return NextResponse.json(
        { success: false, error: "Sesión inválida o expirada." },
        { status: 401 }
      );
    }

    const rate = uploadLimiter.check(`pdoc:${ctx.userId}`);
    if (!rate.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Demasiadas cargas en curso. Espere ${rate.resetInSeconds}s.`,
        },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: "Debe adjuntar un archivo PDF válido." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_PATIENT_PDF_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "El archivo PDF debe pesar más de 0 bytes y como máximo 15 MB.",
        },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isPdfMagicBytes(bytes)) {
      return NextResponse.json(
        {
          success: false,
          error: "Solo se admiten archivos PDF válidos (%PDF-).",
        },
        { status: 400 }
      );
    }

    const rawTitle = String(formData.get("title") ?? "").trim();
    const originalFileName =
      "name" in file && typeof file.name === "string" && file.name.trim()
        ? file.name.trim()
        : "documento.pdf";

    const fallbackTitle =
      rawTitle ||
      originalFileName.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim() ||
      "Documento Clínico Externo";

    const metaParsed = createPatientDocumentMetaSchema.safeParse({
      patientId: String(formData.get("patientId") ?? "").trim(),
      documentType: String(formData.get("documentType") ?? "EXTERNO").trim(),
      title: fallbackTitle,
      documentDate: String(formData.get("documentDate") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim(),
    });

    if (!metaParsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            metaParsed.error.issues[0]?.message ||
            "Metadatos del documento PDF inválidos.",
        },
        { status: 422 }
      );
    }

    const profile = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
    const actorName = profile
      ? `${profile.doctorTitle} ${profile.fullName}`
      : ctx.userId;

    const created = await uploadPatientDocument(
      ctx,
      actorName,
      metaParsed.data,
      bytes,
      originalFileName
    );

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof DomainError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 400 }
      );
    }
    console.error("[POST /api/patient-documents Error]:", err);
    return NextResponse.json(
      { success: false, error: "Error interno al subir documento PDF." },
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
      const rate = mutationLimiter.check(`pdoc-del:${ctx.userId}`);
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
          throw new DomainError("Debe indicar el identificador del documento.");
        }
      }

      const parsed = deletePatientDocumentSchema.parse(rawPayload);
      return softDeletePatientDocument(ctx, actorName, parsed.id);
    },
  });
}
