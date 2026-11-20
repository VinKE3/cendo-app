import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  medicalConsultations,
  patients,
  profiles,
  ultrasoundReports,
} from "@/db/schema";
import type {
  UltrasoundBreastLesionRecord,
  UltrasoundDopplerRecord,
  UltrasoundDopplerVesselRecord,
  UltrasoundFindingsRecord,
} from "@/db/schema/specialty";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { isValidPatientClinicalImagePath } from "@/lib/clinical-images";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import { deletePrivateStorageObject } from "@/lib/supabase/storage";
import {
  calculateDopplerDerivedIndices,
  calculateEllipsoidVolumeCc,
  DOPPLER_VESSEL_META,
  type CreateUltrasoundInput,
  type UltrasoundReportItem,
  type UltrasoundType,
  type UpdateUltrasoundInput,
} from "../ecografias.schema";

export function mapUltrasoundRow(
  row: typeof ultrasoundReports.$inferSelect
): UltrasoundReportItem {
  return {
    id: row.id,
    patientId: row.patientId,
    consultationId: row.consultationId ?? null,
    doctorId: row.doctorId ?? null,
    doctorName: row.doctorName,
    doctorCmp: row.doctorCmp,
    doctorRne: row.doctorRne ?? "",
    reportDate: row.reportDate,
    ultrasoundType: row.ultrasoundType as UltrasoundType,
    indication: row.indication,
    findings: row.findings ?? {},
    conclusion: row.conclusion,
    recommendations: row.recommendations ?? "",
    images: Array.isArray(row.images) ? row.images : [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function setOptStr<K extends keyof UltrasoundFindingsRecord>(
  target: UltrasoundFindingsRecord,
  key: K,
  value: unknown
) {
  if (typeof value === "string" && value.trim()) {
    target[key] = value.trim() as UltrasoundFindingsRecord[K];
  }
}

function setOptNum<K extends keyof UltrasoundFindingsRecord>(
  target: UltrasoundFindingsRecord,
  key: K,
  value: unknown,
  decimals = 1
) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded =
      decimals === 0 ? Math.round(value) : Number(value.toFixed(decimals));
    target[key] = rounded as UltrasoundFindingsRecord[K];
  }
}

function normalizeBreastLesions(
  rawLesions?: CreateUltrasoundInput["findings"]["breastLesions"]
): UltrasoundBreastLesionRecord[] | undefined {
  if (!Array.isArray(rawLesions) || rawLesions.length === 0) return undefined;
  const cleaned: UltrasoundBreastLesionRecord[] = [];
  for (const l of rawLesions) {
    if (!l || !l.lesionType?.trim()) continue;
    const item: UltrasoundBreastLesionRecord = {
      id: l.id.trim(),
      breastSide: l.breastSide,
      lesionType: l.lesionType.trim(),
    };
    if (l.clockHour?.trim()) item.clockHour = l.clockHour.trim();
    if (l.distanceFromNippleCm?.trim()) {
      item.distanceFromNippleCm = l.distanceFromNippleCm.trim();
    }
    if (l.depthFromSkinMm?.trim()) item.depthFromSkinMm = l.depthFromSkinMm.trim();
    if (l.dimensionsMm?.trim()) item.dimensionsMm = l.dimensionsMm.trim();
    if (l.shape?.trim()) item.shape = l.shape.trim();
    if (l.margins?.trim()) item.margins = l.margins.trim();
    if (l.orientation?.trim()) item.orientation = l.orientation.trim();
    if (l.echoPattern?.trim()) item.echoPattern = l.echoPattern.trim();
    if (l.posteriorAcoustic?.trim()) {
      item.posteriorAcoustic = l.posteriorAcoustic.trim();
    }
    if (l.notes?.trim()) item.notes = l.notes.trim();
    cleaned.push(item);
  }
  return cleaned.length > 0 ? cleaned : undefined;
}

function normalizeDoppler(
  rawDoppler?: CreateUltrasoundInput["findings"]["doppler"]
): UltrasoundDopplerRecord | undefined {
  if (!rawDoppler) return undefined;
  const normalized: UltrasoundDopplerRecord = {};
  let hasAny = false;

  for (const meta of DOPPLER_VESSEL_META) {
    const v = rawDoppler[meta.key];
    if (!v) continue;
    const entry: UltrasoundDopplerVesselRecord = {};
    if (typeof v.pi === "number" && Number.isFinite(v.pi)) {
      entry.pi = Number(v.pi.toFixed(2));
    }
    if (v.percentile?.trim()) entry.percentile = v.percentile.trim();
    if (v.status) entry.status = v.status;
    if (
      entry.pi !== undefined ||
      entry.percentile !== undefined ||
      entry.status !== undefined
    ) {
      normalized[meta.key] = entry;
      hasAny = true;
    }
  }

  if (!hasAny) return undefined;

  const derived = calculateDopplerDerivedIndices(normalized);
  if (
    derived.cerebroplacentalRatioPi !== undefined &&
    normalized.cerebroplacentalRatio?.pi === undefined
  ) {
    normalized.cerebroplacentalRatio = {
      ...normalized.cerebroplacentalRatio,
      pi: derived.cerebroplacentalRatioPi,
    };
  }
  if (
    derived.meanUterinePi !== undefined &&
    normalized.meanUterineArteries?.pi === undefined
  ) {
    normalized.meanUterineArteries = {
      ...normalized.meanUterineArteries,
      pi: derived.meanUterinePi,
    };
  }

  return normalized;
}

function normalizeFindings(
  raw: CreateUltrasoundInput["findings"]
): UltrasoundFindingsRecord {
  const cleaned: UltrasoundFindingsRecord = {};

  // Común
  setOptStr(cleaned, "referringDoctor", raw.referringDoctor);

  // Ginecológica y compartidos I Trimestre
  if (raw.uterusPosition) cleaned.uterusPosition = raw.uterusPosition;
  setOptStr(cleaned, "uterusDimensions", raw.uterusDimensions);
  const autoUterusVol = cleaned.uterusDimensions
    ? calculateEllipsoidVolumeCc(cleaned.uterusDimensions)
    : null;
  if (typeof raw.uterusVolumeCc === "number" && Number.isFinite(raw.uterusVolumeCc)) {
    cleaned.uterusVolumeCc = Number(raw.uterusVolumeCc.toFixed(1));
  } else if (autoUterusVol !== null) {
    cleaned.uterusVolumeCc = autoUterusVol;
  }
  setOptStr(cleaned, "myometriumStatus", raw.myometriumStatus);
  setOptNum(cleaned, "endometriumThicknessMm", raw.endometriumThicknessMm, 1);
  if (raw.endometriumPattern) cleaned.endometriumPattern = raw.endometriumPattern;
  setOptNum(cleaned, "cervixLengthMm", raw.cervixLengthMm, 1);
  setOptStr(cleaned, "cervixStatus", raw.cervixStatus);
  setOptStr(cleaned, "uterusEcopulsionPain", raw.uterusEcopulsionPain);

  setOptStr(cleaned, "rightOvaryDimensions", raw.rightOvaryDimensions);
  const autoROvVol = cleaned.rightOvaryDimensions
    ? calculateEllipsoidVolumeCc(cleaned.rightOvaryDimensions)
    : null;
  if (
    typeof raw.rightOvaryVolumeCc === "number" &&
    Number.isFinite(raw.rightOvaryVolumeCc)
  ) {
    cleaned.rightOvaryVolumeCc = Number(raw.rightOvaryVolumeCc.toFixed(1));
  } else if (autoROvVol !== null) {
    cleaned.rightOvaryVolumeCc = autoROvVol;
  }

  setOptStr(cleaned, "leftOvaryDimensions", raw.leftOvaryDimensions);
  const autoLOvVol = cleaned.leftOvaryDimensions
    ? calculateEllipsoidVolumeCc(cleaned.leftOvaryDimensions)
    : null;
  if (
    typeof raw.leftOvaryVolumeCc === "number" &&
    Number.isFinite(raw.leftOvaryVolumeCc)
  ) {
    cleaned.leftOvaryVolumeCc = Number(raw.leftOvaryVolumeCc.toFixed(1));
  } else if (autoLOvVol !== null) {
    cleaned.leftOvaryVolumeCc = autoLOvVol;
  }

  setOptStr(cleaned, "ovaryEcopulsionPain", raw.ovaryEcopulsionPain);
  setOptStr(cleaned, "periOvarianFluid", raw.periOvarianFluid);
  setOptStr(cleaned, "ovariesNotes", raw.ovariesNotes);
  setOptStr(cleaned, "douglasPouch", raw.douglasPouch);
  setOptStr(cleaned, "endometriosisFoci", raw.endometriosisFoci);
  if (raw.slidingSign) cleaned.slidingSign = raw.slidingSign;
  setOptStr(cleaned, "uterosacralLigaments", raw.uterosacralLigaments);

  // Mama bilateral
  if (raw.breastAcrType) cleaned.breastAcrType = raw.breastAcrType;
  setOptStr(cleaned, "breastPattern", raw.breastPattern);
  setOptStr(cleaned, "rightBreastFindings", raw.rightBreastFindings);
  setOptStr(cleaned, "leftBreastFindings", raw.leftBreastFindings);
  const normalizedLesions = normalizeBreastLesions(raw.breastLesions);
  if (normalizedLesions) cleaned.breastLesions = normalizedLesions;
  setOptStr(cleaned, "breastComplement", raw.breastComplement);
  if (raw.biradsCategory) cleaned.biradsCategory = raw.biradsCategory;

  // Obstétrica I Trimestre y Genética
  setOptNum(cleaned, "gestationalSacsCount", raw.gestationalSacsCount, 0);
  setOptNum(cleaned, "gestationalSacMm", raw.gestationalSacMm, 1);
  setOptNum(cleaned, "yolkSacMm", raw.yolkSacMm, 1);
  setOptNum(cleaned, "embryoCrownRumpLengthMm", raw.embryoCrownRumpLengthMm, 1);
  setOptStr(cleaned, "gestationalAgeByEcho", raw.gestationalAgeByEcho);
  setOptNum(cleaned, "fetalHeartRate", raw.fetalHeartRate, 0);
  setOptStr(cleaned, "choriodecidualReaction", raw.choriodecidualReaction);
  setOptNum(cleaned, "nuchalTranslucencyMm", raw.nuchalTranslucencyMm, 1);
  if (raw.nasalBone) cleaned.nasalBone = raw.nasalBone;
  if (raw.ductusVenosusWave) cleaned.ductusVenosusWave = raw.ductusVenosusWave;
  setOptNum(cleaned, "ductusVenosusPi", raw.ductusVenosusPi, 2);
  setOptNum(cleaned, "uterineArteriesMeanPi", raw.uterineArteriesMeanPi, 2);
  if (raw.chromosomopathyRisk) cleaned.chromosomopathyRisk = raw.chromosomopathyRisk;
  if (raw.preeclampsiaRisk) cleaned.preeclampsiaRisk = raw.preeclampsiaRisk;

  // Obstétrica II-III Trimestre, Morfológica & Doppler
  setOptStr(cleaned, "fetalStatic", raw.fetalStatic);
  if (raw.fetalSex) cleaned.fetalSex = raw.fetalSex;
  setOptStr(cleaned, "fetalAnatomySummary", raw.fetalAnatomySummary);
  setOptStr(cleaned, "fetalHeartFourChambers", raw.fetalHeartFourChambers);
  setOptStr(cleaned, "fetalAbdominalWall", raw.fetalAbdominalWall);
  setOptStr(cleaned, "fetalKidneys", raw.fetalKidneys);
  setOptStr(cleaned, "fetalSpine", raw.fetalSpine);
  setOptNum(cleaned, "bpdMm", raw.bpdMm, 1);
  setOptNum(cleaned, "hcMm", raw.hcMm, 1);
  setOptNum(cleaned, "acMm", raw.acMm, 1);
  setOptNum(cleaned, "flMm", raw.flMm, 1);
  setOptNum(cleaned, "estimatedFetalWeightGr", raw.estimatedFetalWeightGr, 0);
  setOptStr(
    cleaned,
    "estimatedFetalWeightPercentile",
    raw.estimatedFetalWeightPercentile
  );
  setOptNum(cleaned, "bppBodyMovements", raw.bppBodyMovements, 0);
  setOptNum(cleaned, "bppBreathingMovements", raw.bppBreathingMovements, 0);
  setOptNum(cleaned, "bppMuscleTone", raw.bppMuscleTone, 0);
  setOptNum(cleaned, "bppAmnioticFluid", raw.bppAmnioticFluid, 0);
  setOptStr(cleaned, "placentaLocation", raw.placentaLocation);
  setOptStr(cleaned, "placentaGrade", raw.placentaGrade);
  setOptStr(cleaned, "placentaHematomas", raw.placentaHematomas);
  setOptStr(cleaned, "umbilicalCord", raw.umbilicalCord);
  setOptStr(cleaned, "amnioticFluidIndex", raw.amnioticFluidIndex);
  setOptNum(cleaned, "amnioticFluidIlaMm", raw.amnioticFluidIlaMm, 1);
  if (typeof raw.includeDoppler === "boolean") {
    cleaned.includeDoppler = raw.includeDoppler;
  }
  const normalizedDoppler = normalizeDoppler(raw.doppler);
  if (normalizedDoppler) cleaned.doppler = normalizedDoppler;

  return cleaned;
}

function validateAndNormalizeImages(
  images: CreateUltrasoundInput["images"],
  tenantId: string,
  patientId: string
) {
  return images.map((img, idx) => {
    const cleanPath = img.storagePath.trim();
    if (!isValidPatientClinicalImagePath(cleanPath, tenantId, patientId, "ecografias")) {
      throw new DomainError(
        `La imagen #${idx + 1} no pertenece a una ruta clínica autorizada de esta paciente.`
      );
    }
    return {
      storagePath: cleanPath,
      caption: img.caption.trim() || `Captura ecográfica ${idx + 1}`,
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

export async function listUltrasoundsByPatient(
  tenantId: string,
  patientId: string
): Promise<UltrasoundReportItem[]> {
  const rows = await db
    .select()
    .from(ultrasoundReports)
    .where(
      and(
        eq(ultrasoundReports.tenantId, tenantId),
        eq(ultrasoundReports.patientId, patientId),
        isNull(ultrasoundReports.deletedAt)
      )
    )
    .orderBy(desc(ultrasoundReports.reportDate), desc(ultrasoundReports.createdAt));

  return rows.map(mapUltrasoundRow);
}

export async function createUltrasound(
  ctx: SessionPayload,
  actorName: string,
  input: CreateUltrasoundInput
): Promise<UltrasoundReportItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  await assertPatientExists(ctx.tenantId, input.patientId);
  const consultationId = await assertValidConsultationLink(
    ctx.tenantId,
    input.patientId,
    input.consultationId
  );

  const normalizedImages = validateAndNormalizeImages(
    input.images,
    ctx.tenantId,
    input.patientId
  );
  const normalizedFindings = normalizeFindings(input.findings);
  const creds = await resolveDoctorCredentials(ctx.tenantId, ctx.userId, actorName);

  const [created] = await db
    .insert(ultrasoundReports)
    .values({
      tenantId: ctx.tenantId,
      patientId: input.patientId,
      consultationId,
      doctorId: creds.doctorId,
      doctorName: creds.doctorName,
      doctorCmp: creds.doctorCmp,
      doctorRne: creds.doctorRne || null,
      reportDate: input.reportDate,
      ultrasoundType: input.ultrasoundType,
      indication: input.indication.trim(),
      findings: normalizedFindings,
      conclusion: input.conclusion.trim(),
      recommendations: input.recommendations?.trim() || null,
      images: normalizedImages,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "ultrasound_report",
    entityId: created.id,
    changesSummary: {
      patientId: input.patientId,
      ultrasoundType: created.ultrasoundType,
      reportDate: created.reportDate,
      imagesCount: normalizedImages.length,
    },
  });

  return mapUltrasoundRow(created);
}

export async function updateUltrasound(
  ctx: SessionPayload,
  actorName: string,
  input: UpdateUltrasoundInput
): Promise<UltrasoundReportItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const [existing] = await db
    .select()
    .from(ultrasoundReports)
    .where(
      and(
        eq(ultrasoundReports.id, input.id),
        eq(ultrasoundReports.tenantId, ctx.tenantId),
        eq(ultrasoundReports.patientId, input.patientId),
        isNull(ultrasoundReports.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Informe ecográfico no encontrado o archivado.");
  }

  const consultationId = await assertValidConsultationLink(
    ctx.tenantId,
    input.patientId,
    input.consultationId
  );

  const normalizedImages = validateAndNormalizeImages(
    input.images,
    ctx.tenantId,
    input.patientId
  );
  const normalizedFindings = normalizeFindings(input.findings);

  const [updated] = await db
    .update(ultrasoundReports)
    .set({
      consultationId,
      reportDate: input.reportDate,
      ultrasoundType: input.ultrasoundType,
      indication: input.indication.trim(),
      findings: normalizedFindings,
      conclusion: input.conclusion.trim(),
      recommendations: input.recommendations?.trim() || null,
      images: normalizedImages,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(ultrasoundReports.id, input.id),
        eq(ultrasoundReports.tenantId, ctx.tenantId)
      )
    )
    .returning();

  if (!updated) {
    throw new DomainError("No se pudo actualizar el informe ecográfico.");
  }

  const nextPathSet = new Set(normalizedImages.map((img) => img.storagePath));
  const orphanedPaths = (existing.images ?? [])
    .map((img) => img.storagePath)
    .filter(
      (p) =>
        !nextPathSet.has(p) &&
        isValidPatientClinicalImagePath(p, ctx.tenantId!, existing.patientId, "ecografias")
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
    entityType: "ultrasound_report",
    entityId: updated.id,
    changesSummary: {
      patientId: input.patientId,
      ultrasoundType: updated.ultrasoundType,
      imagesCount: normalizedImages.length,
      orphanedCleaned: orphanedPaths.length,
    },
  });

  return mapUltrasoundRow(updated);
}

export async function softDeleteUltrasound(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string; deleted: true }> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const [deleted] = await db
    .update(ultrasoundReports)
    .set({
      deletedAt: new Date(),
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(ultrasoundReports.id, id),
        eq(ultrasoundReports.tenantId, ctx.tenantId),
        isNull(ultrasoundReports.deletedAt)
      )
    )
    .returning({ id: ultrasoundReports.id, patientId: ultrasoundReports.patientId });

  if (!deleted) {
    throw new DomainError("Informe ecográfico no encontrado o ya eliminado.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "ultrasound_report",
    entityId: deleted.id,
    changesSummary: {
      patientId: deleted.patientId,
      softDelete: true,
    },
  });

  return { id: deleted.id, deleted: true };
}
