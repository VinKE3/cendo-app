import { NextResponse } from "next/server";
import {
  MAX_SIGNATURE_FILE_BYTES,
  signatureDoctorQuerySchema,
} from "@/features/configuracion/configuracion.schema";
import {
  deleteOwnSignature,
  getDoctorSignatureBinary,
  getOwnConfigProfile,
  uploadOwnSignature,
} from "@/features/configuracion/services/configuracion.service";
import { DomainError, getAuthenticatedContext } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx || !ctx.tenantId) {
      return NextResponse.json(
        { success: false, error: "Sesión inválida o expirada." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const hasDoctorParam = url.searchParams.has("doctorId");
    const rawDoctorId = url.searchParams.get("doctorId");

    let targetDoctorId = ctx.userId;
    if (hasDoctorParam) {
      const parsed = signatureDoctorQuerySchema.safeParse({
        doctorId: rawDoctorId ?? "",
      });
      if (!parsed.success || !parsed.data.doctorId) {
        return NextResponse.json(
          { success: false, error: "ID de médico inválido." },
          { status: 400 }
        );
      }
      targetDoctorId = parsed.data.doctorId;
    }

    const result = await getDoctorSignatureBinary(ctx.tenantId, targetDoctorId);
    if (!result) {
      return NextResponse.json(
        { success: false, error: "El médico seleccionado no tiene firma digital." },
        { status: 404 }
      );
    }

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "private, max-age=60, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    console.error("[GET /api/configuracion/firma Error]:", err);
    return NextResponse.json(
      { success: false, error: "Error interno al obtener la firma digital." },
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

    const rate = mutationLimiter.check(`firma-post:${ctx.userId}`);
    if (!rate.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`,
        },
        { status: 429 }
      );
    }

    const profile = await getOwnConfigProfile(ctx.tenantId, ctx.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Perfil profesional no encontrado." },
        { status: 401 }
      );
    }

    if (!profile.canManageSignature) {
      return NextResponse.json(
        {
          success: false,
          error: "Solo los médicos tratantes pueden registrar una firma digital.",
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Debe adjuntar un archivo de imagen de firma." },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_SIGNATURE_FILE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "El archivo de firma debe tener entre 1 byte y 2 MB.",
        },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const actorName = `${profile.doctorTitle} ${profile.fullName}`;
    const result = await uploadOwnSignature(ctx, actorName, bytes);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        previewUrl: `/api/configuracion/firma?doctorId=${ctx.userId}&v=${encodeURIComponent(
          result.signatureVersion
        )}`,
      },
    });
  } catch (err: unknown) {
    if (err instanceof DomainError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 400 }
      );
    }
    console.error("[POST /api/configuracion/firma Error]:", err);
    return NextResponse.json(
      { success: false, error: "Error interno al guardar la firma digital." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx || !ctx.tenantId) {
      return NextResponse.json(
        { success: false, error: "Sesión inválida o expirada." },
        { status: 401 }
      );
    }

    const profile = await getOwnConfigProfile(ctx.tenantId, ctx.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Perfil profesional no encontrado." },
        { status: 401 }
      );
    }

    if (!profile.canManageSignature) {
      return NextResponse.json(
        {
          success: false,
          error: "Solo los médicos tratantes pueden eliminar su firma digital.",
        },
        { status: 403 }
      );
    }

    const actorName = `${profile.doctorTitle} ${profile.fullName}`;
    const result = await deleteOwnSignature(ctx, actorName);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    if (err instanceof DomainError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 400 }
      );
    }
    console.error("[DELETE /api/configuracion/firma Error]:", err);
    return NextResponse.json(
      { success: false, error: "Error interno al eliminar la firma digital." },
      { status: 500 }
    );
  }
}
