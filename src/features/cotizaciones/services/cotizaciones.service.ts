import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  medicalConsultations,
  patients,
  procedureQuotes,
  proceduresTariff,
  profiles,
} from "@/db/schema";
import type { QuoteItemRecord } from "@/db/schema/clinical";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import {
  computeQuoteExpiration,
  computeQuoteFinancials,
  type CreateQuoteInput,
  type ProcedureQuoteItem,
  type UpdateQuoteInput,
} from "../cotizaciones.schema";

const PG_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function mapQuoteRow(
  row: typeof procedureQuotes.$inferSelect
): ProcedureQuoteItem {
  const { validUntilDate, isExpired } = computeQuoteExpiration(
    row.quoteDate,
    row.validityDays
  );

  return {
    id: row.id,
    patientId: row.patientId,
    consultationId: row.consultationId ?? null,
    doctorId: row.doctorId ?? null,
    doctorName: row.doctorName,
    quoteDate: row.quoteDate,
    validityDays: row.validityDays,
    validUntilDate,
    isExpired,
    items: row.items ?? [],
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discountTotal),
    total: Number(row.total),
    paymentTerms: row.paymentTerms,
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listQuotesByPatient(
  tenantId: string,
  patientId: string
): Promise<ProcedureQuoteItem[]> {
  const rows = await db
    .select()
    .from(procedureQuotes)
    .where(
      and(
        eq(procedureQuotes.tenantId, tenantId),
        eq(procedureQuotes.patientId, patientId),
        isNull(procedureQuotes.deletedAt)
      )
    )
    .orderBy(
      desc(procedureQuotes.quoteDate),
      desc(procedureQuotes.createdAt)
    );

  return rows.map(mapQuoteRow);
}

export async function listQuotesForTenantPatient(
  tenantId: string,
  patientId: string
): Promise<ProcedureQuoteItem[]> {
  const [patient] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(
      and(
        eq(patients.id, patientId),
        eq(patients.tenantId, tenantId),
        isNull(patients.deletedAt)
      )
    )
    .limit(1);

  if (!patient) {
    throw new DomainError("Paciente no encontrada o sin acceso autorizado.");
  }

  return listQuotesByPatient(tenantId, patientId);
}

async function resolveConsultationLink(
  tenantId: string,
  patientId: string,
  consultationId?: string | null
): Promise<string | null> {
  if (!consultationId) return null;

  const [cons] = await db
    .select({ id: medicalConsultations.id })
    .from(medicalConsultations)
    .where(
      and(
        eq(medicalConsultations.id, consultationId),
        eq(medicalConsultations.tenantId, tenantId),
        eq(medicalConsultations.patientId, patientId),
        isNull(medicalConsultations.deletedAt)
      )
    )
    .limit(1);

  if (!cons) {
    throw new DomainError(
      "La consulta vinculada no existe o no pertenece a esta paciente."
    );
  }

  return cons.id;
}

async function resolveAuthoritativeQuoteItems(
  tenantId: string,
  rawItems: CreateQuoteInput["items"],
  existingItemsSnapshot: QuoteItemRecord[] = []
): Promise<ReturnType<typeof computeQuoteFinancials>> {
  const snapshotMap = new Map(
    existingItemsSnapshot.map((it) => [it.procedureId, it])
  );

  const tariffUuidsToLookup = Array.from(
    new Set(
      rawItems
        .map((it) => it.procedureId.trim())
        .filter((pid) => {
          if (pid.startsWith("custom-")) return false;
          if (!PG_UUID_REGEX.test(pid)) {
            if (snapshotMap.has(pid)) return false;
            throw new DomainError(`Identificador de procedimiento inválido: "${pid}".`);
          }
          return true;
        })
    )
  );

  const tariffRows =
    tariffUuidsToLookup.length > 0
      ? await db
          .select({
            id: proceduresTariff.id,
            code: proceduresTariff.code,
            name: proceduresTariff.name,
            category: proceduresTariff.category,
            price: proceduresTariff.price,
            providerCosts: proceduresTariff.providerCosts,
            active: proceduresTariff.active,
          })
          .from(proceduresTariff)
          .where(
            and(
              eq(proceduresTariff.tenantId, tenantId),
              inArray(proceduresTariff.id, tariffUuidsToLookup),
              isNull(proceduresTariff.deletedAt)
            )
          )
      : [];

  const tariffMap = new Map(tariffRows.map((t) => [t.id, t]));

  function resolveProviderSelection(
    providerCosts: typeof tariffRows[number]["providerCosts"] | undefined,
    requestedLabName: string | undefined
  ): { selectedLabName?: string; providerCost?: number } {
    const entries = Array.isArray(providerCosts) ? providerCosts : [];
    if (entries.length === 0) return {};

    const cleanRequested = requestedLabName?.trim().toLowerCase();
    const formatEntryLabel = (e: { laboratoryName: string; variant?: string }) =>
      e.variant?.trim()
        ? `${e.laboratoryName.trim()} (${e.variant.trim()})`
        : e.laboratoryName.trim();

    const matched = cleanRequested
      ? entries.find(
          (entry) =>
            formatEntryLabel(entry).toLowerCase() === cleanRequested ||
            entry.laboratoryName.trim().toLowerCase() === cleanRequested
        )
      : undefined;

    const chosen = matched ?? entries[0];
    if (!chosen) return {};

    return {
      selectedLabName: formatEntryLabel(chosen),
      providerCost: Number(Number(chosen.cost ?? 0).toFixed(2)),
    };
  }

  const normalizedInputs = rawItems.map((it) => {
    const pid = it.procedureId.trim();

    if (pid.startsWith("custom-")) {
      return {
        procedureId: pid,
        code: it.code,
        name: it.name,
        category: it.category,
        regularPrice: it.regularPrice,
        discountPercent: it.discountPercent,
        selectedLabName: it.selectedLabName,
        providerCost: it.providerCost,
      };
    }

    const dbTariff = tariffMap.get(pid);
    const snapped = snapshotMap.get(pid);

    if (snapped) {
      const providerSelection = dbTariff
        ? resolveProviderSelection(dbTariff.providerCosts, it.selectedLabName)
        : snapped.selectedLabName || snapped.providerCost !== undefined
          ? {
              selectedLabName: snapped.selectedLabName,
              providerCost: snapped.providerCost,
            }
          : {};
      return {
        procedureId: snapped.procedureId,
        code: snapped.code,
        name: snapped.name,
        category: snapped.category,
        // Preservar el snapshot histórico pactado al editar un presupuesto existente
        regularPrice: Number(snapped.regularPrice),
        discountPercent: it.discountPercent,
        ...providerSelection,
      };
    }

    if (dbTariff) {
      if (!dbTariff.active) {
        throw new DomainError(
          `El procedimiento "${dbTariff.name}" está inactivo en el tarifario.`
        );
      }
      const providerSelection = resolveProviderSelection(
        dbTariff.providerCosts,
        it.selectedLabName
      );
      return {
        procedureId: dbTariff.id,
        code: dbTariff.code,
        name: dbTariff.name,
        category: dbTariff.category.trim(),
        // Zero Trust: prevalece el precio oficial del tarifario en PostgreSQL
        regularPrice: Number(dbTariff.price),
        discountPercent: it.discountPercent,
        ...providerSelection,
      };
    }

    throw new DomainError(
      `El procedimiento "${it.name}" no existe o no pertenece al tarifario de la sede.`
    );
  });

  return computeQuoteFinancials(normalizedInputs);
}

export async function createQuote(
  ctx: SessionPayload,
  actorName: string,
  input: CreateQuoteInput
): Promise<ProcedureQuoteItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");
  const tenantId = ctx.tenantId;

  const [[doctor], [patient], validConsultationId, financials] =
    await Promise.all([
      db
        .select({
          id: profiles.id,
          fullName: profiles.fullName,
          doctorTitle: profiles.doctorTitle,
        })
        .from(profiles)
        .where(
          and(
            eq(profiles.id, ctx.userId),
            eq(profiles.tenantId, tenantId),
            eq(profiles.isActive, true),
            isNull(profiles.deletedAt)
          )
        )
        .limit(1),
      db
        .select({ id: patients.id, fullName: patients.fullName })
        .from(patients)
        .where(
          and(
            eq(patients.id, input.patientId),
            eq(patients.tenantId, tenantId),
            isNull(patients.deletedAt)
          )
        )
        .limit(1),
      resolveConsultationLink(tenantId, input.patientId, input.consultationId),
      resolveAuthoritativeQuoteItems(tenantId, input.items),
    ]);

  if (!doctor) {
    throw new DomainError("Médico autenticado no encontrado o inactivo en la sede.");
  }
  if (!patient) {
    throw new DomainError("Paciente no encontrada o sin acceso autorizado.");
  }

  const doctorDisplayName = `${doctor.doctorTitle} ${doctor.fullName}`.trim();

  const [inserted] = await db
    .insert(procedureQuotes)
    .values({
      tenantId,
      patientId: input.patientId,
      consultationId: validConsultationId,
      doctorId: doctor.id,
      doctorName: doctorDisplayName,
      quoteDate: input.quoteDate,
      validityDays: input.validityDays,
      items: financials.items,
      subtotal: financials.subtotal.toFixed(2),
      discountTotal: financials.discountTotal.toFixed(2),
      total: financials.total.toFixed(2),
      paymentTerms: input.paymentTerms,
      notes: input.notes || null,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  const mapped = mapQuoteRow(inserted);

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "procedure_quotes",
    entityId: mapped.id,
    changesSummary: {
      patientId: input.patientId,
      patientName: patient.fullName,
      consultationId: validConsultationId,
      subtotal: mapped.subtotal,
      discountTotal: mapped.discountTotal,
      total: mapped.total,
      itemsCount: mapped.items.length,
    },
  });

  return mapped;
}

