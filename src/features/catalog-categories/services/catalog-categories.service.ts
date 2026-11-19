import { and, asc, count, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  catalogCategories,
  medicalAppointments,
  medicalConsultations,
  medicationsVademecum,
  proceduresTariff,
} from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import type {
  CatalogCategoryItem,
  CategoryScope,
  CreateCategoryInput,
  RenameCategoryInput,
} from "../catalog-categories.schema";

export const LEGACY_APPOINTMENT_TYPE_MAP: Record<string, string> = {
  CONSULTA_PRIMERA_VEZ: "Consulta Ginecológica (Primera Vez)",
  CONTROL_GINECOLOGICO: "Control Ginecológico Periódico",
  CHEQUEO_INTEGRAL: "Chequeo Preventivo Integral CENDO",
  CONTROL_PRENATAL: "Control Prenatal Oficial (MINSA/CLAP)",
  COLPOSCOPIA: "Colposcopía Especializada & IFCPC",
  ECOGRAFIA: "Ecografía Especializada (TV / Mama / Obstétrica)",
  PROCEDIMIENTO_MENOR: "Procedimiento Menor (Biopsia / LEEP / DIU)",
};

export const DEFAULT_APPOINTMENT_TYPES = [
  "Consulta Ginecológica (Primera Vez)",
  "Control Ginecológico Periódico",
  "Chequeo Preventivo Integral CENDO",
  "Control Prenatal Oficial (MINSA/CLAP)",
  "Colposcopía Especializada & IFCPC",
  "Ecografía Especializada (TV / Mama / Obstétrica)",
  "Procedimiento Menor (Biopsia / LEEP / DIU)",
] as const;

export const DEFAULT_CONSULTATION_REASONS = [
  "Control ginecológico anual preventivo",
  "Dolor pélvico crónico y dismenorrea progresiva",
  "Seguimiento de endometriosis pélvica",
  "Control prenatal programado",
  "Control de resultados PAP / VPH / Colposcopía",
  "Sangrado uterino anormal / Menorragia",
  "Evaluación de quiste ovárico / Miomatosis",
  "Consejería anticonceptiva / Planificación familiar",
] as const;

function normalizeAppointmentTypeKey(raw: string): string {
  const upper = raw.trim().toUpperCase();
  const mapped = LEGACY_APPOINTMENT_TYPE_MAP[upper];
  return (mapped ?? raw).trim().toLowerCase();
}

function findLegacyKeysForLabel(label: string): string[] {
  const target = label.trim().toLowerCase();
  return Object.entries(LEGACY_APPOINTMENT_TYPE_MAP)
    .filter(([, mappedLabel]) => mappedLabel.trim().toLowerCase() === target)
    .map(([key]) => key);
}

async function ensureDefaultCategoriesForScope(
  tenantId: string,
  scope: CategoryScope
) {
  const defaults =
    scope === "appointment_type"
      ? DEFAULT_APPOINTMENT_TYPES
      : scope === "consultation_reason"
        ? DEFAULT_CONSULTATION_REASONS
        : null;

  if (!defaults) return;

  const [existing] = await db
    .select({ id: catalogCategories.id })
    .from(catalogCategories)
    .where(
      and(
        eq(catalogCategories.tenantId, tenantId),
        eq(catalogCategories.scope, scope),
        isNull(catalogCategories.deletedAt)
      )
    )
    .limit(1);

  if (existing) return;

  for (const name of defaults) {
    await db
      .insert(catalogCategories)
      .values({
        tenantId,
        scope,
        name,
      })
      .onConflictDoNothing();
  }
}

async function getUsageMapByScope(
  tenantId: string,
  scope: CategoryScope
): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  if (scope === "tariff") {
    const rows = await db
      .select({
        key: proceduresTariff.category,
        total: count(),
      })
      .from(proceduresTariff)
      .where(
        and(
          eq(proceduresTariff.tenantId, tenantId),
          isNull(proceduresTariff.deletedAt)
        )
      )
      .groupBy(proceduresTariff.category);

    for (const r of rows) {
      const k = r.key.trim().toLowerCase();
      map.set(k, (map.get(k) ?? 0) + Number(r.total));
    }
    return map;
  }

  if (scope === "vademecum") {
    const rows = await db
      .select({
        key: medicationsVademecum.therapeuticGroup,
        total: count(),
      })
      .from(medicationsVademecum)
      .where(
        and(
          eq(medicationsVademecum.tenantId, tenantId),
          isNull(medicationsVademecum.deletedAt)
        )
      )
      .groupBy(medicationsVademecum.therapeuticGroup);

    for (const r of rows) {
      const k = r.key.trim().toLowerCase();
      map.set(k, (map.get(k) ?? 0) + Number(r.total));
    }
    return map;
  }

  if (scope === "appointment_type") {
    const rows = await db
      .select({
        key: medicalAppointments.appointmentType,
        total: count(),
      })
      .from(medicalAppointments)
      .where(
        and(
          eq(medicalAppointments.tenantId, tenantId),
          isNull(medicalAppointments.deletedAt)
        )
      )
      .groupBy(medicalAppointments.appointmentType);

    for (const r of rows) {
      const k = normalizeAppointmentTypeKey(r.key);
      map.set(k, (map.get(k) ?? 0) + Number(r.total));
    }
    return map;
  }

  const rows = await db
    .select({
      key: medicalConsultations.reasonForVisit,
      total: count(),
    })
    .from(medicalConsultations)
    .where(
      and(
        eq(medicalConsultations.tenantId, tenantId),
        isNull(medicalConsultations.deletedAt)
      )
    )
    .groupBy(medicalConsultations.reasonForVisit);

  for (const r of rows) {
    const k = r.key.trim().toLowerCase();
    map.set(k, (map.get(k) ?? 0) + Number(r.total));
  }
  return map;
}

