import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  medicalConsultations,
  minorProcedures,
  patientBackgrounds,
  patients,
  profiles,
} from "@/db/schema";
import type {
  MinorProcedureDetailsRecord,
  ProcedurePathologyStatus,
} from "@/db/schema/specialty";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import {
  isContraceptiveDeviceProcedure,
  PATHOLOGY_STATUS_OPTIONS,
  PROCEDURE_TYPES,
  resolveSuggestedMacFromProcedure,
  type CreateMinorProcedureInput,
  type MinorProcedureItem,
  type ProcedureType,
  type UpdateMinorProcedureInput,
} from "../procedimientos.schema";

function normalizeProcedureType(raw: string): ProcedureType {
  if ((PROCEDURE_TYPES as readonly string[]).includes(raw)) {
    return raw as ProcedureType;
  }
  return "OTRO";
}

function normalizeProcedureDetails(
  raw: MinorProcedureDetailsRecord | null | undefined
): MinorProcedureDetailsRecord {
  const sent = Boolean(raw?.specimenSentToPathology);
  const rawStatus = raw?.pathologyStatus;
  let pathologyStatus: ProcedurePathologyStatus = "NO_APLICA";
  if (sent) {
    pathologyStatus =
      rawStatus &&
      (PATHOLOGY_STATUS_OPTIONS as readonly string[]).includes(rawStatus) &&
      rawStatus !== "NO_APLICA"
        ? rawStatus
        : "PENDIENTE";
  }

  return {
    asepsisTechnique:
      raw?.asepsisTechnique?.trim() ||
      "Asepsia y antisepsia local con solución antiséptica y campos estériles.",
    biopsySites: raw?.biopsySites?.trim() || "",
    specimenSentToPathology: sent,
    specimenDescription: sent ? raw?.specimenDescription?.trim() || "" : "",
    bleedingAmount: raw?.bleedingAmount?.trim() || "Mínimo (< 10 ml)",
    hemostasisMethod: raw?.hemostasisMethod?.trim() || "Solución de Monsel",
    complications:
      raw?.complications?.trim() ||
      "Ninguna. Procedimiento tolerado sin eventualidades.",
    informedConsentConfirmed: raw?.informedConsentConfirmed ?? true,
    deviceInfo: raw?.deviceInfo?.trim() || "",
    pathologyStatus,
    pathologyResultNotes: raw?.pathologyResultNotes?.trim() || "",
  };
}

