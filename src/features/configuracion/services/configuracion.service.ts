import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import {
  deletePrivateStorageObject,
  downloadPrivateStorageObject,
  uploadPrivateStorageObject,
} from "@/lib/supabase/storage";
import {
  detectVerifiedImageType,
  MAX_SIGNATURE_FILE_BYTES,
  type ChangePasswordInput,
  type DoctorConfigProfile,
  type DoctorSignatureEntry,
  type UpdateDoctorConfigInput,
} from "../configuracion.schema";

export function canProfileManageSignature(
  role: string,
  clinicalRole: string
): boolean {
  return role !== "user" && clinicalRole !== "assistant";
}

function mapSignatureEntry(
  row: typeof profiles.$inferSelect
): DoctorSignatureEntry {
  return {
    doctorId: row.id,
    fullName: row.fullName,
    doctorTitle: row.doctorTitle,
    specialty: row.specialty,
    cmp: row.cmp,
    rne: row.rne,
    hasSignature: Boolean(row.signatureUrl),
    signatureVersion: String(row.updatedAt.getTime()),
    showSignatureByDefault: row.showSignatureByDefault,
  };
}

function mapConfigProfile(
  row: typeof profiles.$inferSelect
): DoctorConfigProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    doctorTitle: row.doctorTitle,
    specialty: row.specialty,
    cmp: row.cmp,
    rne: row.rne,
    role: row.role,
    clinicalRole: row.clinicalRole,
    clinicName: row.clinicName,
    clinicAddress: row.clinicAddress,
    googleMapsUrl: row.googleMapsUrl ?? "",
    phone: row.phone,
    contactEmail: row.contactEmail,
    hasSignature: Boolean(row.signatureUrl),
    signatureVersion: String(row.updatedAt.getTime()),
    showSignatureByDefault: row.showSignatureByDefault,
    canManageSignature: canProfileManageSignature(row.role, row.clinicalRole),
  };
}

async function getActiveProfileRow(tenantId: string, userId: string) {
  const [row] = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.id, userId),
        eq(profiles.tenantId, tenantId),
        eq(profiles.isActive, true),
        isNull(profiles.deletedAt)
      )
    )
    .limit(1);

  return row ?? null;
}

export async function listTenantSignatureDirectory(
  tenantId: string
): Promise<DoctorSignatureEntry[]> {
  const rows = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.tenantId, tenantId),
        eq(profiles.isActive, true),
        isNull(profiles.deletedAt)
      )
    )
    .orderBy(asc(profiles.createdAt));

  return rows.map(mapSignatureEntry);
}

export async function getOwnConfigProfile(
  tenantId: string,
  userId: string
): Promise<DoctorConfigProfile | null> {
  const row = await getActiveProfileRow(tenantId, userId);
  return row ? mapConfigProfile(row) : null;
}

