import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  colposcopyReports,
  medicalConsultations,
  patientBackgrounds,
  patients,
  profiles,
} from "@/db/schema";
import type { ColposcopyExtendedFindingsRecord } from "@/db/schema/specialty";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { isValidPatientClinicalImagePath } from "@/lib/clinical-images";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import { deletePrivateStorageObject } from "@/lib/supabase/storage";
import {
  buildColposcopyBackgroundSyncPatch,
  normalizeScjVisibility,
  type ColposcopyReportItem,
  type CreateColposcopyInput,
  type UpdateColposcopyInput,
} from "../colposcopia.schema";

export function mapColposcopyRow(
  row: typeof colposcopyReports.$inferSelect
): ColposcopyReportItem {
  return {
    id: row.id,
    patientId: row.patientId,
    consultationId: row.consultationId ?? null,
    doctorId: row.doctorId ?? null,
    doctorName: row.doctorName,
    doctorCmp: row.doctorCmp,
    doctorRne: row.doctorRne ?? "",
    reportDate: row.reportDate,
    adequateColposcopy: row.adequateColposcopy,
    squamocolumnarJunctionVisible: normalizeScjVisibility(
      row.squamocolumnarJunctionVisible
    ),
    transformationZoneType: row.transformationZoneType,
    matureSquamousEpithelium: row.matureSquamousEpithelium,
    ectopy: row.ectopy,
    thinAcetowhiteEpithelium: row.thinAcetowhiteEpithelium,
    denseAcetowhiteEpithelium: row.denseAcetowhiteEpithelium,
    irregularBorder: row.irregularBorder,
    fineMosaic: row.fineMosaic,
    coarseMosaic: row.coarseMosaic,
    finePunctation: row.finePunctation,
    coarsePunctation: row.coarsePunctation,
    atypicalVessels: row.atypicalVessels,
    extendedFindings: row.extendedFindings ?? {},
    schillerTest: row.schillerTest,
    cervicalBiopsyTaken: row.cervicalBiopsyTaken,
    biopsyClockHours: Array.isArray(row.biopsyClockHours)
      ? row.biopsyClockHours
      : [],
    images: Array.isArray(row.images) ? row.images : [],
    diagnosis: row.diagnosis,
    planRecommendations: row.planRecommendations,
    cie10Code: row.cie10Code,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeBiopsyClockHours(
  taken: boolean,
  rawHours: string[]
): string[] {
  if (!taken) return [];
  const unique = Array.from(new Set(rawHours));
  return unique.sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));
}

