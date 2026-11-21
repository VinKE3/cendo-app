import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { proceduresTariff } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import type {
  ProcedureTariffItem,
  TariffInput,
  UpdateTariffInput,
} from "../tarifario.schema";

function sanitizeProviderCosts(
  providerCosts: TariffInput["providerCosts"] | undefined
) {
  if (!providerCosts || providerCosts.length === 0) return [];
  return providerCosts
    .map((entry) => {
      const laboratoryName = entry.laboratoryName.trim();
      const variant = entry.variant?.trim();
      const cost = Number(Number(entry.cost).toFixed(2));
      return variant ? { laboratoryName, variant, cost } : { laboratoryName, cost };
    })
    .filter((entry) => entry.laboratoryName.length > 0 && Number.isFinite(entry.cost));
}

function mapRow(row: typeof proceduresTariff.$inferSelect): ProcedureTariffItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category.trim(),
    description: row.description ?? "",
    price: Number(row.price),
    providerCosts: Array.isArray(row.providerCosts)
      ? row.providerCosts.map((entry) => ({
          laboratoryName: String(entry.laboratoryName ?? "").trim(),
          ...(entry.variant?.trim() ? { variant: entry.variant.trim() } : {}),
          cost: Number(entry.cost ?? 0),
        }))
      : [],
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listTariffs(tenantId: string): Promise<ProcedureTariffItem[]> {
  const rows = await db
    .select()
    .from(proceduresTariff)
    .where(and(eq(proceduresTariff.tenantId, tenantId), isNull(proceduresTariff.deletedAt)))
    .orderBy(asc(proceduresTariff.category), asc(proceduresTariff.code));

  return rows.map(mapRow);
}

async function assertNoDuplicateTariff(
  tenantId: string,
  code: string,
  name: string,
  excludeId?: string
) {
  const cleanCode = code.trim().toUpperCase();
  const cleanName = name.trim().toLowerCase();

  const [dupCode] = await db
    .select({ id: proceduresTariff.id, name: proceduresTariff.name })
    .from(proceduresTariff)
    .where(
      and(
        eq(proceduresTariff.tenantId, tenantId),
        isNull(proceduresTariff.deletedAt),
        sql`UPPER(TRIM(${proceduresTariff.code})) = ${cleanCode}`,
        excludeId ? ne(proceduresTariff.id, excludeId) : undefined
      )
    )
    .limit(1);

  if (dupCode) {
    throw new DomainError(`El código "${cleanCode}" ya está asignado a "${dupCode.name}".`);
  }

  const [dupName] = await db
    .select({ id: proceduresTariff.id, code: proceduresTariff.code })
    .from(proceduresTariff)
    .where(
      and(
        eq(proceduresTariff.tenantId, tenantId),
        isNull(proceduresTariff.deletedAt),
        sql`LOWER(TRIM(${proceduresTariff.name})) = ${cleanName}`,
        excludeId ? ne(proceduresTariff.id, excludeId) : undefined
      )
    )
    .limit(1);

  if (dupName) {
    throw new DomainError(`Ya existe un servicio con ese nombre (Código: ${dupName.code}).`);
  }
}

export async function createTariff(
  ctx: SessionPayload,
  actorName: string,
  input: TariffInput
): Promise<ProcedureTariffItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  await assertNoDuplicateTariff(ctx.tenantId, input.code, input.name);

  const [created] = await db
    .insert(proceduresTariff)
    .values({
      tenantId: ctx.tenantId,
      code: input.code,
      name: input.name,
      category: input.category,
      description: input.description,
      price: input.price.toFixed(2),
      providerCosts: sanitizeProviderCosts(input.providerCosts),
      active: input.active,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "procedures_tariff",
    entityId: created.id,
    changesSummary: { code: created.code, price: created.price },
  });

  return mapRow(created);
}

export async function updateTariff(
  ctx: SessionPayload,
  actorName: string,
  input: UpdateTariffInput
): Promise<ProcedureTariffItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  await assertNoDuplicateTariff(ctx.tenantId, input.code, input.name, input.id);

  const [updated] = await db
    .update(proceduresTariff)
    .set({
      code: input.code,
      name: input.name,
      category: input.category,
      description: input.description,
      price: input.price.toFixed(2),
      providerCosts: sanitizeProviderCosts(input.providerCosts),
      active: input.active,
      updatedBy: ctx.userId,
    })
    .where(
      and(
        eq(proceduresTariff.id, input.id),
        eq(proceduresTariff.tenantId, ctx.tenantId),
        isNull(proceduresTariff.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    throw new DomainError("Tarifa no encontrada o sin acceso autorizado.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "procedures_tariff",
    entityId: updated.id,
    changesSummary: { code: updated.code, price: updated.price, active: updated.active },
  });

  return mapRow(updated);
}

export async function softDeleteTariff(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string }> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const [deleted] = await db
    .update(proceduresTariff)
    .set({
      deletedAt: new Date(),
      updatedBy: ctx.userId,
    })
    .where(
      and(
        eq(proceduresTariff.id, id),
        eq(proceduresTariff.tenantId, ctx.tenantId),
        isNull(proceduresTariff.deletedAt)
      )
    )
    .returning({ id: proceduresTariff.id, code: proceduresTariff.code });

  if (!deleted) {
    throw new DomainError("Tarifa no encontrada o ya eliminada.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "procedures_tariff",
    entityId: deleted.id,
    changesSummary: { code: deleted.code },
  });

  return { id: deleted.id };
}
