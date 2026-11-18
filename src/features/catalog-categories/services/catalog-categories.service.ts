import { and, asc, count, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  catalogCategories,
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

export async function listCategories(
  tenantId: string,
  scope: CategoryScope
): Promise<CatalogCategoryItem[]> {
  const rows = await db
    .select()
    .from(catalogCategories)
    .where(
      and(
        eq(catalogCategories.tenantId, tenantId),
        eq(catalogCategories.scope, scope),
        isNull(catalogCategories.deletedAt)
      )
    )
    .orderBy(asc(catalogCategories.name));

  const counts = await Promise.all(
    rows.map((row) => countScopeUsage(tenantId, scope, row.name))
  );

  return rows.map((row, idx) => ({
    id: row.id,
    scope,
    name: row.name,
    usageCount: counts[idx] ?? 0,
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
    throw new DomainError(`La categoría "${dup.name}" ya existe.`);
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
    throw new DomainError("Categoría no encontrada.");
  }

  await assertNoDuplicateCategory(tenantId, input.scope, input.name, input.id);

  await db.transaction(async (tx) => {
    await tx
      .update(catalogCategories)
      .set({ name: input.name, updatedBy: ctx.userId })
      .where(eq(catalogCategories.id, input.id));

    if (input.scope === "tariff") {
      await tx
        .update(proceduresTariff)
        .set({ category: input.name, updatedBy: ctx.userId })
        .where(
          and(
            eq(proceduresTariff.tenantId, tenantId),
            isNull(proceduresTariff.deletedAt),
            sql`LOWER(TRIM(${proceduresTariff.category})) = ${existing.name.trim().toLowerCase()}`
          )
        );
    } else {
      await tx
        .update(medicationsVademecum)
        .set({ therapeuticGroup: input.name, updatedBy: ctx.userId })
        .where(
          and(
            eq(medicationsVademecum.tenantId, tenantId),
            isNull(medicationsVademecum.deletedAt),
            sql`LOWER(TRIM(${medicationsVademecum.therapeuticGroup})) = ${existing.name.trim().toLowerCase()}`
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
    throw new DomainError("Categoría no encontrada.");
  }

  const usageCount = await countScopeUsage(ctx.tenantId, scope, existing.name);
  if (usageCount > 0) {
    throw new DomainError(
      `No se puede eliminar "${existing.name}" porque tiene ${usageCount} registro(s) asignado(s). Cámbielos de categoría o elimínelos primero.`
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