function normalizeExtendedFindings(
  adequateColposcopy: boolean,
  raw: CreateColposcopyInput["extendedFindings"]
): ColposcopyExtendedFindingsRecord {
  const cleanedAdditional = (raw.additionalDiagnoses ?? [])
    .filter((d) => d.diagnosis.trim().length > 0)
    .map((d) => ({
      diagnosis: d.diagnosis.trim(),
      ...(d.cie10Code?.trim() ? { cie10Code: d.cie10Code.trim().toUpperCase() } : {}),
    }));

  const cleaned: ColposcopyExtendedFindingsRecord = {
    atrophicSquamousEpithelium: Boolean(raw.atrophicSquamousEpithelium),
    nabothCyst: Boolean(raw.nabothCyst),
    cryptOpenings: Boolean(raw.cryptOpenings),
    deciduosis: Boolean(raw.deciduosis),
    rapidAcetowhite: Boolean(raw.rapidAcetowhite),
    thickenedGlands: Boolean(raw.thickenedGlands),
    sharpBorders: Boolean(raw.sharpBorders),
    innerBorderSign: Boolean(raw.innerBorderSign),
    ridgeSign: Boolean(raw.ridgeSign),
    leukoplakia: Boolean(raw.leukoplakia),
    erosion: Boolean(raw.erosion),
    fragileVessels: Boolean(raw.fragileVessels),
    irregularSurface: Boolean(raw.irregularSurface),
    exophyticLesion: Boolean(raw.exophyticLesion),
    necrosis: Boolean(raw.necrosis),
    necroticUlceration: Boolean(raw.necroticUlceration),
    nodularTumor: Boolean(raw.nodularTumor),
    congenitalTZ: Boolean(raw.congenitalTZ),
    condyloma: Boolean(raw.condyloma),
    polyp: Boolean(raw.polyp),
    inflammation: Boolean(raw.inflammation),
    stenosis: Boolean(raw.stenosis),
    congenitalAnomaly: Boolean(raw.congenitalAnomaly),
    postTreatmentAnomaly: Boolean(raw.postTreatmentAnomaly),
    endometriosisFoci: Boolean(raw.endometriosisFoci),
  };

  if (raw.nps?.trim()) cleaned.nps = raw.nps.trim();
  if (raw.irs?.trim()) cleaned.irs = raw.irs.trim();
  if (raw.fur?.trim()) cleaned.fur = raw.fur.trim();
  if (raw.obstetricFormula?.trim()) {
    cleaned.obstetricFormula = raw.obstetricFormula.trim().toUpperCase();
  }
  if (raw.mac?.trim()) cleaned.mac = raw.mac.trim();
  if (raw.papResult?.trim()) {
    cleaned.papResult = raw.papResult.trim();
    if (raw.papOther?.trim()) {
      cleaned.papOther = raw.papOther.trim();
    }
  }
  if (raw.vphResult?.trim()) {
    cleaned.vphResult = raw.vphResult.trim();
    if (cleaned.vphResult === "Positivo" && raw.vphSerotype?.trim()) {
      cleaned.vphSerotype = raw.vphSerotype.trim();
    }
  }

  if (!adequateColposcopy && raw.inadequateReason?.trim()) {
    cleaned.inadequateReason = raw.inadequateReason.trim();
  }
  if (raw.otherFindings?.trim()) {
    cleaned.otherFindings = raw.otherFindings.trim();
  }
  if (cleanedAdditional.length > 0) {
    cleaned.additionalDiagnoses = cleanedAdditional;
  }

  return cleaned;
}

async function syncPatientBackgroundFromColposcopy(
  ctx: SessionPayload,
  patientId: string,
  ext: ColposcopyExtendedFindingsRecord
): Promise<void> {
  if (!ctx.tenantId) return;

  const patch = buildColposcopyBackgroundSyncPatch(ext);
  const dbFields: Partial<typeof patientBackgrounds.$inferInsert> = {};

  if (patch.obstetricFormula !== undefined) {
    dbFields.obstetricFormula = patch.obstetricFormula;
  }
  if (patch.lastMenstrualPeriod !== undefined) {
    dbFields.lastMenstrualPeriod = patch.lastMenstrualPeriod || null;
  }
  if (patch.contraceptiveMethod !== undefined) {
    dbFields.contraceptiveMethod = patch.contraceptiveMethod;
  }
  if (patch.sexualDebutAge !== undefined) {
    dbFields.sexualDebutAge = patch.sexualDebutAge;
  }
  if (patch.sexualPartnersCount !== undefined) {
    dbFields.sexualPartnersCount = patch.sexualPartnersCount;
  }
  if (patch.papHistory !== undefined) {
    dbFields.papHistory = patch.papHistory;
  }
  if (patch.vphTestHistory !== undefined) {
    dbFields.vphTestHistory = patch.vphTestHistory;
  }

  if (Object.keys(dbFields).length === 0) return;

  const [existingBg] = await db
    .select({ id: patientBackgrounds.id })
    .from(patientBackgrounds)
    .where(
      and(
        eq(patientBackgrounds.tenantId, ctx.tenantId),
        eq(patientBackgrounds.patientId, patientId),
        isNull(patientBackgrounds.deletedAt)
      )
    )
    .limit(1);

  if (existingBg) {
    await db
      .update(patientBackgrounds)
      .set({
        ...dbFields,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(patientBackgrounds.id, existingBg.id),
          eq(patientBackgrounds.tenantId, ctx.tenantId)
        )
      );
    return;
  }

  await db.insert(patientBackgrounds).values({
    tenantId: ctx.tenantId,
    patientId,
    obstetricFormula: dbFields.obstetricFormula ?? "G0 P0000",
    contraceptiveMethod: dbFields.contraceptiveMethod ?? "Ninguno",
    lastMenstrualPeriod: dbFields.lastMenstrualPeriod ?? null,
    sexualDebutAge: dbFields.sexualDebutAge ?? null,
    sexualPartnersCount: dbFields.sexualPartnersCount ?? null,
    papHistory: dbFields.papHistory ?? "No refiere",
    vphTestHistory: dbFields.vphTestHistory ?? "No realizado",
    catamenialRegimen: "28/4",
    stiHistory: "Niega ITS",
    hasDiabetes: "Niega",
    hasHypertension: "Niega",
    hasAsthma: "Niega",
    medicalAllergies: "Niega",
    surgeriesHistory: "Niega",
    familyHistory: "No refiere",
    otherPathologies: "Niega",
    createdBy: ctx.userId,
    updatedBy: ctx.userId,
  });
}

