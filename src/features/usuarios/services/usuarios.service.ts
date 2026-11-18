import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import { hashPassword } from "@/lib/security/password";
import {
  mapClinicalRoleToSecurityRole,
  type ClinicalRole,
  type CreateDoctorInput,
  type DoctorListItem,
  type UpdateDoctorInput,
} from "../usuarios.schema";

function mapRow(row: typeof profiles.$inferSelect): DoctorListItem {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    doctorTitle: row.doctorTitle,
    specialty: row.specialty,
    cmp: row.cmp,
    rne: row.rne,
    role: row.role,
    clinicalRole: row.clinicalRole as ClinicalRole,
    phone: row.phone,
    clinicAddress: row.clinicAddress,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listDoctors(tenantId: string): Promise<DoctorListItem[]> {
  const rows = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.tenantId, tenantId), isNull(profiles.deletedAt)))
    .orderBy(asc(profiles.createdAt));

  return rows.map(mapRow);
}

async function assertNoDuplicateDoctor(
  tenantId: string,
  email: string,
  cmp: string,
  excludeId?: string
) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCmp = cmp.trim();

  const [dupEmail] = await db
    .select({ id: profiles.id, fullName: profiles.fullName })
    .from(profiles)
    .where(
      and(
        isNull(profiles.deletedAt),
        sql`LOWER(TRIM(${profiles.email})) = ${cleanEmail}`,
        excludeId ? ne(profiles.id, excludeId) : undefined
      )
    )
    .limit(1);

  if (dupEmail) {
    throw new DomainError(
      `Ya existe una cuenta registrada con el correo "${cleanEmail}" (${dupEmail.fullName}).`
    );
  }

  if (cleanCmp) {
    const [dupCmp] = await db
      .select({ id: profiles.id, fullName: profiles.fullName })
      .from(profiles)
      .where(
        and(
          eq(profiles.tenantId, tenantId),
          isNull(profiles.deletedAt),
          sql`TRIM(${profiles.cmp}) = ${cleanCmp}`,
          excludeId ? ne(profiles.id, excludeId) : undefined
        )
      )
      .limit(1);

    if (dupCmp) {
      throw new DomainError(
        `El CMP ${cleanCmp} ya está registrado a nombre de ${dupCmp.fullName}.`
      );
    }
  }
}

export async function createDoctor(
  ctx: SessionPayload,
  actorName: string,
  input: CreateDoctorInput
): Promise<DoctorListItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  await assertNoDuplicateDoctor(ctx.tenantId, input.email, input.cmp);
  const passwordHash = await hashPassword(input.password);
  const securityRole = mapClinicalRoleToSecurityRole(input.clinicalRole);

  const [created] = await db
    .insert(profiles)
    .values({
      tenantId: ctx.tenantId,
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      doctorTitle: input.doctorTitle,
      specialty: input.specialty,
      cmp: input.cmp,
      rne: input.rne,
      role: securityRole,
      clinicalRole: input.clinicalRole,
      phone: input.phone,
      clinicAddress: input.clinicAddress,
      contactEmail: input.email,
      isActive: input.isActive,
    })
    .returning();

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "profiles",
    entityId: created.id,
    changesSummary: { email: created.email, cmp: created.cmp, role: created.clinicalRole },
  });

  return mapRow(created);
}

export async function updateDoctor(
  ctx: SessionPayload,
  actorName: string,
  input: UpdateDoctorInput
): Promise<DoctorListItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  await assertNoDuplicateDoctor(ctx.tenantId, input.email, input.cmp, input.id);

  const securityRole = mapClinicalRoleToSecurityRole(input.clinicalRole);
  const passwordUpdate =
    input.newPassword && input.newPassword.trim().length >= 6
      ? { passwordHash: await hashPassword(input.newPassword.trim()) }
      : {};

  const [updated] = await db
    .update(profiles)
    .set({
      email: input.email,
      fullName: input.fullName,
      doctorTitle: input.doctorTitle,
      specialty: input.specialty,
      cmp: input.cmp,
      rne: input.rne,
      role: securityRole,
      clinicalRole: input.clinicalRole,
      phone: input.phone,
      clinicAddress: input.clinicAddress,
      contactEmail: input.email,
      isActive: input.isActive,
      ...passwordUpdate,
    })
    .where(
      and(
        eq(profiles.id, input.id),
        eq(profiles.tenantId, ctx.tenantId),
        isNull(profiles.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    throw new DomainError("Especialista no encontrado o sin acceso autorizado.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "profiles",
    entityId: updated.id,
    changesSummary: {
      email: updated.email,
      clinicalRole: updated.clinicalRole,
      isActive: updated.isActive,
      passwordRotated: Boolean(input.newPassword),
    },
  });

  return mapRow(updated);
}

export async function softDeleteDoctor(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string }> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");
  if (id === ctx.userId) {
    throw new DomainError("No puede desactivar su propia cuenta en sesión activa.");
  }

  const [target] = await db
    .select({ id: profiles.id, clinicalRole: profiles.clinicalRole, fullName: profiles.fullName })
    .from(profiles)
    .where(
      and(
        eq(profiles.id, id),
        eq(profiles.tenantId, ctx.tenantId),
        isNull(profiles.deletedAt)
      )
    )
    .limit(1);

  if (!target) {
    throw new DomainError("Usuario no encontrado.");
  }

  if (target.clinicalRole === "director") {
    throw new DomainError("La cuenta de Dirección Médica no puede ser eliminada.");
  }

  await db
    .update(profiles)
    .set({
      isActive: false,
      deletedAt: new Date(),
    })
    .where(and(eq(profiles.id, id), eq(profiles.tenantId, ctx.tenantId)));

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "profiles",
    entityId: id,
    changesSummary: { fullName: target.fullName },
  });

  return { id };
}
