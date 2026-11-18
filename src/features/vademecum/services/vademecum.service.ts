import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { medicationsVademecum } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import type {
  MedicationItem,
  UpdateVademecumInput,
  VademecumInput,
} from "../vademecum.schema";

function mapRow(row: typeof medicationsVademecum.$inferSelect): MedicationItem {
  return {
    id: row.id,
    genericName: row.genericName,
    atcCode: row.atcCode ?? "",
    therapeuticGroup: row.therapeuticGroup,
    commercialBrands: row.commercialBrands ?? [],
    indications: row.indications ?? "",
    contraindications: row.contraindications ?? "",
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listMedications(tenantId: string): Promise<MedicationItem[]> {
  const rows = await db
    .select()
    .from(medicationsVademecum)
    .where(
      and(
        eq(medicationsVademecum.tenantId, tenantId),
        isNull(medicationsVademecum.deletedAt)
      )
    )
    .orderBy(asc(medicationsVademecum.genericName));

  return rows.map(mapRow);
}

async function assertNoDuplicateMedication(
  tenantId: string,
  genericName: string,
  atcCode: string,
  excludeId?: string
) {
  const cleanName = genericName.trim().toLowerCase();
  const cleanAtc = atcCode.trim().toUpperCase();

  const [dupName] = await db
    .select({ id: medicationsVademecum.id, genericName: medicationsVademecum.genericName })
    .from(medicationsVademecum)
    .where(
      and(
        eq(medicationsVademecum.tenantId, tenantId),
        isNull(medicationsVademecum.deletedAt),
        sql`LOWER(TRIM(${medicationsVademecum.genericName})) = ${cleanName}`,
        excludeId ? ne(medicationsVademecum.id, excludeId) : undefined
      )
    )
    .limit(1);

  if (dupName) {
    throw new DomainError(
      `Ya existe un fármaco registrado con el principio activo "${dupName.genericName}".`
    );
  }

  if (cleanAtc) {
    const [dupAtc] = await db
      .select({ id: medicationsVademecum.id, genericName: medicationsVademecum.genericName })
      .from(medicationsVademecum)
      .where(
        and(
          eq(medicationsVademecum.tenantId, tenantId),
          isNull(medicationsVademecum.deletedAt),
          sql`UPPER(TRIM(${medicationsVademecum.atcCode})) = ${cleanAtc}`,
          excludeId ? ne(medicationsVademecum.id, excludeId) : undefined
        )
      )
      .limit(1);

    if (dupAtc) {
      throw new DomainError(
        `El código ATC "${cleanAtc}" ya está asignado a "${dupAtc.genericName}".`
      );
    }
  }
}

export async function createMedication(
  ctx: SessionPayload,
  actorName: string,
  input: VademecumInput
): Promise<MedicationItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  await assertNoDuplicateMedication(ctx.tenantId, input.genericName, input.atcCode);

  const [created] = await db
    .insert(medicationsVademecum)
    .values({
      tenantId: ctx.tenantId,
      genericName: input.genericName,
      atcCode: input.atcCode,
      therapeuticGroup: input.therapeuticGroup,
      commercialBrands: input.commercialBrands,
      indications: input.indications,
      contraindications: input.contraindications,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "medications_vademecum",
    entityId: created.id,
    changesSummary: { genericName: created.genericName, atcCode: created.atcCode },
  });

  return mapRow(created);
}

export async function updateMedication(
  ctx: SessionPayload,
  actorName: string,
  input: UpdateVademecumInput
): Promise<MedicationItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  await assertNoDuplicateMedication(
    ctx.tenantId,
    input.genericName,
    input.atcCode,
    input.id
  );

  const [updated] = await db
    .update(medicationsVademecum)
    .set({
      genericName: input.genericName,
      atcCode: input.atcCode,
      therapeuticGroup: input.therapeuticGroup,
      commercialBrands: input.commercialBrands,
      indications: input.indications,
      contraindications: input.contraindications,
      updatedBy: ctx.userId,
    })
    .where(
      and(
        eq(medicationsVademecum.id, input.id),
        eq(medicationsVademecum.tenantId, ctx.tenantId),
        isNull(medicationsVademecum.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    throw new DomainError("Fármaco no encontrado o sin acceso autorizado.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "medications_vademecum",
    entityId: updated.id,
    changesSummary: { genericName: updated.genericName, atcCode: updated.atcCode },
  });

  return mapRow(updated);
}

export async function softDeleteMedication(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string }> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const [deleted] = await db
    .update(medicationsVademecum)
    .set({
      deletedAt: new Date(),
      updatedBy: ctx.userId,
    })
    .where(
      and(
        eq(medicationsVademecum.id, id),
        eq(medicationsVademecum.tenantId, ctx.tenantId),
        isNull(medicationsVademecum.deletedAt)
      )
    )
    .returning({ id: medicationsVademecum.id, genericName: medicationsVademecum.genericName });

  if (!deleted) {
    throw new DomainError("Fármaco no encontrado o ya eliminado.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "medications_vademecum",
    entityId: deleted.id,
    changesSummary: { genericName: deleted.genericName },
  });

  return { id: deleted.id };
}
