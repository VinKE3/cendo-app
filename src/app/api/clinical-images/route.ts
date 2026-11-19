import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { patients } from "@/db/schema";
import {
  detectVerifiedImageType,
  pgUuidSchema,
} from "@/features/configuracion/configuracion.schema";
import {
  buildClinicalImageViewUrl,
  CLINICAL_IMAGE_MODULES,
  CLINICAL_IMAGE_PATH_REGEX,
  type ClinicalImageModule,
} from "@/lib/clinical-images";
import { getAuthenticatedContext } from "@/lib/security/action-guard";
import { uploadLimiter } from "@/lib/security/rate-limit";
import {
  deletePrivateStorageObject,
  downloadPrivateStorageObject,
  uploadPrivateStorageObject,
} from "@/lib/supabase/storage";

const MAX_CLINICAL_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

function parseAuthorizedStoragePath(
  rawPath: string | null,
  sessionTenantId: string
): { ok: true; path: string } | { ok: false; status: 400 | 403; error: string } {
  const path = (rawPath ?? "").trim();
  if (!path || path.includes("..") || path.includes("\\")) {
    return { ok: false, status: 400, error: "Ruta de imagen inválida." };
  }

  const match = path.match(CLINICAL_IMAGE_PATH_REGEX);
  if (!match) {
    return { ok: false, status: 400, error: "Formato de ruta clínica inválido." };
  }

  const [, pathTenantId] = match;
  if (pathTenantId.toLowerCase() !== sessionTenantId.toLowerCase()) {
    return {
      ok: false,
      status: 403,
      error: "No tiene permisos para acceder a recursos de otra sede clínica.",
    };
  }

  return { ok: true, path };
}

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
    const parsed = parseAuthorizedStoragePath(
      url.searchParams.get("path"),
      ctx.tenantId
    );
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: parsed.status }
      );
    }

    const downloaded = await downloadPrivateStorageObject({
      bucket: "clinical-images",
      path: parsed.path,
    });

    if (!downloaded) {
      return NextResponse.json(
        { success: false, error: "Imagen clínica no encontrada." },
        { status: 404 }
      );
    }

    return new NextResponse(downloaded.buffer, {
      status: 200,
      headers: {
        "Content-Type": downloaded.contentType,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    console.error("[GET /api/clinical-images Error]:", err);
    return NextResponse.json(
      { success: false, error: "Error interno al obtener la imagen clínica." },
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

    if (ctx.role !== "admin" && ctx.role !== "moderator") {
      return NextResponse.json(
        {
          success: false,
          error: "Solo médicos tratantes pueden cargar imágenes clínicas.",
        },
        { status: 403 }
      );
    }

    const rate = uploadLimiter.check(`clinical-img:${ctx.userId}`);
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
    const rawPatientId = String(formData.get("patientId") ?? "").trim();
    const rawModule = String(formData.get("module") ?? "").trim().toLowerCase();
    const file = formData.get("file");

    const parsedPatient = pgUuidSchema("ID de paciente inválido.").safeParse(
      rawPatientId
    );
    if (!parsedPatient.success) {
      return NextResponse.json(
        { success: false, error: "ID de paciente inválido." },
        { status: 400 }
      );
    }

    if (
      !(CLINICAL_IMAGE_MODULES as readonly string[]).includes(rawModule)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Módulo clínico inválido (permitido: ecografias, colposcopia).",
        },
        { status: 400 }
      );
    }

    const clinicalModule = rawModule as ClinicalImageModule;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Debe adjuntar un archivo de imagen válido." },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > MAX_CLINICAL_IMAGE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "La imagen debe pesar entre 1 byte y 5 MB.",
        },
        { status: 400 }
      );
    }

    const [patientRow] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(
        and(
          eq(patients.id, parsedPatient.data),
          eq(patients.tenantId, ctx.tenantId),
          isNull(patients.deletedAt)
        )
      )
      .limit(1);

    if (!patientRow) {
      return NextResponse.json(
        {
          success: false,
          error: "Paciente no encontrado en esta sede clínica.",
        },
        { status: 404 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectVerifiedImageType(bytes);
    if (!detected) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Formato de imagen no permitido. Solo se aceptan archivos reales JPG, PNG o WebP.",
        },
        { status: 400 }
      );
    }

    const storagePath = `clinical/${ctx.tenantId}/${parsedPatient.data}/${clinicalModule}/${crypto.randomUUID()}.${detected.ext}`;

    await uploadPrivateStorageObject({
      bucket: "clinical-images",
      path: storagePath,
      body: bytes,
      contentType: detected.contentType,
    });

    return NextResponse.json({
      success: true,
      data: {
        storagePath,
        contentType: detected.contentType,
        byteLength: bytes.byteLength,
        viewUrl: buildClinicalImageViewUrl(storagePath),
      },
    });
  } catch (err: unknown) {
    console.error("[POST /api/clinical-images Error]:", err);
    return NextResponse.json(
      { success: false, error: "Error interno al subir la imagen clínica." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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
          error: "No tiene permisos para eliminar imágenes clínicas.",
        },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const parsed = parseAuthorizedStoragePath(
      url.searchParams.get("path"),
      ctx.tenantId
    );
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: parsed.status }
      );
    }

    await deletePrivateStorageObject({
      bucket: "clinical-images",
      path: parsed.path,
    });

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (err: unknown) {
    console.error("[DELETE /api/clinical-images Error]:", err);
    return NextResponse.json(
      { success: false, error: "Error interno al eliminar la imagen clínica." },
      { status: 500 }
    );
  }
}