export async function updateOwnConfigProfile(
  ctx: SessionPayload,
  actorName: string,
  input: UpdateDoctorConfigInput
): Promise<DoctorConfigProfile> {
  if (!ctx.tenantId) {
    throw new DomainError("Sesión sin sede clínica asociada.");
  }

  const current = await getActiveProfileRow(ctx.tenantId, ctx.userId);
  if (!current) {
    throw new DomainError("Perfil profesional no encontrado o inactivo.");
  }

  const canManage = canProfileManageSignature(current.role, current.clinicalRole);
  const now = new Date();

  if (canManage) {
    const cleanCmp = input.cmp.trim();
    if (cleanCmp.length < 4) {
      throw new DomainError(
        "El número de colegiatura (CMP) es obligatorio y debe tener al menos 4 dígitos."
      );
    }

    const [dupCmp] = await db
      .select({ id: profiles.id, fullName: profiles.fullName })
      .from(profiles)
      .where(
        and(
          eq(profiles.tenantId, ctx.tenantId),
          isNull(profiles.deletedAt),
          sql`TRIM(${profiles.cmp}) = ${cleanCmp}`,
          ne(profiles.id, ctx.userId)
        )
      )
      .limit(1);

    if (dupCmp) {
      throw new DomainError(
        `El CMP ${cleanCmp} ya pertenece a ${dupCmp.fullName} en esta sede.`
      );
    }

    const cleanSpecialty = input.specialty.trim();
    if (cleanSpecialty.length < 3) {
      throw new DomainError("La especialidad médica es obligatoria.");
    }

    const cleanAddress = input.clinicAddress.trim();
    if (cleanAddress.length < 5) {
      throw new DomainError("La dirección de sede es obligatoria.");
    }

    const nextGoogleMapsUrl =
      input.googleMapsUrl !== undefined
        ? input.googleMapsUrl.trim() || null
        : current.googleMapsUrl;

    const [updated] = await db
      .update(profiles)
      .set({
        doctorTitle: input.doctorTitle,
        fullName: input.fullName.trim(),
        specialty: cleanSpecialty,
        cmp: cleanCmp,
        rne: input.rne.trim(),
        phone: input.phone.trim(),
        clinicAddress: cleanAddress,
        googleMapsUrl: nextGoogleMapsUrl,
        showSignatureByDefault: input.showSignatureByDefault,
        updatedAt: now,
      })
      .where(and(eq(profiles.id, ctx.userId), eq(profiles.tenantId, ctx.tenantId)))
      .returning();

    if (!updated) {
      throw new DomainError("No se pudo actualizar la configuración del perfil.");
    }

    await recordAuditLog({
      ctx,
      actorName,
      action: "UPDATE",
      entityType: "profile_settings",
      entityId: ctx.userId,
      changesSummary: {
        doctorTitle: updated.doctorTitle,
        fullName: updated.fullName,
        cmp: updated.cmp,
        rne: updated.rne,
        showSignatureByDefault: updated.showSignatureByDefault,
      },
    });

    return mapConfigProfile(updated);
  }

  // Asistentes / usuarios sin privilegios médicos solo actualizan sus datos personales básicos
  const [updatedAssistant] = await db
    .update(profiles)
    .set({
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      showSignatureByDefault: false,
      updatedAt: now,
    })
    .where(and(eq(profiles.id, ctx.userId), eq(profiles.tenantId, ctx.tenantId)))
    .returning();

  if (!updatedAssistant) {
    throw new DomainError("No se pudo actualizar su perfil.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "profile_settings",
    entityId: ctx.userId,
    changesSummary: {
      fullName: updatedAssistant.fullName,
      phone: updatedAssistant.phone,
      assistantRestricted: true,
    },
  });

  return mapConfigProfile(updatedAssistant);
}

export async function uploadOwnSignature(
  ctx: SessionPayload,
  actorName: string,
  bytes: Uint8Array
): Promise<{ hasSignature: true; signatureVersion: string }> {
  if (!ctx.tenantId) {
    throw new DomainError("Sesión sin sede clínica asociada.");
  }

  const current = await getActiveProfileRow(ctx.tenantId, ctx.userId);
  if (!current) {
    throw new DomainError("Perfil profesional no encontrado.");
  }

  if (!canProfileManageSignature(current.role, current.clinicalRole)) {
    throw new DomainError(
      "Solo los médicos tratantes pueden registrar una firma digital."
    );
  }

  if (bytes.byteLength === 0) {
    throw new DomainError("El archivo de firma está vacío.");
  }

  if (bytes.byteLength > MAX_SIGNATURE_FILE_BYTES) {
    throw new DomainError("La imagen de firma no debe superar los 2 MB.");
  }

  const detected = detectVerifiedImageType(bytes);
  if (!detected) {
    throw new DomainError(
      "Formato de imagen no permitido. Use únicamente archivos PNG, JPG o WebP válidos."
    );
  }

  const storagePath = `signatures/${ctx.tenantId}/${ctx.userId}.${detected.ext}`;

  await uploadPrivateStorageObject({
    bucket: "clinical-images",
    path: storagePath,
    body: bytes,
    contentType: detected.contentType,
  });

  if (current.signatureUrl && current.signatureUrl !== storagePath) {
    try {
      await deletePrivateStorageObject({
        bucket: "clinical-images",
        path: current.signatureUrl,
      });
    } catch {
      // Silenciar fallo de limpieza de versión anterior con otra extensión
    }
  }

  const now = new Date();
  const [updated] = await db
    .update(profiles)
    .set({
      signatureUrl: storagePath,
      updatedAt: now,
    })
    .where(and(eq(profiles.id, ctx.userId), eq(profiles.tenantId, ctx.tenantId)))
    .returning();

  if (!updated) {
    throw new DomainError("No se pudo vincular la firma al perfil médico.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "profile_signature",
    entityId: ctx.userId,
    changesSummary: {
      storageBucket: "clinical-images",
      storagePath,
      contentType: detected.contentType,
      byteLength: bytes.byteLength,
    },
  });

  return {
    hasSignature: true,
    signatureVersion: String(updated.updatedAt.getTime()),
  };
}

