import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  clinicalCheckups,
  colposcopyReports,
  medicalConsultations,
  patientDocuments,
  patients,
  profiles,
  ultrasoundReports,
} from "@/db/schema";
import type { CheckupDossierItemRecord } from "@/db/schema/clinical";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import {
  CHECKUP_STATUSES,
  normalizeDossierConfig,
  type CheckupStatus,
  type ClinicalCheckupItem,
  type CreateCheckupInput,
  type UpdateCheckupInput,
} from "../chequeos.schema";

function normalizeStatus(raw: string): CheckupStatus {
  return (CHECKUP_STATUSES as readonly string[]).includes(raw)
    ? (raw as CheckupStatus)
    : "EN_PROCESO";
}

export function mapCheckupRow(
  row: typeof clinicalCheckups.$inferSelect
): ClinicalCheckupItem {
  return {
    id: row.id,
    patientId: row.patientId,
    consultationId: row.consultationId ?? null,
    doctorId: row.doctorId ?? null,
    doctorName: row.doctorName,
    doctorCmp: row.doctorCmp,
    doctorRne: row.doctorRne ?? "",
    checkupDate: row.checkupDate,
    reasonForConsultation: row.reasonForConsultation ?? "",
    breastUltrasoundFindings: row.breastUltrasoundFindings ?? "",
    breastUltrasoundBirads: row.breastUltrasoundBirads ?? "",
    breastLesionMeasurements: row.breastLesionMeasurements ?? "",
    transvaginalUltrasoundFindings: row.transvaginalUltrasoundFindings ?? "",
    uterusMeasurements: row.uterusMeasurements ?? "",
    endometriumThicknessMm:
      row.endometriumThicknessMm !== null &&
      row.endometriumThicknessMm !== undefined
        ? Number(row.endometriumThicknessMm)
        : null,
    ovariesFindings: row.ovariesFindings ?? "",
    colposcopyFindings: row.colposcopyFindings ?? "",
    colposcopyResult: row.colposcopyResult ?? "",
    papResult: row.papResult ?? "",
    vphResult: row.vphResult ?? "",
    conclusions: row.conclusions ?? "",
    cie10Code: row.cie10Code ?? "",
    medicalPrescription: row.medicalPrescription ?? "",
    status: normalizeStatus(row.status),
    dossierConfig: normalizeDossierConfig(row.dossierConfig),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
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

export async function assertDossierRefsBelongToPatient(
  tenantId: string,
  patientId: string,
  items: CheckupDossierItemRecord[]
): Promise<void> {
  if (items.length === 0) return;

  const ecoIds = Array.from(
    new Set(items.filter((i) => i.kind === "ULTRASOUND").map((i) => i.refId))
  );
  const colpoIds = Array.from(
    new Set(items.filter((i) => i.kind === "COLPOSCOPY").map((i) => i.refId))
  );
  const docIds = Array.from(
    new Set(items.filter((i) => i.kind === "DOCUMENT").map((i) => i.refId))
  );

  const [foundEco, foundColpo, foundDocs] = await Promise.all([
    ecoIds.length > 0
      ? db
          .select({ id: ultrasoundReports.id })
          .from(ultrasoundReports)
          .where(
            and(
              eq(ultrasoundReports.tenantId, tenantId),
              eq(ultrasoundReports.patientId, patientId),
              isNull(ultrasoundReports.deletedAt),
              inArray(ultrasoundReports.id, ecoIds)
            )
          )
      : Promise.resolve([]),
    colpoIds.length > 0
      ? db
          .select({ id: colposcopyReports.id })
          .from(colposcopyReports)
          .where(
            and(
              eq(colposcopyReports.tenantId, tenantId),
              eq(colposcopyReports.patientId, patientId),
              isNull(colposcopyReports.deletedAt),
              inArray(colposcopyReports.id, colpoIds)
            )
          )
      : Promise.resolve([]),
    docIds.length > 0
      ? db
          .select({ id: patientDocuments.id })
          .from(patientDocuments)
          .where(
            and(
              eq(patientDocuments.tenantId, tenantId),
              eq(patientDocuments.patientId, patientId),
              isNull(patientDocuments.deletedAt),
              inArray(patientDocuments.id, docIds)
            )
          )
      : Promise.resolve([]),
  ]);

  if (
    foundEco.length !== ecoIds.length ||
    foundColpo.length !== colpoIds.length ||
    foundDocs.length !== docIds.length
  ) {
    throw new DomainError(
      "Uno o más estudios o PDFs seleccionados no pertenecen a esta paciente o fueron eliminados."
    );
  }
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
    doctorCmp: doc.cmp,
    doctorRne: doc.rne ?? "",
  };
}

export async function listCheckupsByPatient(
  tenantId: string,
  patientId: string
): Promise<ClinicalCheckupItem[]> {
  const rows = await db
    .select()
    .from(clinicalCheckups)
    .where(
      and(
        eq(clinicalCheckups.tenantId, tenantId),
        eq(clinicalCheckups.patientId, patientId),
        isNull(clinicalCheckups.deletedAt)
      )
    )
    .orderBy(desc(clinicalCheckups.checkupDate), desc(clinicalCheckups.createdAt));

  return rows.map(mapCheckupRow);
}

export async function getCheckupById(
  tenantId: string,
  id: string
): Promise<ClinicalCheckupItem | null> {
  const [row] = await db
    .select()
    .from(clinicalCheckups)
    .where(
      and(
        eq(clinicalCheckups.id, id),
        eq(clinicalCheckups.tenantId, tenantId),
        isNull(clinicalCheckups.deletedAt)
      )
    )
    .limit(1);

  return row ? mapCheckupRow(row) : null;
}

export async function createCheckup(
  ctx: SessionPayload,
  actorName: string,
  input: CreateCheckupInput
): Promise<ClinicalCheckupItem> {
  if (!ctx.tenantId) {
    throw new DomainError("Sede clínica no asociada a la sesión.");
  }

  await assertPatientExists(ctx.tenantId, input.patientId);
  const consultationId = await assertValidConsultationLink(
    ctx.tenantId,
    input.patientId,
    input.consultationId
  );

  const normalizedConfig = normalizeDossierConfig(input.dossierConfig);
  await assertDossierRefsBelongToPatient(
    ctx.tenantId,
    input.patientId,
    normalizedConfig.items
  );

  const creds = await resolveDoctorCredentials(
    ctx.tenantId,
    ctx.userId,
    actorName
  );

  const [created] = await db
    .insert(clinicalCheckups)
    .values({
      tenantId: ctx.tenantId,
      patientId: input.patientId,
      consultationId,
      doctorId: creds.doctorId,
      doctorName: creds.doctorName,
      doctorCmp: creds.doctorCmp,
      doctorRne: creds.doctorRne || null,
      checkupDate: input.checkupDate,
      reasonForConsultation: input.reasonForConsultation.trim(),
      breastUltrasoundFindings: input.breastUltrasoundFindings?.trim() || null,
      breastUltrasoundBirads:
        input.breastUltrasoundBirads?.trim() || "BI-RADS 1 (Normal)",
      breastLesionMeasurements: input.breastLesionMeasurements?.trim() || null,
      transvaginalUltrasoundFindings:
        input.transvaginalUltrasoundFindings?.trim() || null,
      uterusMeasurements: input.uterusMeasurements?.trim() || null,
      endometriumThicknessMm:
        input.endometriumThicknessMm != null
          ? input.endometriumThicknessMm.toFixed(2)
          : null,
      ovariesFindings: input.ovariesFindings?.trim() || null,
      colposcopyFindings: input.colposcopyFindings?.trim() || null,
      colposcopyResult: input.colposcopyResult?.trim() || null,
      papResult: input.papResult?.trim() || null,
      vphResult: input.vphResult?.trim() || null,
      conclusions: input.conclusions.trim(),
      cie10Code: input.cie10Code?.trim().toUpperCase() || null,
      medicalPrescription: input.medicalPrescription?.trim() || null,
      status: input.status,
      dossierConfig: normalizedConfig,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "clinical_checkup",
    entityId: created.id,
    changesSummary: {
      patientId: input.patientId,
      checkupDate: created.checkupDate,
      status: created.status,
      dossierItemsCount: normalizedConfig.items.length,
    },
  });

  return mapCheckupRow(created);
}

export async function updateCheckup(
  ctx: SessionPayload,
  actorName: string,
  input: UpdateCheckupInput
): Promise<ClinicalCheckupItem> {
  if (!ctx.tenantId) {
    throw new DomainError("Sede clínica no asociada a la sesión.");
  }

  const [existing] = await db
    .select()
    .from(clinicalCheckups)
    .where(
      and(
        eq(clinicalCheckups.id, input.id),
        eq(clinicalCheckups.tenantId, ctx.tenantId),
        eq(clinicalCheckups.patientId, input.patientId),
        isNull(clinicalCheckups.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Chequeo integral no encontrado o sin acceso.");
  }

  const consultationId = await assertValidConsultationLink(
    ctx.tenantId,
    input.patientId,
    input.consultationId
  );

  const normalizedConfig = normalizeDossierConfig(input.dossierConfig);
  await assertDossierRefsBelongToPatient(
    ctx.tenantId,
    input.patientId,
    normalizedConfig.items
  );

  const [updated] = await db
    .update(clinicalCheckups)
    .set({
      consultationId,
      checkupDate: input.checkupDate,
      reasonForConsultation: input.reasonForConsultation.trim(),
      breastUltrasoundFindings: input.breastUltrasoundFindings?.trim() || null,
      breastUltrasoundBirads:
        input.breastUltrasoundBirads?.trim() || "BI-RADS 1 (Normal)",
      breastLesionMeasurements: input.breastLesionMeasurements?.trim() || null,
      transvaginalUltrasoundFindings:
        input.transvaginalUltrasoundFindings?.trim() || null,
      uterusMeasurements: input.uterusMeasurements?.trim() || null,
      endometriumThicknessMm:
        input.endometriumThicknessMm != null
          ? input.endometriumThicknessMm.toFixed(2)
          : null,
      ovariesFindings: input.ovariesFindings?.trim() || null,
      colposcopyFindings: input.colposcopyFindings?.trim() || null,
      colposcopyResult: input.colposcopyResult?.trim() || null,
      papResult: input.papResult?.trim() || null,
      vphResult: input.vphResult?.trim() || null,
      conclusions: input.conclusions.trim(),
      cie10Code: input.cie10Code?.trim().toUpperCase() || null,
      medicalPrescription: input.medicalPrescription?.trim() || null,
      status: input.status,
      dossierConfig: normalizedConfig,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(clinicalCheckups.id, existing.id))
    .returning();

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "clinical_checkup",
    entityId: updated.id,
    changesSummary: {
      patientId: input.patientId,
      checkupDate: updated.checkupDate,
      status: updated.status,
      dossierItemsCount: normalizedConfig.items.length,
    },
  });

  return mapCheckupRow(updated);
}

export async function softDeleteCheckup(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string; patientId: string }> {
  if (!ctx.tenantId) {
    throw new DomainError("Sede clínica no asociada a la sesión.");
  }

  const [existing] = await db
    .select()
    .from(clinicalCheckups)
    .where(
      and(
        eq(clinicalCheckups.id, id),
        eq(clinicalCheckups.tenantId, ctx.tenantId),
        isNull(clinicalCheckups.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Chequeo integral no encontrado o ya eliminado.");
  }

  await db
    .update(clinicalCheckups)
    .set({
      deletedAt: new Date(),
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(clinicalCheckups.id, existing.id));

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "clinical_checkup",
    entityId: existing.id,
    changesSummary: {
      patientId: existing.patientId,
      checkupDate: existing.checkupDate,
    },
  });

  return { id: existing.id, patientId: existing.patientId };
}