function validateAndNormalizeImages(
  images: CreateColposcopyInput["images"],
  tenantId: string,
  patientId: string
) {
  return images.map((img, idx) => {
    const cleanPath = img.storagePath.trim();
    if (
      !isValidPatientClinicalImagePath(
        cleanPath,
        tenantId,
        patientId,
        "colposcopia"
      )
    ) {
      throw new DomainError(
        `La captura #${idx + 1} no pertenece a una ruta clínica autorizada de esta paciente.`
      );
    }
    return {
      storagePath: cleanPath,
      caption: img.caption.trim() || `Captura colposcópica ${idx + 1}`,
      ...(img.timestamp?.trim() ? { timestamp: img.timestamp.trim() } : {}),
    };
  });
}

async function assertPatientExists(tenantId: string, patientId: string) {
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
    throw new DomainError("La paciente indicada no existe o fue archivada.");
  }
}

async function assertValidConsultationLink(
  tenantId: string,
  patientId: string,
  consultationId?: string
): Promise<string | null> {
  const clean = consultationId?.trim();
  if (!clean) return null;

  const [cons] = await db
    .select({ id: medicalConsultations.id })
    .from(medicalConsultations)
    .where(
      and(
        eq(medicalConsultations.id, clean),
        eq(medicalConsultations.tenantId, tenantId),
        eq(medicalConsultations.patientId, patientId),
        isNull(medicalConsultations.deletedAt)
      )
    )
    .limit(1);

  if (!cons) {
    throw new DomainError(
      "La consulta vinculada no existe o pertenece a otra paciente."
    );
  }
  return cons.id;
}

async function resolveDoctorCredentials(
  tenantId: string,
  userId: string,
  fallbackName: string
) {
  const [doc] = await db
    .select({
      id: profiles.id,
      doctorTitle: profiles.doctorTitle,
      fullName: profiles.fullName,
      cmp: profiles.cmp,
      rne: profiles.rne,
    })
    .from(profiles)
    .where(and(eq(profiles.id, userId), eq(profiles.tenantId, tenantId)))
    .limit(1);

  if (!doc) {
    return {
      doctorId: null,
      doctorName: fallbackName,
      doctorCmp: "61693",
      doctorRne: "",
    };
  }

  return {
    doctorId: doc.id,
    doctorName: `${doc.doctorTitle} ${doc.fullName}`.trim(),
    doctorCmp: doc.cmp || "61693",
    doctorRne: doc.rne || "",
  };
}

