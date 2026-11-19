import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  medicalConsultations,
  patients,
  profiles,
  ultrasoundReports,
} from "@/db/schema";
import type { UltrasoundFindingsRecord } from "@/db/schema/specialty";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { isValidPatientClinicalImagePath } from "@/lib/clinical-images";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import { deletePrivateStorageObject } from "@/lib/supabase/storage";
import {
  calculateEllipsoidVolumeCc,
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

function normalizeFindings(
  raw: CreateUltrasoundInput["findings"]
): UltrasoundFindingsRecord {
  const cleaned: UltrasoundFindingsRecord = {};

  if (raw.uterusPosition) cleaned.uterusPosition = raw.uterusPosition;
  if (raw.uterusDimensions?.trim()) {
    cleaned.uterusDimensions = raw.uterusDimensions.trim();
  }

  const autoVolume = cleaned.uterusDimensions
    ? calculateEllipsoidVolumeCc(cleaned.uterusDimensions)
    : null;
  if (typeof raw.uterusVolumeCc === "number" && Number.isFinite(raw.uterusVolumeCc)) {
    cleaned.uterusVolumeCc = Number(raw.uterusVolumeCc.toFixed(1));
  } else if (autoVolume !== null) {
    cleaned.uterusVolumeCc = autoVolume;
  }

  if (raw.myometriumStatus?.trim()) cleaned.myometriumStatus = raw.myometriumStatus.trim();
  if (
    typeof raw.endometriumThicknessMm === "number" &&
    Number.isFinite(raw.endometriumThicknessMm)
  ) {
    cleaned.endometriumThicknessMm = Number(raw.endometriumThicknessMm.toFixed(1));
  }
  if (raw.endometriumPattern) cleaned.endometriumPattern = raw.endometriumPattern;
  if (raw.rightOvaryDimensions?.trim()) {
    cleaned.rightOvaryDimensions = raw.rightOvaryDimensions.trim();
  }
  if (raw.leftOvaryDimensions?.trim()) {
    cleaned.leftOvaryDimensions = raw.leftOvaryDimensions.trim();
  }
  if (raw.ovariesNotes?.trim()) cleaned.ovariesNotes = raw.ovariesNotes.trim();
  if (raw.douglasPouch?.trim()) cleaned.douglasPouch = raw.douglasPouch.trim();
  if (raw.endometriosisFoci?.trim()) cleaned.endometriosisFoci = raw.endometriosisFoci.trim();
  if (raw.slidingSign) cleaned.slidingSign = raw.slidingSign;
  if (raw.uterosacralLigaments?.trim()) {
    cleaned.uterosacralLigaments = raw.uterosacralLigaments.trim();
  }

  if (raw.breastPattern?.trim()) cleaned.breastPattern = raw.breastPattern.trim();
  if (raw.rightBreastFindings?.trim()) {
    cleaned.rightBreastFindings = raw.rightBreastFindings.trim();
  }
  if (raw.leftBreastFindings?.trim()) {
    cleaned.leftBreastFindings = raw.leftBreastFindings.trim();
  }
  if (raw.biradsCategory) cleaned.biradsCategory = raw.biradsCategory;

  if (
    typeof raw.gestationalSacsCount === "number" &&
    Number.isFinite(raw.gestationalSacsCount)
  ) {
    cleaned.gestationalSacsCount = raw.gestationalSacsCount;
  }
  if (
    typeof raw.embryoCrownRumpLengthMm === "number" &&
    Number.isFinite(raw.embryoCrownRumpLengthMm)
  ) {
    cleaned.embryoCrownRumpLengthMm = Number(raw.embryoCrownRumpLengthMm.toFixed(1));
  }
  if (raw.gestationalAgeByEcho?.trim()) {
    cleaned.gestationalAgeByEcho = raw.gestationalAgeByEcho.trim();
  }
  if (typeof raw.fetalHeartRate === "number" && Number.isFinite(raw.fetalHeartRate)) {
    cleaned.fetalHeartRate = raw.fetalHeartRate;
  }
  if (raw.placentaLocation?.trim()) cleaned.placentaLocation = raw.placentaLocation.trim();
  if (raw.amnioticFluidIndex?.trim()) {
    cleaned.amnioticFluidIndex = raw.amnioticFluidIndex.trim();
  }

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