export function mapMinorProcedureRow(
  row: typeof minorProcedures.$inferSelect
): MinorProcedureItem {
  return {
    id: row.id,
    patientId: row.patientId,
    consultationId: row.consultationId ?? null,
    doctorId: row.doctorId ?? null,
    doctorName: row.doctorName,
    doctorCmp: row.doctorCmp,
    doctorRne: row.doctorRne ?? "",
    procedureDate: row.procedureDate,
    procedureType: normalizeProcedureType(row.procedureType),
    preOpDiagnosis: row.preOpDiagnosis,
    postOpDiagnosis: row.postOpDiagnosis,
    cie10Code: row.cie10Code ?? "",
    anesthesiaType: row.anesthesiaType,
    procedureDetails: normalizeProcedureDetails(row.procedureDetails),
    postOpIndications: row.postOpIndications,
    medicationsPrescribed: row.medicationsPrescribed ?? "",
    nextControlDate: row.nextControlDate ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function assertPatientAndConsultationOwnership(
  tenantId: string,
  patientId: string,
  consultationId?: string | null
) {
  const cleanConsultationId = consultationId?.trim() || null;

  const [[patient], [consultation]] = await Promise.all([
    db
      .select({ id: patients.id })
      .from(patients)
      .where(
        and(
          eq(patients.id, patientId),
          eq(patients.tenantId, tenantId),
          isNull(patients.deletedAt)
        )
      )
      .limit(1),
    cleanConsultationId
      ? db
          .select({
            id: medicalConsultations.id,
            patientId: medicalConsultations.patientId,
          })
          .from(medicalConsultations)
          .where(
            and(
              eq(medicalConsultations.id, cleanConsultationId),
              eq(medicalConsultations.tenantId, tenantId),
              isNull(medicalConsultations.deletedAt)
            )
          )
          .limit(1)
      : Promise.resolve([undefined]),
  ]);

  if (!patient) {
    throw new DomainError("La paciente seleccionada no existe o fue archivada.");
  }

  if (cleanConsultationId) {
    if (!consultation || consultation.patientId !== patientId) {
      throw new DomainError(
        "La consulta asociada no pertenece a la paciente seleccionada."
      );
    }
  }
}

async function resolveDoctorCredentials(
  tenantId: string,
  userId: string,
  fallbackName: string
): Promise<{ doctorName: string; doctorCmp: string; doctorRne: string }> {
  const [doctor] = await db
    .select({
      doctorTitle: profiles.doctorTitle,
      fullName: profiles.fullName,
      cmp: profiles.cmp,
      rne: profiles.rne,
    })
    .from(profiles)
    .where(and(eq(profiles.id, userId), eq(profiles.tenantId, tenantId)))
    .limit(1);

  if (!doctor) {
    return {
      doctorName: fallbackName,
      doctorCmp: "61693",
      doctorRne: "38657",
    };
  }

  return {
    doctorName: `${doctor.doctorTitle} ${doctor.fullName}`.trim(),
    doctorCmp: doctor.cmp || "61693",
    doctorRne: doctor.rne ?? "",
  };
}

async function syncPatientContraceptiveMethodIfRequested(
  ctx: SessionPayload,
  patientId: string,
  procedureType: ProcedureType,
  deviceInfo?: string,
  shouldSync?: boolean
): Promise<string | null> {
  if (!shouldSync || !ctx.tenantId || !isContraceptiveDeviceProcedure(procedureType)) {
    return null;
  }

  const newMac = resolveSuggestedMacFromProcedure(procedureType, deviceInfo);
  if (!newMac) return null;

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
        contraceptiveMethod: newMac,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(eq(patientBackgrounds.id, existingBg.id));
  } else {
    await db.insert(patientBackgrounds).values({
      tenantId: ctx.tenantId,
      patientId,
      obstetricFormula: "G0 P0000",
      contraceptiveMethod: newMac,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    });
  }

  return newMac;
}

export async function listMinorProceduresByPatient(
  tenantId: string,
  patientId: string
): Promise<MinorProcedureItem[]> {
  const rows = await db
    .select()
    .from(minorProcedures)
    .where(
      and(
        eq(minorProcedures.tenantId, tenantId),
        eq(minorProcedures.patientId, patientId),
        isNull(minorProcedures.deletedAt)
      )
    )
    .orderBy(
      desc(minorProcedures.procedureDate),
      desc(minorProcedures.createdAt)
    );

  return rows.map(mapMinorProcedureRow);
}

export async function createMinorProcedure(
  ctx: SessionPayload,
  actorName: string,
  input: CreateMinorProcedureInput
): Promise<MinorProcedureItem & { syncedMac?: string | null }> {
  if (!ctx.tenantId) {
    throw new DomainError("Sede no asociada a la sesión.");
  }

  const consultationId = input.consultationId?.trim() || null;
  await assertPatientAndConsultationOwnership(
    ctx.tenantId,
    input.patientId,
    consultationId
  );

  const doctorCreds = await resolveDoctorCredentials(
    ctx.tenantId,
    ctx.userId,
    actorName
  );
  const cleanDetails = normalizeProcedureDetails(input.procedureDetails);
  const cleanCie10 = (input.cie10Code ?? "").trim().toUpperCase();

  const [created] = await db
    .insert(minorProcedures)
    .values({
      tenantId: ctx.tenantId,
      patientId: input.patientId,
      consultationId,
      doctorId: ctx.userId,
      doctorName: doctorCreds.doctorName,
      doctorCmp: doctorCreds.doctorCmp,
      doctorRne: doctorCreds.doctorRne || null,
      procedureDate: input.procedureDate,
      procedureType: input.procedureType,
      preOpDiagnosis: input.preOpDiagnosis.trim(),
      postOpDiagnosis: input.postOpDiagnosis.trim(),
      cie10Code: cleanCie10 || null,
      anesthesiaType: input.anesthesiaType.trim(),
      procedureDetails: cleanDetails,
      postOpIndications: input.postOpIndications.trim(),
      medicationsPrescribed: input.medicationsPrescribed?.trim() || null,
      nextControlDate: input.nextControlDate?.trim() || null,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  const syncedMac = await syncPatientContraceptiveMethodIfRequested(
    ctx,
    input.patientId,
    input.procedureType,
    cleanDetails.deviceInfo,
    input.syncPatientMac
  );

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "minor_procedure",
    entityId: created.id,
    changesSummary: {
      patientId: created.patientId,
      procedureType: created.procedureType,
      procedureDate: created.procedureDate,
      specimenSentToPathology: cleanDetails.specimenSentToPathology,
      syncedMac,
    },
  });

  return {
    ...mapMinorProcedureRow(created),
    syncedMac,
  };
}

export async function updateMinorProcedure(
  ctx: SessionPayload,
  actorName: string,
  input: UpdateMinorProcedureInput
): Promise<MinorProcedureItem & { syncedMac?: string | null }> {
  if (!ctx.tenantId) {
    throw new DomainError("Sede no asociada a la sesión.");
  }

  const [existing] = await db
    .select()
    .from(minorProcedures)
    .where(
      and(
        eq(minorProcedures.id, input.id),
        eq(minorProcedures.tenantId, ctx.tenantId),
        isNull(minorProcedures.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Procedimiento menor no encontrado o archivado.");
  }

  if (existing.patientId !== input.patientId) {
    throw new DomainError(
      "No se permite reasignar un procedimiento a otra paciente."
    );
  }

  const consultationId = input.consultationId?.trim() || null;
  await assertPatientAndConsultationOwnership(
    ctx.tenantId,
    input.patientId,
    consultationId
  );

  const cleanDetails = normalizeProcedureDetails(input.procedureDetails);
  const cleanCie10 = (input.cie10Code ?? "").trim().toUpperCase();

  const [updated] = await db
    .update(minorProcedures)
    .set({
      consultationId,
      procedureDate: input.procedureDate,
      procedureType: input.procedureType,
      preOpDiagnosis: input.preOpDiagnosis.trim(),
      postOpDiagnosis: input.postOpDiagnosis.trim(),
      cie10Code: cleanCie10 || null,
      anesthesiaType: input.anesthesiaType.trim(),
      procedureDetails: cleanDetails,
      postOpIndications: input.postOpIndications.trim(),
      medicationsPrescribed: input.medicationsPrescribed?.trim() || null,
      nextControlDate: input.nextControlDate?.trim() || null,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(minorProcedures.id, existing.id))
    .returning();

  const syncedMac = await syncPatientContraceptiveMethodIfRequested(
    ctx,
    input.patientId,
    input.procedureType,
    cleanDetails.deviceInfo,
    input.syncPatientMac
  );

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "minor_procedure",
    entityId: updated.id,
    changesSummary: {
      patientId: updated.patientId,
      procedureType: updated.procedureType,
      pathologyStatus: cleanDetails.pathologyStatus,
      syncedMac,
    },
  });

  return {
    ...mapMinorProcedureRow(updated),
    syncedMac,
  };
}

export async function softDeleteMinorProcedure(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string }> {
  if (!ctx.tenantId) {
    throw new DomainError("Sede no asociada a la sesión.");
  }

  const [existing] = await db
    .select()
    .from(minorProcedures)
    .where(
      and(
        eq(minorProcedures.id, id),
        eq(minorProcedures.tenantId, ctx.tenantId),
        isNull(minorProcedures.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Procedimiento menor no encontrado.");
  }

  await db
    .update(minorProcedures)
    .set({
      deletedAt: new Date(),
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(minorProcedures.id, existing.id));

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "minor_procedure",
    entityId: existing.id,
    changesSummary: {
      patientId: existing.patientId,
      procedureType: existing.procedureType,
      procedureDate: existing.procedureDate,
    },
  });

  return { id: existing.id };
}
