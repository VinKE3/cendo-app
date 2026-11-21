import { and, asc, count, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { cie10Codes } from "@/db/schema";
import {
  CIE10_CATEGORY_LABELS,
  CIE10_GYN_CATALOG,
} from "@/features/catalogo/cie10.data";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import {
  formatCie10CategoryLabel,
  searchCie10Catalog,
  type Cie10Input,
  type Cie10RecordItem,
  type UpdateCie10Input,
} from "../cie10.schema";

function sanitizeKeywords(keywords: readonly string[] | undefined): string[] {
  if (!keywords || keywords.length === 0) return [];
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const raw of keywords) {
    const token = raw.trim();
    if (!token) continue;
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(token.slice(0, 60));
    if (clean.length >= 25) break;
  }
  return clean;
}

function mapRow(row: typeof cie10Codes.$inferSelect): Cie10RecordItem {
  return {
    id: row.id,
    code: row.code.trim().toUpperCase(),
    name: row.name,
    category: formatCie10CategoryLabel(row.category),
    keywords: Array.isArray(row.keywords)
      ? row.keywords.map((k) => String(k).trim()).filter(Boolean)
      : [],
    isFavorite: row.isFavorite,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function ensureDefaultCie10ForTenant(tenantId: string) {
  // Contar todos los registros de la sede (incluidos archivados) para no re-sembrar si el médico eliminó códigos.
  const [existingCount] = await db
    .select({ value: count() })
    .from(cie10Codes)
    .where(eq(cie10Codes.tenantId, tenantId));

  if (Number(existingCount?.value ?? 0) > 0) return;

  await db
    .insert(cie10Codes)
    .values(
      CIE10_GYN_CATALOG.map((item) => ({
        tenantId,
        code: item.code.trim().toUpperCase(),
        name: item.name,
        category: CIE10_CATEGORY_LABELS[item.category],
        keywords: item.keywords,
        isFavorite: Boolean(item.isFavorite),
      }))
    )
    .onConflictDoNothing();
}

export async function listCie10Codes(
  tenantId: string
): Promise<Cie10RecordItem[]> {
  await ensureDefaultCie10ForTenant(tenantId);

  const rows = await db
    .select()
    .from(cie10Codes)
    .where(
      and(eq(cie10Codes.tenantId, tenantId), isNull(cie10Codes.deletedAt))
    )
    .orderBy(desc(cie10Codes.isFavorite), asc(cie10Codes.code));

  return rows.map(mapRow);
}

export async function searchCie10InDb(
  tenantId: string,
  query: string,
  limit = 6
): Promise<Cie10RecordItem[]> {
  const catalog = await listCie10Codes(tenantId);
  return searchCie10Catalog(query, catalog, limit);
}

async function assertNoDuplicateCie10Code(
  tenantId: string,
  code: string,
  excludeId?: string
) {
  const cleanCode = code.trim().toUpperCase();

  const [dup] = await db
    .select({ id: cie10Codes.id, name: cie10Codes.name })
    .from(cie10Codes)
    .where(
      and(
        eq(cie10Codes.tenantId, tenantId),
        isNull(cie10Codes.deletedAt),
        sql`UPPER(TRIM(${cie10Codes.code})) = ${cleanCode}`,
        excludeId ? ne(cie10Codes.id, excludeId) : undefined
      )
    )
    .limit(1);

  if (dup) {
    throw new DomainError(
      `El código CIE-10 "${cleanCode}" ya está registrado para "${dup.name}".`
    );
  }
}

export async function createCie10Code(
  ctx: SessionPayload,
  actorName: string,
  input: Cie10Input
): Promise<Cie10RecordItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const cleanCode = input.code.trim().toUpperCase();
  const cleanCategory = formatCie10CategoryLabel(input.category);
  await assertNoDuplicateCie10Code(ctx.tenantId, cleanCode);

  const [created] = await db
    .insert(cie10Codes)
    .values({
      tenantId: ctx.tenantId,
      code: cleanCode,
      name: input.name.trim(),
      category: cleanCategory,
      keywords: sanitizeKeywords(input.keywords),
      isFavorite: Boolean(input.isFavorite),
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "cie10_codes",
    entityId: created.id,
    changesSummary: {
      code: created.code,
      category: created.category,
      isFavorite: created.isFavorite,
    },
  });

  return mapRow(created);
}

export async function updateCie10Code(
  ctx: SessionPayload,
  actorName: string,
  input: UpdateCie10Input
): Promise<Cie10RecordItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const [existing] = await db
    .select({ id: cie10Codes.id })
    .from(cie10Codes)
    .where(
      and(
        eq(cie10Codes.id, input.id),
        eq(cie10Codes.tenantId, ctx.tenantId),
        isNull(cie10Codes.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Código CIE-10 no encontrado o sin acceso autorizado.");
  }

  const cleanCode = input.code.trim().toUpperCase();
  const cleanCategory = formatCie10CategoryLabel(input.category);
  await assertNoDuplicateCie10Code(ctx.tenantId, cleanCode, input.id);

  const [updated] = await db
    .update(cie10Codes)
    .set({
      code: cleanCode,
      name: input.name.trim(),
      category: cleanCategory,
      keywords: sanitizeKeywords(input.keywords),
      isFavorite: Boolean(input.isFavorite),
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(cie10Codes.id, input.id),
        eq(cie10Codes.tenantId, ctx.tenantId),
        isNull(cie10Codes.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    throw new DomainError("Código CIE-10 no encontrado o sin acceso autorizado.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "cie10_codes",
    entityId: updated.id,
    changesSummary: {
      code: updated.code,
      category: updated.category,
      isFavorite: updated.isFavorite,
    },
  });

  return mapRow(updated);
}

export async function toggleCie10Favorite(
  ctx: SessionPayload,
  actorName: string,
  id: string,
  isFavorite: boolean
): Promise<Cie10RecordItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const [updated] = await db
    .update(cie10Codes)
    .set({
      isFavorite,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(cie10Codes.id, id),
        eq(cie10Codes.tenantId, ctx.tenantId),
        isNull(cie10Codes.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    throw new DomainError("Código CIE-10 no encontrado o sin acceso autorizado.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "cie10_codes",
    entityId: updated.id,
    changesSummary: { code: updated.code, isFavorite: updated.isFavorite },
  });

  return mapRow(updated);
}

export async function softDeleteCie10Code(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string }> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const now = new Date();
  const [deleted] = await db
    .update(cie10Codes)
    .set({
      deletedAt: now,
      updatedBy: ctx.userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(cie10Codes.id, id),
        eq(cie10Codes.tenantId, ctx.tenantId),
        isNull(cie10Codes.deletedAt)
      )
    )
    .returning({ id: cie10Codes.id, code: cie10Codes.code });

  if (!deleted) {
    throw new DomainError("Código CIE-10 no encontrado o ya eliminado.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "cie10_codes",
    entityId: deleted.id,
    changesSummary: { code: deleted.code },
  });

  return { id: deleted.id };
}