export async function listColposcopiesByPatient(
  tenantId: string,
  patientId: string
): Promise<ColposcopyReportItem[]> {
  const rows = await db
    .select()
    .from(colposcopyReports)
    .where(
      and(
        eq(colposcopyReports.tenantId, tenantId),
        eq(colposcopyReports.patientId, patientId),
        isNull(colposcopyReports.deletedAt)
      )
    )
    .orderBy(desc(colposcopyReports.reportDate), desc(colposcopyReports.createdAt));

  return rows.map(mapColposcopyRow);
}

export async function createColposcopy(
  ctx: SessionPayload,
  actorName: string,
  input: CreateColposcopyInput
): Promise<ColposcopyReportItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  await assertPatientExists(ctx.tenantId, input.patientId);
  const consultationId = await assertValidConsultationLink(
    ctx.tenantId,
    input.patientId,
    input.consultationId
  );

  const normalizedHours = normalizeBiopsyClockHours(
    input.cervicalBiopsyTaken,
    input.biopsyClockHours
  );
  const normalizedImages = validateAndNormalizeImages(
    input.images,
    ctx.tenantId,
    input.patientId
  );
  const normalizedExt = normalizeExtendedFindings(
    input.adequateColposcopy,
    input.extendedFindings
  );
  const creds = await resolveDoctorCredentials(ctx.tenantId, ctx.userId, actorName);

  const [created] = await db
    .insert(colposcopyReports)
    .values({
      tenantId: ctx.tenantId,
      patientId: input.patientId,
      consultationId,
      doctorId: creds.doctorId,
      doctorName: creds.doctorName,
      doctorCmp: creds.doctorCmp,
      doctorRne: creds.doctorRne || null,
      reportDate: input.reportDate,
      adequateColposcopy: input.adequateColposcopy,
      squamocolumnarJunctionVisible: input.squamocolumnarJunctionVisible,
      transformationZoneType: input.transformationZoneType,
      matureSquamousEpithelium: input.matureSquamousEpithelium,
      ectopy: input.ectopy,
      thinAcetowhiteEpithelium: input.thinAcetowhiteEpithelium,
      denseAcetowhiteEpithelium: input.denseAcetowhiteEpithelium,
      irregularBorder: input.irregularBorder,
      fineMosaic: input.fineMosaic,
      coarseMosaic: input.coarseMosaic,
      finePunctation: input.finePunctation,
      coarsePunctation: input.coarsePunctation,
      atypicalVessels: input.atypicalVessels,
      extendedFindings: normalizedExt,
      schillerTest: input.schillerTest.trim(),
      cervicalBiopsyTaken: input.cervicalBiopsyTaken,
      biopsyClockHours: normalizedHours,
      images: normalizedImages,
      diagnosis: input.diagnosis.trim(),
      planRecommendations: input.planRecommendations.trim(),
      cie10Code: input.cie10Code.trim().toUpperCase(),
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "colposcopy_report",
    entityId: created.id,
    changesSummary: {
      patientId: input.patientId,
      reportDate: created.reportDate,
      cie10Code: created.cie10Code,
      cervicalBiopsyTaken: created.cervicalBiopsyTaken,
      biopsyClockHours: normalizedHours,
      imagesCount: normalizedImages.length,
    },
  });

  if (input.syncBackgroundToHistory) {
    await syncPatientBackgroundFromColposcopy(ctx, input.patientId, normalizedExt);
  }

  return mapColposcopyRow(created);
}

