import { randomBytes } from "node:crypto";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { clinicalTemplates } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { normalizeScjVisibility } from "@/features/colposcopia/colposcopia.schema";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import {
  CLINICAL_TEMPLATE_SCOPES,
  OFFICIAL_CLINICAL_TEMPLATES,
  type ClinicalTemplateItem,
  type ClinicalTemplateScope,
  type ColposcopyClinicalTemplateItem,
  type ColposcopyTemplatePayload,
  type CreateClinicalTemplateInput,
  type ProcedureClinicalTemplateItem,
  type ProcedureTemplatePayload,
  type UltrasoundClinicalTemplateItem,
  type UltrasoundTemplatePayload,
  type UpdateClinicalTemplateInput,
} from "../clinical-templates.schema";

function slugifyTemplateCode(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  const suffix = randomBytes(3).toString("hex");
  return `custom-${base || "plantilla"}-${suffix}`;
}

function normalizeColposcopyPayload(
  payload: ColposcopyTemplatePayload
): ColposcopyTemplatePayload {
  const normalizedHours = payload.cervicalBiopsyTaken
    ? Array.from(new Set(payload.biopsyClockHours)).sort(
        (a, b) => Number(a) - Number(b)
      )
    : [];

  const ext = payload.extendedFindings ?? {};
  const cleanedAdditional = (ext.additionalDiagnoses ?? [])
    .filter((d) => d.diagnosis.trim().length > 0)
    .map((d) => ({
      diagnosis: d.diagnosis.trim(),
      ...(d.cie10Code?.trim() ? { cie10Code: d.cie10Code.trim().toUpperCase() } : {}),
    }));

  return {
    ...payload,
    squamocolumnarJunctionVisible: normalizeScjVisibility(
      payload.squamocolumnarJunctionVisible
    ),
    extendedFindings: {
      inadequateReason: payload.adequateColposcopy
        ? ""
        : ext.inadequateReason?.trim() ?? "",
      atrophicSquamousEpithelium: Boolean(ext.atrophicSquamousEpithelium),
      nabothCyst: Boolean(ext.nabothCyst),
      cryptOpenings: Boolean(ext.cryptOpenings),
      deciduosis: Boolean(ext.deciduosis),
      rapidAcetowhite: Boolean(ext.rapidAcetowhite),
      thickenedGlands: Boolean(ext.thickenedGlands),
      sharpBorders: Boolean(ext.sharpBorders),
      innerBorderSign: Boolean(ext.innerBorderSign),
      ridgeSign: Boolean(ext.ridgeSign),
      leukoplakia: Boolean(ext.leukoplakia),
      erosion: Boolean(ext.erosion),
      fragileVessels: Boolean(ext.fragileVessels),
      irregularSurface: Boolean(ext.irregularSurface),
      exophyticLesion: Boolean(ext.exophyticLesion),
      necrosis: Boolean(ext.necrosis),
      necroticUlceration: Boolean(ext.necroticUlceration),
      nodularTumor: Boolean(ext.nodularTumor),
      congenitalTZ: Boolean(ext.congenitalTZ),
      condyloma: Boolean(ext.condyloma),
      polyp: Boolean(ext.polyp),
      inflammation: Boolean(ext.inflammation),
      stenosis: Boolean(ext.stenosis),
      congenitalAnomaly: Boolean(ext.congenitalAnomaly),
      postTreatmentAnomaly: Boolean(ext.postTreatmentAnomaly),
      endometriosisFoci: Boolean(ext.endometriosisFoci),
      otherFindings: ext.otherFindings?.trim() ?? "",
      additionalDiagnoses: cleanedAdditional,
    },
    cie10Code: payload.cie10Code.trim().toUpperCase(),
    biopsyClockHours: normalizedHours,
  };
}