async function countScopeUsage(
  tenantId: string,
  scope: CategoryScope,
  categoryName: string
): Promise<number> {
  const cleanName = categoryName.trim().toLowerCase();

  if (scope === "tariff") {
    const [row] = await db
      .select({ value: count() })
      .from(proceduresTariff)
      .where(
        and(
          eq(proceduresTariff.tenantId, tenantId),
          isNull(proceduresTariff.deletedAt),
          sql`LOWER(TRIM(${proceduresTariff.category})) = ${cleanName}`
        )
      );
    return Number(row?.value ?? 0);
  }

  if (scope === "vademecum") {
    const [row] = await db
      .select({ value: count() })
      .from(medicationsVademecum)
      .where(
        and(
          eq(medicationsVademecum.tenantId, tenantId),
          isNull(medicationsVademecum.deletedAt),
          sql`LOWER(TRIM(${medicationsVademecum.therapeuticGroup})) = ${cleanName}`
        )
      );
    return Number(row?.value ?? 0);
  }

  if (scope === "appointment_type") {
    const legacyKeys = findLegacyKeysForLabel(categoryName);
    const matchCondition =
      legacyKeys.length > 0
        ? or(
            sql`LOWER(TRIM(${medicalAppointments.appointmentType})) = ${cleanName}`,
            ...legacyKeys.map(
              (key) => sql`UPPER(TRIM(${medicalAppointments.appointmentType})) = ${key}`
            )
          )
        : sql`LOWER(TRIM(${medicalAppointments.appointmentType})) = ${cleanName}`;

    const [row] = await db
      .select({ value: count() })
      .from(medicalAppointments)
      .where(
        and(
          eq(medicalAppointments.tenantId, tenantId),
          isNull(medicalAppointments.deletedAt),
          matchCondition
        )
      );
    return Number(row?.value ?? 0);
  }

  const [row] = await db
    .select({ value: count() })
    .from(medicalConsultations)
    .where(
      and(
        eq(medicalConsultations.tenantId, tenantId),
        isNull(medicalConsultations.deletedAt),
        sql`LOWER(TRIM(${medicalConsultations.reasonForVisit})) = ${cleanName}`
      )
    );
  return Number(row?.value ?? 0);
}

export async function listCategories(
  tenantId: string,
  scope: CategoryScope
): Promise<CatalogCategoryItem[]> {
  await ensureDefaultCategoriesForScope(tenantId, scope);

  const [rows, usageMap] = await Promise.all([
    db
      .select()
      .from(catalogCategories)
      .where(
        and(
          eq(catalogCategories.tenantId, tenantId),
          eq(catalogCategories.scope, scope),
          isNull(catalogCategories.deletedAt)
        )
      )
      .orderBy(asc(catalogCategories.name)),
    getUsageMapByScope(tenantId, scope),
  ]);

  return rows.map((row) => ({
    id: row.id,
    scope,
    name: row.name,
    usageCount: usageMap.get(row.name.trim().toLowerCase()) ?? 0,
  }));
}

async function assertNoDuplicateCategory(
  tenantId: string,
  scope: CategoryScope,
  name: string,
  excludeId?: string
) {
  const cleanName = name.trim().toLowerCase();
  const [dup] = await db
    .select({ id: catalogCategories.id, name: catalogCategories.name })
    .from(catalogCategories)
    .where(
      and(
        eq(catalogCategories.tenantId, tenantId),
        eq(catalogCategories.scope, scope),
        isNull(catalogCategories.deletedAt),
        sql`LOWER(TRIM(${catalogCategories.name})) = ${cleanName}`,
        excludeId ? ne(catalogCategories.id, excludeId) : undefined
      )
    )
    .limit(1);

  if (dup) {
    throw new DomainError(`El elemento "${dup.name}" ya existe en este catálogo.`);
  }
}