export async function updateQuote(
  ctx: SessionPayload,
  actorName: string,
  input: UpdateQuoteInput
): Promise<ProcedureQuoteItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");
  const tenantId = ctx.tenantId;

  const [[existing], validConsultationId] = await Promise.all([
    db
      .select()
      .from(procedureQuotes)
      .where(
        and(
          eq(procedureQuotes.id, input.id),
          eq(procedureQuotes.tenantId, tenantId),
          eq(procedureQuotes.patientId, input.patientId),
          isNull(procedureQuotes.deletedAt)
        )
      )
      .limit(1),
    resolveConsultationLink(tenantId, input.patientId, input.consultationId),
  ]);

  if (!existing) {
    throw new DomainError("Presupuesto no encontrado o sin acceso autorizado.");
  }

  const financials = await resolveAuthoritativeQuoteItems(
    tenantId,
    input.items,
    existing.items ?? []
  );

  const [updated] = await db
    .update(procedureQuotes)
    .set({
      consultationId: validConsultationId,
      quoteDate: input.quoteDate,
      validityDays: input.validityDays,
      items: financials.items,
      subtotal: financials.subtotal.toFixed(2),
      discountTotal: financials.discountTotal.toFixed(2),
      total: financials.total.toFixed(2),
      paymentTerms: input.paymentTerms,
      notes: input.notes || null,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(procedureQuotes.id, input.id),
        eq(procedureQuotes.tenantId, tenantId),
        isNull(procedureQuotes.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    throw new DomainError("No se pudo actualizar el presupuesto médico.");
  }

  const mapped = mapQuoteRow(updated);

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "procedure_quotes",
    entityId: mapped.id,
    changesSummary: {
      patientId: mapped.patientId,
      consultationId: mapped.consultationId,
      subtotal: mapped.subtotal,
      discountTotal: mapped.discountTotal,
      total: mapped.total,
      itemsCount: mapped.items.length,
    },
  });

  return mapped;
}

export async function softDeleteQuote(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string; patientId: string }> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const now = new Date();
  const [deleted] = await db
    .update(procedureQuotes)
    .set({
      deletedAt: now,
      updatedBy: ctx.userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(procedureQuotes.id, id),
        eq(procedureQuotes.tenantId, ctx.tenantId),
        isNull(procedureQuotes.deletedAt)
      )
    )
    .returning({
      id: procedureQuotes.id,
      patientId: procedureQuotes.patientId,
      total: procedureQuotes.total,
    });

  if (!deleted) {
    throw new DomainError("Presupuesto no encontrado o ya eliminado.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "procedure_quotes",
    entityId: deleted.id,
    changesSummary: {
      patientId: deleted.patientId,
      total: Number(deleted.total),
    },
  });

  return { id: deleted.id, patientId: deleted.patientId };
}