function mapTemplateRow(
  row: typeof clinicalTemplates.$inferSelect
): ClinicalTemplateItem {
  if (row.scope === "ULTRASOUND") {
    return {
      id: row.id,
      scope: "ULTRASOUND",
      subType: row.subType,
      code: row.code,
      name: row.name,
      description: row.description ?? "",
      payload: row.payload as UltrasoundClinicalTemplateItem["payload"],
      isOfficial: row.isOfficial,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  if (row.scope === "PROCEDURE") {
    return {
      id: row.id,
      scope: "PROCEDURE",
      subType: row.subType,
      code: row.code,
      name: row.name,
      description: row.description ?? "",
      payload: row.payload as ProcedureClinicalTemplateItem["payload"],
      isOfficial: row.isOfficial,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  const rawColpoPayload = row.payload as ColposcopyClinicalTemplateItem["payload"];
  return {
    id: row.id,
    scope: "COLPOSCOPY",
    subType: row.subType,
    code: row.code,
    name: row.name,
    description: row.description ?? "",
    payload: {
      ...rawColpoPayload,
      squamocolumnarJunctionVisible: normalizeScjVisibility(
        rawColpoPayload?.squamocolumnarJunctionVisible
      ),
    },
    isOfficial: row.isOfficial,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function ensureOfficialClinicalTemplatesSeeded(
  tenantId: string,
  targetScope?: ClinicalTemplateScope
): Promise<void> {
  const scopesToCheck = targetScope
    ? [targetScope]
    : [...CLINICAL_TEMPLATE_SCOPES];

  const existingRows = await db
    .select({
      scope: clinicalTemplates.scope,
      code: clinicalTemplates.code,
    })
    .from(clinicalTemplates)
    .where(
      and(
        eq(clinicalTemplates.tenantId, tenantId),
        inArray(clinicalTemplates.scope, scopesToCheck)
      )
    );

  const presentKeys = new Set(
    existingRows.map(
      (r) => `${r.scope}:${r.code.trim().toLowerCase()}`
    )
  );

  const seedsToInsert = OFFICIAL_CLINICAL_TEMPLATES.filter(
    (t) =>
      scopesToCheck.includes(t.scope) &&
      !presentKeys.has(`${t.scope}:${t.code.trim().toLowerCase()}`)
  );

  if (seedsToInsert.length === 0) return;

  await db
    .insert(clinicalTemplates)
    .values(
      seedsToInsert.map((seed) => ({
        tenantId,
        scope: seed.scope,
        subType: seed.subType,
        code: seed.code,
        name: seed.name,
        description: seed.description,
        payload: seed.payload as Record<string, unknown>,
        isOfficial: true,
        sortOrder: seed.sortOrder,
      }))
    )
    .onConflictDoNothing();
}

export async function listClinicalTemplates(
  tenantId: string,
  scope?: ClinicalTemplateScope
): Promise<ClinicalTemplateItem[]> {
  await ensureOfficialClinicalTemplatesSeeded(tenantId, scope);

  const conditions = [
    eq(clinicalTemplates.tenantId, tenantId),
    isNull(clinicalTemplates.deletedAt),
  ];
  if (scope) {
    conditions.push(eq(clinicalTemplates.scope, scope));
  }

  const rows = await db
    .select()
    .from(clinicalTemplates)
    .where(and(...conditions))
    .orderBy(asc(clinicalTemplates.sortOrder), asc(clinicalTemplates.createdAt));

  return rows.map(mapTemplateRow);
}

export async function createClinicalTemplate(
  ctx: SessionPayload,
  actorName: string,
  input: CreateClinicalTemplateInput
): Promise<ClinicalTemplateItem> {
  if (!ctx.tenantId) {
    throw new DomainError("Sede no asociada a la sesión.");
  }

  const normalizedPayload =
    input.scope === "COLPOSCOPY"
      ? normalizeColposcopyPayload(input.payload)
      : input.scope === "PROCEDURE"
        ? ({
            ...input.payload,
            cie10Code: (input.payload.cie10Code ?? "").trim().toUpperCase(),
          } satisfies ProcedureTemplatePayload)
        : (input.payload as UltrasoundTemplatePayload);

  const subType =
    input.scope === "ULTRASOUND"
      ? input.payload.ultrasoundType
      : input.scope === "PROCEDURE"
        ? input.payload.procedureType
        : input.subType?.trim() || "CUSTOM";

  const [maxOrderRow] = await db
    .select({
      maxOrder: sql<number>`COALESCE(MAX(${clinicalTemplates.sortOrder}), 0)::int`,
    })
    .from(clinicalTemplates)
    .where(
      and(
        eq(clinicalTemplates.tenantId, ctx.tenantId),
        eq(clinicalTemplates.scope, input.scope),
        isNull(clinicalTemplates.deletedAt)
      )
    );

  const nextOrder =
    typeof input.sortOrder === "number"
      ? input.sortOrder
      : (maxOrderRow?.maxOrder ?? 0) + 1;

  const code = slugifyTemplateCode(input.name);

  const [created] = await db
    .insert(clinicalTemplates)
    .values({
      tenantId: ctx.tenantId,
      scope: input.scope,
      subType,
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      payload: normalizedPayload as Record<string, unknown>,
      isOfficial: false,
      sortOrder: nextOrder,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "clinical_template",
    entityId: created.id,
    changesSummary: {
      scope: created.scope,
      code: created.code,
      name: created.name,
    },
  });

  return mapTemplateRow(created);
}

export async function updateClinicalTemplate(
  ctx: SessionPayload,
  actorName: string,
  input: UpdateClinicalTemplateInput
): Promise<ClinicalTemplateItem> {
  if (!ctx.tenantId) {
    throw new DomainError("Sede no asociada a la sesión.");
  }

  const [existing] = await db
    .select()
    .from(clinicalTemplates)
    .where(
      and(
        eq(clinicalTemplates.id, input.id),
        eq(clinicalTemplates.tenantId, ctx.tenantId),
        isNull(clinicalTemplates.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Plantilla clínica no encontrada o eliminada.");
  }

  if (existing.scope !== input.scope) {
    throw new DomainError("No está permitido cambiar el ámbito de la plantilla.");
  }

  const normalizedPayload =
    input.scope === "COLPOSCOPY"
      ? normalizeColposcopyPayload(input.payload)
      : input.scope === "PROCEDURE"
        ? ({
            ...input.payload,
            cie10Code: (input.payload.cie10Code ?? "").trim().toUpperCase(),
          } satisfies ProcedureTemplatePayload)
        : (input.payload as UltrasoundTemplatePayload);

  const subType =
    input.scope === "ULTRASOUND"
      ? input.payload.ultrasoundType
      : input.scope === "PROCEDURE"
        ? input.payload.procedureType
        : input.subType?.trim() || existing.subType || "CUSTOM";

  const [updated] = await db
    .update(clinicalTemplates)
    .set({
      subType,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      payload: normalizedPayload as Record<string, unknown>,
      sortOrder:
        typeof input.sortOrder === "number" ? input.sortOrder : existing.sortOrder,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(clinicalTemplates.id, existing.id))
    .returning();

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "clinical_template",
    entityId: updated.id,
    changesSummary: {
      scope: updated.scope,
      isOfficial: updated.isOfficial,
      name: updated.name,
    },
  });

  return mapTemplateRow(updated);
}

export async function deleteClinicalTemplate(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string; scope: string }> {
  if (!ctx.tenantId) {
    throw new DomainError("Sede no asociada a la sesión.");
  }

  const [existing] = await db
    .select()
    .from(clinicalTemplates)
    .where(
      and(
        eq(clinicalTemplates.id, id),
        eq(clinicalTemplates.tenantId, ctx.tenantId),
        isNull(clinicalTemplates.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Plantilla clínica no encontrada.");
  }

  if (existing.isOfficial && ctx.role !== "admin") {
    throw new DomainError(
      "Solo el Director Médico (admin) puede eliminar plantillas oficiales CENDO."
    );
  }

  await db
    .update(clinicalTemplates)
    .set({
      deletedAt: new Date(),
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(clinicalTemplates.id, existing.id));

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "clinical_template",
    entityId: existing.id,
    changesSummary: {
      scope: existing.scope,
      isOfficial: existing.isOfficial,
      name: existing.name,
    },
  });

  return { id: existing.id, scope: existing.scope };
}

export async function restoreOfficialClinicalTemplates(
  ctx: SessionPayload,
  actorName: string,
  scope?: ClinicalTemplateScope
): Promise<ClinicalTemplateItem[]> {
  if (!ctx.tenantId) {
    throw new DomainError("Sede no asociada a la sesión.");
  }

  const seeds = scope
    ? OFFICIAL_CLINICAL_TEMPLATES.filter((s) => s.scope === scope)
    : OFFICIAL_CLINICAL_TEMPLATES;

  for (const seed of seeds) {
    const [existing] = await db
      .select()
      .from(clinicalTemplates)
      .where(
        and(
          eq(clinicalTemplates.tenantId, ctx.tenantId),
          eq(clinicalTemplates.scope, seed.scope),
          sql`LOWER(TRIM(${clinicalTemplates.code})) = LOWER(TRIM(${seed.code}))`
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(clinicalTemplates)
        .set({
          subType: seed.subType,
          name: seed.name,
          description: seed.description,
          payload: seed.payload as Record<string, unknown>,
          isOfficial: true,
          sortOrder: seed.sortOrder,
          deletedAt: null,
          updatedBy: ctx.userId,
          updatedAt: new Date(),
        })
        .where(eq(clinicalTemplates.id, existing.id));
    } else {
      await db.insert(clinicalTemplates).values({
        tenantId: ctx.tenantId,
        scope: seed.scope,
        subType: seed.subType,
        code: seed.code,
        name: seed.name,
        description: seed.description,
        payload: seed.payload as Record<string, unknown>,
        isOfficial: true,
        sortOrder: seed.sortOrder,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      });
    }
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "clinical_template",
    entityId: scope ?? "ALL",
    changesSummary: {
      event: "RESTORE_OFFICIAL",
      restoredCount: seeds.length,
      scope: scope ?? "ALL",
    },
  });

  return listClinicalTemplates(ctx.tenantId, scope);
}