export async function updateColposcopy(
  ctx: SessionPayload,
  actorName: string,
  input: UpdateColposcopyInput
): Promise<ColposcopyReportItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const [existing] = await db
    .select()
    .from(colposcopyReports)
    .where(
      and(
        eq(colposcopyReports.id, input.id),
        eq(colposcopyReports.tenantId, ctx.tenantId),
        eq(colposcopyReports.patientId, input.patientId),
        isNull(colposcopyReports.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Informe de colposcopía no encontrado o archivado.");
  }

  const consultationId = await assertValidConsultationLink(
    ctx.tenantId,
    input.patientId,
    input.consultationId
  );

  const normalizedHours = normalizeBiopsyClockHours(
    input.cervicalBiopsyTaken,
    input.biopsyClockHours
  );
  const normalizedImages = validateAndNormalizeImages(
    input.images,
    ctx.tenantId,
    input.patientId
  );
  const normalizedExt = normalizeExtendedFindings(
    input.adequateColposcopy,
    input.extendedFindings
  );

  const [updated] = await db
    .update(colposcopyReports)
    .set({
      consultationId,
      reportDate: input.reportDate,
      adequateColposcopy: input.adequateColposcopy,
      squamocolumnarJunctionVisible: input.squamocolumnarJunctionVisible,
      transformationZoneType: input.transformationZoneType,
      matureSquamousEpithelium: input.matureSquamousEpithelium,
      ectopy: input.ectopy,
      thinAcetowhiteEpithelium: input.thinAcetowhiteEpithelium,
      denseAcetowhiteEpithelium: input.denseAcetowhiteEpithelium,
      irregularBorder: input.irregularBorder,
      fineMosaic: input.fineMosaic,
      coarseMosaic: input.coarseMosaic,
      finePunctation: input.finePunctation,
      coarsePunctation: input.coarsePunctation,
      atypicalVessels: input.atypicalVessels,
      extendedFindings: normalizedExt,
      schillerTest: input.schillerTest.trim(),
      cervicalBiopsyTaken: input.cervicalBiopsyTaken,
      biopsyClockHours: normalizedHours,
      images: normalizedImages,
      diagnosis: input.diagnosis.trim(),
      planRecommendations: input.planRecommendations.trim(),
      cie10Code: input.cie10Code.trim().toUpperCase(),
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(colposcopyReports.id, input.id),
        eq(colposcopyReports.tenantId, ctx.tenantId)
      )
    )
    .returning();

  if (!updated) {
    throw new DomainError("No se pudo actualizar el informe de colposcopía.");
  }

  const nextPathSet = new Set(normalizedImages.map((img) => img.storagePath));
  const orphanedPaths = (existing.images ?? [])
    .map((img) => img.storagePath)
    .filter(
      (p) =>
        !nextPathSet.has(p) &&
        isValidPatientClinicalImagePath(
          p,
          ctx.tenantId!,
          existing.patientId,
          "colposcopia"
        )
    );

  if (orphanedPaths.length > 0) {
    await Promise.allSettled(
      orphanedPaths.map((path) =>
        deletePrivateStorageObject({ bucket: "clinical-images", path })
      )
    );
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "colposcopy_report",
    entityId: updated.id,
    changesSummary: {
      patientId: input.patientId,
      cervicalBiopsyTaken: updated.cervicalBiopsyTaken,
      biopsyClockHours: normalizedHours,
      imagesCount: normalizedImages.length,
      orphanedCleaned: orphanedPaths.length,
    },
  });

  if (input.syncBackgroundToHistory) {
    await syncPatientBackgroundFromColposcopy(ctx, input.patientId, normalizedExt);
  }

  return mapColposcopyRow(updated);
}

export async function softDeleteColposcopy(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string; deleted: true }> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const [deleted] = await db
    .update(colposcopyReports)
    .set({
      deletedAt: new Date(),
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(colposcopyReports.id, id),
        eq(colposcopyReports.tenantId, ctx.tenantId),
        isNull(colposcopyReports.deletedAt)
      )
    )
    .returning({ id: colposcopyReports.id, patientId: colposcopyReports.patientId });

  if (!deleted) {
    throw new DomainError("Informe de colposcopía no encontrado o ya eliminado.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "colposcopy_report",
    entityId: deleted.id,
    changesSummary: {
      patientId: deleted.patientId,
      softDelete: true,
    },
  });

  return { id: deleted.id, deleted: true };
}
