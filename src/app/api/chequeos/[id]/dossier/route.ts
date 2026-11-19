import { NextResponse } from "next/server";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import { generateCheckupDossierPdf } from "@/features/chequeos/services/dossier-pdf.service";
import { pgUuidSchema } from "@/features/configuracion/configuracion.schema";
import { recordAuditLog } from "@/lib/audit/audit-log";
import {
  DomainError,
  getAuthenticatedContext,
} from "@/lib/security/action-guard";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx || !ctx.tenantId) {
      return NextResponse.json(
        { success: false, error: "Sesión inválida o expirada." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const parsedId = pgUuidSchema("ID de chequeo inválido.").safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json(
        { success: false, error: "ID de chequeo inválido." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") === "1";

    const parseBoolParam = (key: string): boolean | undefined => {
      const val = searchParams.get(key);
      if (val === "1" || val === "true") return true;
      if (val === "0" || val === "false") return false;
      return undefined;
    };

    const result = await generateCheckupDossierPdf({
      tenantId: ctx.tenantId,
      checkupId: parsedId.data,
      overrides: {
        showDigitalSignature: parseBoolParam("sig"),
        includeCoverPage: parseBoolParam("cover"),
        includeSummarySheet: parseBoolParam("summary"),
      },
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Chequeo integral no encontrado." },
        { status: 404 }
      );
    }

    const profile = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
    const actorName = profile
      ? `${profile.doctorTitle} ${profile.fullName}`
      : ctx.userId;

    await recordAuditLog({
      ctx,
      actorName,
      action: "VIEW",
      entityType: "checkup_dossier",
      entityId: parsedId.data,
      changesSummary: {
        patientId: result.patientId,
        pageCount: result.pageCount,
        download,
      },
    });

    return new NextResponse(Buffer.from(result.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${result.filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Dossier-Pages": String(result.pageCount),
      },
    });
  } catch (err: unknown) {
    if (err instanceof DomainError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 400 }
      );
    }
    console.error("[GET /api/chequeos/[id]/dossier Error]:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno al generar el dossier PDF unificado.",
      },
      { status: 500 }
    );
  }
}