export async function deleteOwnSignature(
  ctx: SessionPayload,
  actorName: string
): Promise<{ hasSignature: false; signatureVersion: string }> {
  if (!ctx.tenantId) {
    throw new DomainError("Sesión sin sede clínica asociada.");
  }

  const current = await getActiveProfileRow(ctx.tenantId, ctx.userId);
  if (!current) {
    throw new DomainError("Perfil profesional no encontrado.");
  }

  if (!canProfileManageSignature(current.role, current.clinicalRole)) {
    throw new DomainError(
      "Solo los médicos tratantes pueden gestionar su firma digital."
    );
  }

  const previousPath = current.signatureUrl;
  if (previousPath) {
    try {
      await deletePrivateStorageObject({
        bucket: "clinical-images",
        path: previousPath,
      });
    } catch {
      // Si el objeto ya no existía en Storage, igualmente limpiamos el registro en BD
    }
  }

  const now = new Date();
  const [updated] = await db
    .update(profiles)
    .set({
      signatureUrl: null,
      updatedAt: now,
    })
    .where(and(eq(profiles.id, ctx.userId), eq(profiles.tenantId, ctx.tenantId)))
    .returning();

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "profile_signature",
    entityId: ctx.userId,
    changesSummary: {
      removedPath: previousPath,
    },
  });

  return {
    hasSignature: false,
    signatureVersion: String(updated ? updated.updatedAt.getTime() : now.getTime()),
  };
}

export async function getDoctorSignatureBinary(
  tenantId: string,
  doctorId: string
): Promise<{ buffer: ArrayBuffer; contentType: string; updatedAt: string } | null> {
  const profile = await getActiveProfileRow(tenantId, doctorId);
  if (!profile || !profile.signatureUrl) {
    return null;
  }

  const downloaded = await downloadPrivateStorageObject({
    bucket: "clinical-images",
    path: profile.signatureUrl,
  });

  if (!downloaded) {
    return null;
  }

  return {
    buffer: downloaded.buffer,
    contentType: downloaded.contentType,
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export async function changeOwnPassword(
  ctx: SessionPayload,
  actorName: string,
  input: ChangePasswordInput
): Promise<{ updatedAt: string }> {
  if (!ctx.tenantId) {
    throw new DomainError("Sesión sin sede clínica asociada.");
  }

  const current = await getActiveProfileRow(ctx.tenantId, ctx.userId);
  if (!current) {
    throw new DomainError("Perfil profesional no encontrado o inactivo.");
  }

  const isCurrentValid = await verifyPassword(
    input.currentPassword,
    current.passwordHash
  );
  if (!isCurrentValid) {
    throw new DomainError("La contraseña actual es incorrecta.");
  }

  const nextHash = await hashPassword(input.newPassword);
  const now = new Date();

  const [updated] = await db
    .update(profiles)
    .set({
      passwordHash: nextHash,
      updatedAt: now,
    })
    .where(and(eq(profiles.id, ctx.userId), eq(profiles.tenantId, ctx.tenantId)))
    .returning({ updatedAt: profiles.updatedAt });

  if (!updated) {
    throw new DomainError("No se pudo actualizar la contraseña.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "profile_password",
    entityId: ctx.userId,
    changesSummary: {
      changedBySelf: true,
    },
  });

  return {
    updatedAt: updated.updatedAt.toISOString(),
  };
}