export async function createCategory(
  ctx: SessionPayload,
  actorName: string,
  input: CreateCategoryInput
): Promise<CatalogCategoryItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  await assertNoDuplicateCategory(ctx.tenantId, input.scope, input.name);

  const [created] = await db
    .insert(catalogCategories)
    .values({
      tenantId: ctx.tenantId,
      scope: input.scope,
      name: input.name,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "catalog_categories",
    entityId: created.id,
    changesSummary: { scope: input.scope, name: created.name },
  });

  return {
    id: created.id,
    scope: input.scope,
    name: created.name,
    usageCount: 0,
  };
}

export async function renameCategory(
  ctx: SessionPayload,
  actorName: string,
  input: RenameCategoryInput
): Promise<CatalogCategoryItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");
  const tenantId = ctx.tenantId;

  const [existing] = await db
    .select()
    .from(catalogCategories)
    .where(
      and(
        eq(catalogCategories.id, input.id),
        eq(catalogCategories.tenantId, tenantId),
        eq(catalogCategories.scope, input.scope),
        isNull(catalogCategories.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Elemento no encontrado o sin acceso autorizado.");
  }

  await assertNoDuplicateCategory(tenantId, input.scope, input.name, input.id);

  const oldLower = existing.name.trim().toLowerCase();

  await db.transaction(async (tx) => {
    await tx
      .update(catalogCategories)
      .set({
        name: input.name,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(eq(catalogCategories.id, input.id));

    if (input.scope === "tariff") {
      await tx
        .update(proceduresTariff)
        .set({ category: input.name, updatedBy: ctx.userId })
        .where(
          and(
            eq(proceduresTariff.tenantId, tenantId),
            isNull(proceduresTariff.deletedAt),
            sql`LOWER(TRIM(${proceduresTariff.category})) = ${oldLower}`
          )
        );
    } else if (input.scope === "vademecum") {
      await tx
        .update(medicationsVademecum)
        .set({ therapeuticGroup: input.name, updatedBy: ctx.userId })
        .where(
          and(
            eq(medicationsVademecum.tenantId, tenantId),
            isNull(medicationsVademecum.deletedAt),
            sql`LOWER(TRIM(${medicationsVademecum.therapeuticGroup})) = ${oldLower}`
          )
        );
    } else if (input.scope === "appointment_type") {
      const legacyKeys = findLegacyKeysForLabel(existing.name);
      const matchCondition =
        legacyKeys.length > 0
          ? or(
              sql`LOWER(TRIM(${medicalAppointments.appointmentType})) = ${oldLower}`,
              ...legacyKeys.map(
                (key) => sql`UPPER(TRIM(${medicalAppointments.appointmentType})) = ${key}`
              )
            )
          : sql`LOWER(TRIM(${medicalAppointments.appointmentType})) = ${oldLower}`;

      await tx
        .update(medicalAppointments)
        .set({ appointmentType: input.name, updatedBy: ctx.userId })
        .where(
          and(
            eq(medicalAppointments.tenantId, tenantId),
            isNull(medicalAppointments.deletedAt),
            matchCondition
          )
        );
    } else {
      await tx
        .update(medicalConsultations)
        .set({ reasonForVisit: input.name, updatedBy: ctx.userId })
        .where(
          and(
            eq(medicalConsultations.tenantId, tenantId),
            isNull(medicalConsultations.deletedAt),
            sql`LOWER(TRIM(${medicalConsultations.reasonForVisit})) = ${oldLower}`
          )
        );
    }
  });

  const usageCount = await countScopeUsage(tenantId, input.scope, input.name);

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "catalog_categories",
    entityId: input.id,
    changesSummary: { scope: input.scope, from: existing.name, to: input.name },
  });

  return {
    id: input.id,
    scope: input.scope,
    name: input.name,
    usageCount,
  };
}

export async function deleteCategory(
  ctx: SessionPayload,
  actorName: string,
  id: string,
  scope: CategoryScope
): Promise<{ id: string }> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const [existing] = await db
    .select()
    .from(catalogCategories)
    .where(
      and(
        eq(catalogCategories.id, id),
        eq(catalogCategories.tenantId, ctx.tenantId),
        eq(catalogCategories.scope, scope),
        isNull(catalogCategories.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Elemento no encontrado o sin acceso autorizado.");
  }

  const usageCount = await countScopeUsage(ctx.tenantId, scope, existing.name);
  if (usageCount > 0) {
    throw new DomainError(
      `No se puede eliminar "${existing.name}" porque tiene ${usageCount} registro(s) asignado(s). Cámbielos o archívelos primero.`
    );
  }

  await db
    .update(catalogCategories)
    .set({ deletedAt: new Date(), updatedBy: ctx.userId })
    .where(eq(catalogCategories.id, id));

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "catalog_categories",
    entityId: id,
    changesSummary: { scope, name: existing.name },
  });

  return { id };
}
