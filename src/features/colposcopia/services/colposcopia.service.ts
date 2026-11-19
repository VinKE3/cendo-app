import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  colposcopyReports,
  medicalConsultations,
  patients,
  profiles,
} from "@/db/schema";
import type { ColposcopyExtendedFindingsRecord } from "@/db/schema/specialty";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { isValidPatientClinicalImagePath } from "@/lib/clinical-images";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import { deletePrivateStorageObject } from "@/lib/supabase/storage";
import type {
  ColposcopyReportItem,
  CreateColposcopyInput,
  UpdateColposcopyInput,
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
    squamocolumnarJunctionVisible: row.squamocolumnarJunctionVisible,
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
  const cleaned: ColposcopyExtendedFindingsRecord = {
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
    nodularTumor: Boolean(raw.nodularTumor),
    congenitalTZ: Boolean(raw.congenitalTZ),
    condyloma: Boolean(raw.condyloma),
    polyp: Boolean(raw.polyp),
    inflammation: Boolean(raw.inflammation),
    stenosis: Boolean(raw.stenosis),
    postTreatmentAnomaly: Boolean(raw.postTreatmentAnomaly),
    endometriosisFoci: Boolean(raw.endometriosisFoci),
  };

  if (!adequateColposcopy && raw.inadequateReason?.trim()) {
    cleaned.inadequateReason = raw.inadequateReason.trim();
  }
  if (raw.otherFindings?.trim()) {
    cleaned.otherFindings = raw.otherFindings.trim();
  }

  return cleaned;
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
