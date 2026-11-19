import { and, asc, count, desc, eq, gte, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  medicalAppointments,
  medicalConsultations,
  patientBackgrounds,
  patients,
} from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import { calculateAge, getPeruDateString } from "@/lib/utils";
import type {
  PatientBackgroundInput,
  PatientBackgroundItem,
  PatientClinicalCounts,
  PatientDetailData,
  PatientDirectoryItem,
  PatientInput,
  UpdatePatientInput,
} from "../pacientes.schema";

function mapBackgroundRow(
  row: typeof patientBackgrounds.$inferSelect
): PatientBackgroundItem {
  return {
    id: row.id,
    patientId: row.patientId,
    menarche: row.menarche ?? null,
    sexualDebutAge: row.sexualDebutAge ?? null,
    sexualPartnersCount: row.sexualPartnersCount ?? null,
    catamenialRegimen: row.catamenialRegimen ?? "28/4",
    stiHistory: row.stiHistory ?? "Niega ITS",
    obstetricFormula: row.obstetricFormula ?? "G0 P0000",
    contraceptiveMethod: row.contraceptiveMethod ?? "Ninguno",
    lastMenstrualPeriod: row.lastMenstrualPeriod ?? "",
    papHistory: row.papHistory ?? "No refiere",
    vphTestHistory: row.vphTestHistory ?? "No realizado",
    hasDiabetes: row.hasDiabetes ?? "Niega",
    hasHypertension: row.hasHypertension ?? "Niega",
    hasAsthma: row.hasAsthma ?? "Niega",
    medicalAllergies: row.medicalAllergies ?? "Niega",
    surgeriesHistory: row.surgeriesHistory ?? "Niega",
    familyHistory: row.familyHistory ?? "No refiere",
    otherPathologies: row.otherPathologies ?? "Niega",
    notes: row.notes ?? "",
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPatientRow(
  row: typeof patients.$inferSelect,
  extras?: {
    obstetricFormula?: string | null;
    medicalAllergies?: string | null;
    lastMenstrualPeriod?: string | null;
    nextAppointmentDate?: string | null;
    nextAppointmentTime?: string | null;
    consultationsCount?: number;
  }
): PatientDirectoryItem {
  return {
    id: row.id,
    documentType: row.documentType,
    documentNumber: row.documentNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: row.fullName,
    birthDate: row.birthDate ?? "",
    age: calculateAge(row.birthDate),
    phone: row.phone ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    district: row.district ?? "Miraflores",
    civilStatus: row.civilStatus ?? "Soltera",
    occupation: row.occupation ?? "",
    educationLevel: row.educationLevel ?? "Superior Universitaria Completa",
    birthPlace: row.birthPlace ?? "Lima, Perú",
    religion: row.religion ?? "Católica",
    insuranceInfo: row.insuranceInfo ?? "Particular",
    obstetricFormula: extras?.obstetricFormula || "G0 P0000",
    medicalAllergies: extras?.medicalAllergies || "Niega",
    lastMenstrualPeriod: extras?.lastMenstrualPeriod || "",
    nextAppointmentDate: extras?.nextAppointmentDate ?? null,
    nextAppointmentTime: extras?.nextAppointmentTime ?? null,
    consultationsCount: extras?.consultationsCount ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function assertNoDuplicateDocument(
  tenantId: string,
  documentType: string,
  documentNumber: string,
  excludeId?: string
) {
  const cleanDoc = documentNumber.trim().toUpperCase();

  const [duplicate] = await db
    .select({
      id: patients.id,
      fullName: patients.fullName,
      documentType: patients.documentType,
      documentNumber: patients.documentNumber,
    })
    .from(patients)
    .where(
      and(
        eq(patients.tenantId, tenantId),
        eq(patients.documentType, documentType),
        sql`UPPER(TRIM(${patients.documentNumber})) = ${cleanDoc}`,
        isNull(patients.deletedAt),
        excludeId ? ne(patients.id, excludeId) : undefined
      )
    )
    .limit(1);

  if (duplicate) {
    throw new DomainError(
      `El documento ${duplicate.documentType} ${duplicate.documentNumber} ya pertenece a ${duplicate.fullName}.`
    );
  }
}

export async function listPatients(tenantId: string): Promise<PatientDirectoryItem[]> {
  const todayPeru = getPeruDateString();

  const [patientRows, backgroundRows, upcomingAppointments, consultationCounts] =
    await Promise.all([
      db
        .select()
        .from(patients)
        .where(and(eq(patients.tenantId, tenantId), isNull(patients.deletedAt)))
        .orderBy(desc(patients.updatedAt), asc(patients.lastName)),
      db
        .select({
          patientId: patientBackgrounds.patientId,
          obstetricFormula: patientBackgrounds.obstetricFormula,
          medicalAllergies: patientBackgrounds.medicalAllergies,
          lastMenstrualPeriod: patientBackgrounds.lastMenstrualPeriod,
        })
        .from(patientBackgrounds)
        .where(
          and(
            eq(patientBackgrounds.tenantId, tenantId),
            isNull(patientBackgrounds.deletedAt)
          )
        ),
      db
        .select({
          patientId: medicalAppointments.patientId,
          appointmentDate: medicalAppointments.appointmentDate,
          appointmentTime: medicalAppointments.appointmentTime,
        })
        .from(medicalAppointments)
        .where(
          and(
            eq(medicalAppointments.tenantId, tenantId),
            gte(medicalAppointments.appointmentDate, todayPeru),
            ne(medicalAppointments.status, "CANCELADA"),
            ne(medicalAppointments.status, "NO_ASISTIO"),
            isNull(medicalAppointments.deletedAt)
          )
        )
        .orderBy(
          asc(medicalAppointments.appointmentDate),
          asc(medicalAppointments.appointmentTime)
        ),
      db
        .select({
          patientId: medicalConsultations.patientId,
          value: count(),
        })
        .from(medicalConsultations)
        .where(
          and(
            eq(medicalConsultations.tenantId, tenantId),
            isNull(medicalConsultations.deletedAt)
          )
        )
        .groupBy(medicalConsultations.patientId),
    ]);

  const bgByPatient = new Map(backgroundRows.map((bg) => [bg.patientId, bg]));
  const nextApptByPatient = new Map<
    string,
    { appointmentDate: string; appointmentTime: string }
  >();
  for (const appt of upcomingAppointments) {
    if (!nextApptByPatient.has(appt.patientId)) {
      nextApptByPatient.set(appt.patientId, {
        appointmentDate: appt.appointmentDate,
        appointmentTime: appt.appointmentTime,
      });
    }
  }
  const consultCountByPatient = new Map(
    consultationCounts.map((row) => [row.patientId, Number(row.value)])
  );

  return patientRows.map((row) => {
    const bg = bgByPatient.get(row.id);
    const nextAppt = nextApptByPatient.get(row.id);
    return mapPatientRow(row, {
      obstetricFormula: bg?.obstetricFormula,
      medicalAllergies: bg?.medicalAllergies,
      lastMenstrualPeriod: bg?.lastMenstrualPeriod,
      nextAppointmentDate: nextAppt?.appointmentDate ?? null,
      nextAppointmentTime: nextAppt?.appointmentTime ?? null,
      consultationsCount: consultCountByPatient.get(row.id) ?? 0,
    });
  });
}

async function countForPatient(
  tenantId: string,
  patientId: string
): Promise<PatientClinicalCounts> {
  const rows = await db.execute<{
    appointments: number;
    consultations: number;
    checkups: number;
    prescriptions: number;
    lab_orders: number;
    quotes: number;
    colposcopies: number;
    ultrasounds: number;
    procedures: number;
    prenatal_cards: number;
    documents: number;
  }>(sql`
    SELECT
      (SELECT count(*)::int FROM medical_appointments WHERE tenant_id = ${tenantId} AND patient_id = ${patientId} AND deleted_at IS NULL) AS appointments,
      (SELECT count(*)::int FROM medical_consultations WHERE tenant_id = ${tenantId} AND patient_id = ${patientId} AND deleted_at IS NULL) AS consultations,
      (SELECT count(*)::int FROM clinical_checkups WHERE tenant_id = ${tenantId} AND patient_id = ${patientId} AND deleted_at IS NULL) AS checkups,
      (SELECT count(*)::int FROM medical_prescriptions WHERE tenant_id = ${tenantId} AND patient_id = ${patientId} AND deleted_at IS NULL) AS prescriptions,
      (SELECT count(*)::int FROM lab_orders WHERE tenant_id = ${tenantId} AND patient_id = ${patientId} AND deleted_at IS NULL) AS lab_orders,
      (SELECT count(*)::int FROM procedure_quotes WHERE tenant_id = ${tenantId} AND patient_id = ${patientId} AND deleted_at IS NULL) AS quotes,
      (SELECT count(*)::int FROM colposcopy_reports WHERE tenant_id = ${tenantId} AND patient_id = ${patientId} AND deleted_at IS NULL) AS colposcopies,
      (SELECT count(*)::int FROM ultrasound_reports WHERE tenant_id = ${tenantId} AND patient_id = ${patientId} AND deleted_at IS NULL) AS ultrasounds,
      (SELECT count(*)::int FROM minor_procedures WHERE tenant_id = ${tenantId} AND patient_id = ${patientId} AND deleted_at IS NULL) AS procedures,
      (SELECT count(*)::int FROM prenatal_cards WHERE tenant_id = ${tenantId} AND patient_id = ${patientId} AND deleted_at IS NULL) AS prenatal_cards,
      (SELECT count(*)::int FROM patient_documents WHERE tenant_id = ${tenantId} AND patient_id = ${patientId} AND deleted_at IS NULL) AS documents
  `);

  const row = rows[0];
  return {
    appointments: Number(row?.appointments ?? 0),
    consultations: Number(row?.consultations ?? 0),
    checkups: Number(row?.checkups ?? 0),
    prescriptions: Number(row?.prescriptions ?? 0),
    labOrders: Number(row?.lab_orders ?? 0),
    quotes: Number(row?.quotes ?? 0),
    colposcopies: Number(row?.colposcopies ?? 0),
    ultrasounds: Number(row?.ultrasounds ?? 0),
    procedures: Number(row?.procedures ?? 0),
    prenatalCards: Number(row?.prenatal_cards ?? 0),
    documents: Number(row?.documents ?? 0),
  };
}

export async function getPatientDetail(
  tenantId: string,
  patientId: string
): Promise<PatientDetailData | null> {
  const [patientRow] = await db
    .select()
    .from(patients)
    .where(
      and(
        eq(patients.id, patientId),
        eq(patients.tenantId, tenantId),
        isNull(patients.deletedAt)
      )
    )
    .limit(1);

  if (!patientRow) return null;

  const todayPeru = getPeruDateString();

  const [[bgRow], [nextAppt], counts] = await Promise.all([
    db
      .select()
      .from(patientBackgrounds)
      .where(
        and(
          eq(patientBackgrounds.tenantId, tenantId),
          eq(patientBackgrounds.patientId, patientId),
          isNull(patientBackgrounds.deletedAt)
        )
      )
      .limit(1),
    db
      .select({
        appointmentDate: medicalAppointments.appointmentDate,
        appointmentTime: medicalAppointments.appointmentTime,
      })
      .from(medicalAppointments)
      .where(
        and(
          eq(medicalAppointments.tenantId, tenantId),
          eq(medicalAppointments.patientId, patientId),
          gte(medicalAppointments.appointmentDate, todayPeru),
          ne(medicalAppointments.status, "CANCELADA"),
          ne(medicalAppointments.status, "NO_ASISTIO"),
          isNull(medicalAppointments.deletedAt)
        )
      )
      .orderBy(
        asc(medicalAppointments.appointmentDate),
        asc(medicalAppointments.appointmentTime)
      )
      .limit(1),
    countForPatient(tenantId, patientId),
  ]);

  const background = bgRow ? mapBackgroundRow(bgRow) : null;

  return {
    patient: mapPatientRow(patientRow, {
      obstetricFormula: background?.obstetricFormula,
      medicalAllergies: background?.medicalAllergies,
      lastMenstrualPeriod: background?.lastMenstrualPeriod,
      nextAppointmentDate: nextAppt?.appointmentDate ?? null,
      nextAppointmentTime: nextAppt?.appointmentTime ?? null,
      consultationsCount: counts.consultations,
    }),
    background,
    counts,
  };
}

export async function createPatient(
  ctx: SessionPayload,
  actorName: string,
  input: PatientInput
): Promise<PatientDirectoryItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  await assertNoDuplicateDocument(ctx.tenantId, input.documentType, input.documentNumber);

  const fullName = `${input.lastName}, ${input.firstName}`;

  const created = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(patients)
      .values({
        tenantId: ctx.tenantId!,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        fullName,
        birthDate: input.birthDate,
        phone: input.phone,
        email: input.email || null,
        address: input.address || null,
        district: input.district,
        civilStatus: input.civilStatus,
        occupation: input.occupation || null,
        educationLevel: input.educationLevel,
        birthPlace: input.birthPlace || null,
        religion: input.religion || null,
        insuranceInfo: input.insuranceInfo,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning();

    await tx.insert(patientBackgrounds).values({
      tenantId: ctx.tenantId!,
      patientId: inserted.id,
      obstetricFormula: "G0 P0000",
      catamenialRegimen: "28/4",
      stiHistory: "Niega ITS",
      contraceptiveMethod: "Ninguno",
      papHistory: "No refiere",
      vphTestHistory: "No realizado",
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

    return inserted;
  });

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "patients",
    entityId: created.id,
    changesSummary: {
      documentType: created.documentType,
      documentNumber: created.documentNumber,
      fullName: created.fullName,
    },
  });

  return mapPatientRow(created);
}

export async function updatePatient(
  ctx: SessionPayload,
  actorName: string,
  input: UpdatePatientInput
): Promise<PatientDirectoryItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  await assertNoDuplicateDocument(
    ctx.tenantId,
    input.documentType,
    input.documentNumber,
    input.id
  );

  const fullName = `${input.lastName}, ${input.firstName}`;

  const [updated] = await db
    .update(patients)
    .set({
      documentType: input.documentType,
      documentNumber: input.documentNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      fullName,
      birthDate: input.birthDate,
      phone: input.phone,
      email: input.email || null,
      address: input.address || null,
      district: input.district,
      civilStatus: input.civilStatus,
      occupation: input.occupation || null,
      educationLevel: input.educationLevel,
      birthPlace: input.birthPlace || null,
      religion: input.religion || null,
      insuranceInfo: input.insuranceInfo,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(patients.id, input.id),
        eq(patients.tenantId, ctx.tenantId),
        isNull(patients.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    throw new DomainError("Paciente no encontrada o sin acceso autorizado.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "patients",
    entityId: updated.id,
    changesSummary: {
      documentType: updated.documentType,
      documentNumber: updated.documentNumber,
      fullName: updated.fullName,
    },
  });

  const detail = await getPatientDetail(ctx.tenantId, updated.id);
  return detail ? detail.patient : mapPatientRow(updated);
}

export async function softDeletePatient(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string }> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const now = new Date();

  const [deleted] = await db
    .update(patients)
    .set({
      deletedAt: now,
      updatedBy: ctx.userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(patients.id, id),
        eq(patients.tenantId, ctx.tenantId),
        isNull(patients.deletedAt)
      )
    )
    .returning({
      id: patients.id,
      fullName: patients.fullName,
      documentNumber: patients.documentNumber,
    });

  if (!deleted) {
    throw new DomainError("Paciente no encontrada o ya eliminada.");
  }

  await db
    .update(patientBackgrounds)
    .set({
      deletedAt: now,
      updatedBy: ctx.userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(patientBackgrounds.patientId, id),
        eq(patientBackgrounds.tenantId, ctx.tenantId),
        isNull(patientBackgrounds.deletedAt)
      )
    );

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "patients",
    entityId: deleted.id,
    changesSummary: {
      fullName: deleted.fullName,
      documentNumber: deleted.documentNumber,
    },
  });

  return { id: deleted.id };
}

export async function getPatientBackground(
  tenantId: string,
  patientId: string
): Promise<PatientBackgroundItem | null> {
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

  if (!patient) return null;

  const [row] = await db
    .select()
    .from(patientBackgrounds)
    .where(
      and(
        eq(patientBackgrounds.tenantId, tenantId),
        eq(patientBackgrounds.patientId, patientId),
        isNull(patientBackgrounds.deletedAt)
      )
    )
    .limit(1);

  return row ? mapBackgroundRow(row) : null;
}

export async function upsertPatientBackground(
  ctx: SessionPayload,
  actorName: string,
  input: PatientBackgroundInput
): Promise<PatientBackgroundItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const [patient] = await db
    .select({ id: patients.id, fullName: patients.fullName })
    .from(patients)
    .where(
      and(
        eq(patients.id, input.patientId),
        eq(patients.tenantId, ctx.tenantId),
        isNull(patients.deletedAt)
      )
    )
    .limit(1);

  if (!patient) {
    throw new DomainError("Paciente no encontrada o sin acceso autorizado.");
  }

  const [existing] = await db
    .select({ id: patientBackgrounds.id })
    .from(patientBackgrounds)
    .where(
      and(
        eq(patientBackgrounds.tenantId, ctx.tenantId),
        eq(patientBackgrounds.patientId, input.patientId),
        isNull(patientBackgrounds.deletedAt)
      )
    )
    .limit(1);

  const payload = {
    obstetricFormula: input.obstetricFormula,
    menarche: input.menarche,
    sexualDebutAge: input.sexualDebutAge,
    sexualPartnersCount: input.sexualPartnersCount,
    catamenialRegimen: input.catamenialRegimen || "28/4",
    stiHistory: input.stiHistory || "Niega ITS",
    contraceptiveMethod: input.contraceptiveMethod || "Ninguno",
    lastMenstrualPeriod: input.lastMenstrualPeriod || null,
    papHistory: input.papHistory || "No refiere",
    vphTestHistory: input.vphTestHistory || "No realizado",
    hasDiabetes: input.hasDiabetes || "Niega",
    hasHypertension: input.hasHypertension || "Niega",
    hasAsthma: input.hasAsthma || "Niega",
    medicalAllergies: input.medicalAllergies || "Niega",
    surgeriesHistory: input.surgeriesHistory || "Niega",
    familyHistory: input.familyHistory || "No refiere",
    otherPathologies: input.otherPathologies || "Niega",
    notes: input.notes || null,
    updatedBy: ctx.userId,
    updatedAt: new Date(),
  };

  let saved: typeof patientBackgrounds.$inferSelect;

  if (existing) {
    const [updated] = await db
      .update(patientBackgrounds)
      .set(payload)
      .where(
        and(
          eq(patientBackgrounds.id, existing.id),
          eq(patientBackgrounds.tenantId, ctx.tenantId)
        )
      )
      .returning();
    saved = updated;

    await recordAuditLog({
      ctx,
      actorName,
      action: "UPDATE",
      entityType: "patient_backgrounds",
      entityId: saved.id,
      changesSummary: {
        patientId: input.patientId,
        patientName: patient.fullName,
        obstetricFormula: saved.obstetricFormula,
        medicalAllergies: saved.medicalAllergies,
      },
    });
  } else {
    const [inserted] = await db
      .insert(patientBackgrounds)
      .values({
        tenantId: ctx.tenantId,
        patientId: input.patientId,
        ...payload,
        createdBy: ctx.userId,
      })
      .returning();
    saved = inserted;

    await recordAuditLog({
      ctx,
      actorName,
      action: "CREATE",
      entityType: "patient_backgrounds",
      entityId: saved.id,
      changesSummary: {
        patientId: input.patientId,
        patientName: patient.fullName,
        obstetricFormula: saved.obstetricFormula,
      },
    });
  }

  return mapBackgroundRow(saved);
}
