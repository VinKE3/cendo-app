import { and, asc, desc, eq, gte, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  labOrders,
  labOrderTemplates,
  medicalAppointments,
  medicalConsultations,
  medicalPrescriptions,
  medicationsVademecum,
  patients,
  profiles,
} from "@/db/schema";
import type {
  ConsultationVitalSignsRecord,
  LabOrderItemRecord,
} from "@/db/schema/clinical";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import { getPeruDateString } from "@/lib/utils";
import {
  parseConsultationRxNotesToDraftItems,
  type MedicalPrescriptionItem,
} from "@/features/recetas/recetas.schema";
import { mapPrescriptionRow } from "@/features/recetas/services/recetas.service";
import {
  calculateBmi,
  type ConsultationFormContext,
  type CreateConsultationInput,
  type MedicalConsultationItem,
  type UpdateConsultationInput,
} from "../consultas.schema";

function mapConsultationRow(
  row: typeof medicalConsultations.$inferSelect
): MedicalConsultationItem {
  return {
    id: row.id,
    patientId: row.patientId,
    appointmentId: row.appointmentId ?? null,
    doctorId: row.doctorId ?? null,
    doctorName: row.doctorName,
    doctorCmp: row.doctorCmp,
    doctorRne: row.doctorRne ?? "",
    consultationDate: row.consultationDate,
    reasonForVisit: row.reasonForVisit,
    illnessTime: row.illnessTime ?? "",
    symptoms: row.symptoms ?? "",
    vitalSigns: row.vitalSigns,
    physicalExam: row.physicalExam,
    diagnosis: row.diagnosis,
    cie10Code: row.cie10Code ?? "",
    treatmentPlan: row.treatmentPlan,
    auxiliaryExams: row.auxiliaryExams ?? "",
    prescriptionNotes: row.prescriptionNotes ?? "",
    nextAppointmentDate: row.nextAppointmentDate ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function buildNormalizedVitals(
  raw: CreateConsultationInput["vitalSigns"]
): ConsultationVitalSignsRecord {
  const bmi = calculateBmi(raw.weightKg, raw.heightCm);
  return {
    bloodPressure: raw.bloodPressure.trim(),
    heartRate: raw.heartRate,
    respiratoryRate: raw.respiratoryRate,
    temperature: Number(raw.temperature.toFixed(1)),
    oxygenSaturation: raw.oxygenSaturation,
    weightKg: Number(raw.weightKg.toFixed(2)),
    heightCm: Number(raw.heightCm.toFixed(1)),
    bmi,
  };
}

export async function listConsultationsByPatient(
  tenantId: string,
  patientId: string
): Promise<MedicalConsultationItem[]> {
  const rows = await db
    .select()
    .from(medicalConsultations)
    .where(
      and(
        eq(medicalConsultations.tenantId, tenantId),
        eq(medicalConsultations.patientId, patientId),
        isNull(medicalConsultations.deletedAt)
      )
    )
    .orderBy(
      desc(medicalConsultations.consultationDate),
      desc(medicalConsultations.createdAt)
    );

  return rows.map(mapConsultationRow);
}

export async function getConsultationFormContext(
  tenantId: string,
  patientId: string
): Promise<ConsultationFormContext> {
  const todayPeru = getPeruDateString();

  const [activeAppointments, vademecumRows, labTemplateRows] = await Promise.all([
    db
      .select({
        id: medicalAppointments.id,
        appointmentDate: medicalAppointments.appointmentDate,
        appointmentTime: medicalAppointments.appointmentTime,
        appointmentType: medicalAppointments.appointmentType,
        reason: medicalAppointments.reason,
        status: medicalAppointments.status,
        doctorName: medicalAppointments.doctorName,
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
      ),
    db
      .select({
        id: medicationsVademecum.id,
        genericName: medicationsVademecum.genericName,
        therapeuticGroup: medicationsVademecum.therapeuticGroup,
        indications: medicationsVademecum.indications,
        commercialBrands: medicationsVademecum.commercialBrands,
      })
      .from(medicationsVademecum)
      .where(
        and(
          eq(medicationsVademecum.tenantId, tenantId),
          isNull(medicationsVademecum.deletedAt)
        )
      )
      .orderBy(asc(medicationsVademecum.genericName)),
    db
      .select({
        id: labOrderTemplates.id,
        title: labOrderTemplates.title,
        category: labOrderTemplates.category,
        defaultTests: labOrderTemplates.defaultTests,
      })
      .from(labOrderTemplates)
      .where(
        and(
          eq(labOrderTemplates.tenantId, tenantId),
          isNull(labOrderTemplates.deletedAt)
        )
      )
      .orderBy(asc(labOrderTemplates.title)),
  ]);

  return {
    activeAppointments: activeAppointments.map((a) => ({
      ...a,
      appointmentTime: String(a.appointmentTime).slice(0, 5),
    })),
    vademecumOptions: vademecumRows.map((m) => ({
      id: m.id,
      genericName: m.genericName,
      therapeuticGroup: m.therapeuticGroup,
      indications: m.indications ?? "",
      commercialBrands: m.commercialBrands ?? [],
    })),
    labTemplates: labTemplateRows.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      defaultTests: t.defaultTests ?? [],
    })),
  };
}

function parseBulletLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^[•\-*]\s*/, "").trim())
    .filter(Boolean);
}

export async function createConsultation(
  ctx: SessionPayload,
  actorName: string,
  input: CreateConsultationInput
): Promise<{
  consultation: MedicalConsultationItem;
  createdPrescriptionId: string | null;
  createdPrescription: MedicalPrescriptionItem | null;
  createdLabOrderId: string | null;
  attendedAppointmentId: string | null;
}> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");
  const tenantId = ctx.tenantId;

  // Resolver médico desde BD (Zero Trust) y verificar pertenencia de la paciente
  const [[doctor], [patient]] = await Promise.all([
    db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        doctorTitle: profiles.doctorTitle,
        cmp: profiles.cmp,
        rne: profiles.rne,
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
  ]);

  if (!doctor) {
    throw new DomainError("Médico autenticado no encontrado o inactivo en la sede.");
  }
  if (!patient) {
    throw new DomainError("Paciente no encontrada o sin acceso autorizado.");
  }

  const doctorDisplayName = `${doctor.doctorTitle} ${doctor.fullName}`.trim();
  const doctorCmp = doctor.cmp?.trim() || "61693";
  const doctorRne = doctor.rne?.trim() || null;
  const normalizedVitals = buildNormalizedVitals(input.vitalSigns);

  const txResult = await db.transaction(async (tx) => {
    let validAppointmentId: string | null = null;
    if (input.appointmentId) {
      const [appt] = await tx
        .select({ id: medicalAppointments.id, status: medicalAppointments.status })
        .from(medicalAppointments)
        .where(
          and(
            eq(medicalAppointments.id, input.appointmentId),
            eq(medicalAppointments.tenantId, tenantId),
            eq(medicalAppointments.patientId, input.patientId),
            isNull(medicalAppointments.deletedAt)
          )
        )
        .limit(1);

      if (!appt) {
        throw new DomainError(
          "La cita vinculada no existe o no corresponde a esta paciente."
        );
      }
      validAppointmentId = appt.id;
    }

    const [inserted] = await tx
      .insert(medicalConsultations)
      .values({
        tenantId,
        patientId: input.patientId,
        appointmentId: validAppointmentId,
        doctorId: doctor.id,
        doctorName: doctorDisplayName,
        doctorCmp,
        doctorRne,
        consultationDate: input.consultationDate,
        reasonForVisit: input.reasonForVisit,
        illnessTime: input.illnessTime || null,
        symptoms: input.symptoms || null,
        vitalSigns: normalizedVitals,
        physicalExam: input.physicalExam,
        diagnosis: input.diagnosis,
        cie10Code: input.cie10Code || null,
        treatmentPlan: input.treatmentPlan,
        auxiliaryExams: input.auxiliaryExams || null,
        prescriptionNotes: input.prescriptionNotes || null,
        nextAppointmentDate: input.nextAppointmentDate || null,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning();

    let attendedAppointmentId: string | null = null;
    if (validAppointmentId && input.markAppointmentAttended) {
      await tx
        .update(medicalAppointments)
        .set({
          status: "ATENDIDA",
          updatedBy: ctx.userId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(medicalAppointments.id, validAppointmentId),
            eq(medicalAppointments.tenantId, tenantId),
            isNull(medicalAppointments.deletedAt)
          )
        );
      attendedAppointmentId = validAppointmentId;
    }

    let createdPrescriptionId: string | null = null;
    let createdPrescription: MedicalPrescriptionItem | null = null;
    if (input.generatePrescription && input.prescriptionNotes.trim()) {
      const rxItems = parseConsultationRxNotesToDraftItems(
        input.prescriptionNotes,
        []
      );
      if (rxItems.length > 0) {
        const [rx] = await tx
          .insert(medicalPrescriptions)
          .values({
            tenantId,
            patientId: input.patientId,
            consultationId: inserted.id,
            doctorId: doctor.id,
            doctorName: doctorDisplayName,
            doctorCmp,
            doctorRne,
            prescriptionDate: input.consultationDate,
            diagnosis: input.diagnosis,
            cie10Code: input.cie10Code || null,
            items: rxItems,
            generalIndications:
              "Cumplir estrictamente la pauta médica indicada en consulta.",
            nextAppointmentDate: input.nextAppointmentDate || null,
            createdBy: ctx.userId,
            updatedBy: ctx.userId,
          })
          .returning();

        createdPrescriptionId = rx.id;
        createdPrescription = mapPrescriptionRow(rx);
      }
    }

    let createdLabOrderId: string | null = null;
    const labLines = parseBulletLines(input.auxiliaryExams);
    if (input.generateLabOrder && labLines.length > 0) {
      const labItems: LabOrderItemRecord[] = labLines.map((testName, idx) => ({
        id: `lab-${Date.now()}-${idx}`,
        category: "Ginecología & Exámenes Auxiliares",
        testName,
        sampleType: "Según protocolo",
        notes: input.diagnosis ? `Dx: ${input.diagnosis}` : undefined,
      }));

      const [lab] = await tx
        .insert(labOrders)
        .values({
          tenantId,
          patientId: input.patientId,
          consultationId: inserted.id,
          doctorId: doctor.id,
          doctorName: doctorDisplayName,
          doctorCmp,
          doctorRne,
          orderDate: input.consultationDate,
          diagnosis: input.diagnosis,
          cie10Code: input.cie10Code || null,
          urgency: "Rutina",
          items: labItems,
          patientInstructions:
            "Acudir en ayunas o seguir las indicaciones específicas del laboratorio.",
          templateType: "GENERAL",
          templateTitle: "Orden generada desde Consulta Médica",
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })
        .returning({ id: labOrders.id });

      createdLabOrderId = lab.id;
    }

    return {
      consultation: mapConsultationRow(inserted),
      createdPrescriptionId,
      createdPrescription,
      createdLabOrderId,
      attendedAppointmentId,
    };
  });

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "medical_consultations",
    entityId: txResult.consultation.id,
    changesSummary: {
      patientId: input.patientId,
      patientName: patient.fullName,
      diagnosis: txResult.consultation.diagnosis,
      cie10Code: txResult.consultation.cie10Code,
      bmi: txResult.consultation.vitalSigns.bmi,
      attendedAppointmentId: txResult.attendedAppointmentId,
      createdPrescriptionId: txResult.createdPrescriptionId,
      createdLabOrderId: txResult.createdLabOrderId,
    },
  });

  return txResult;
}

export async function updateConsultation(
  ctx: SessionPayload,
  actorName: string,
  input: UpdateConsultationInput
): Promise<MedicalConsultationItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");
  const tenantId = ctx.tenantId;

  const [existing] = await db
    .select({ id: medicalConsultations.id, patientId: medicalConsultations.patientId })
    .from(medicalConsultations)
    .where(
      and(
        eq(medicalConsultations.id, input.id),
        eq(medicalConsultations.tenantId, tenantId),
        eq(medicalConsultations.patientId, input.patientId),
        isNull(medicalConsultations.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Consulta médica no encontrada o sin acceso autorizado.");
  }

  let validAppointmentId: string | null = null;
  if (input.appointmentId) {
    const [appt] = await db
      .select({ id: medicalAppointments.id })
      .from(medicalAppointments)
      .where(
        and(
          eq(medicalAppointments.id, input.appointmentId),
          eq(medicalAppointments.tenantId, tenantId),
          eq(medicalAppointments.patientId, input.patientId),
          isNull(medicalAppointments.deletedAt)
        )
      )
      .limit(1);

    if (!appt) {
      throw new DomainError("La cita vinculada no existe o no pertenece a la paciente.");
    }
    validAppointmentId = appt.id;
  }

  const normalizedVitals = buildNormalizedVitals(input.vitalSigns);

  const [updated] = await db
    .update(medicalConsultations)
    .set({
      appointmentId: validAppointmentId,
      consultationDate: input.consultationDate,
      reasonForVisit: input.reasonForVisit,
      illnessTime: input.illnessTime || null,
      symptoms: input.symptoms || null,
      vitalSigns: normalizedVitals,
      physicalExam: input.physicalExam,
      diagnosis: input.diagnosis,
      cie10Code: input.cie10Code || null,
      treatmentPlan: input.treatmentPlan,
      auxiliaryExams: input.auxiliaryExams || null,
      prescriptionNotes: input.prescriptionNotes || null,
      nextAppointmentDate: input.nextAppointmentDate || null,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(medicalConsultations.id, input.id),
        eq(medicalConsultations.tenantId, tenantId),
        isNull(medicalConsultations.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    throw new DomainError("No se pudo actualizar la consulta médica.");
  }

  const mapped = mapConsultationRow(updated);

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "medical_consultations",
    entityId: mapped.id,
    changesSummary: {
      patientId: mapped.patientId,
      diagnosis: mapped.diagnosis,
      cie10Code: mapped.cie10Code,
      bmi: mapped.vitalSigns.bmi,
    },
  });

  return mapped;
}

export async function softDeleteConsultation(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string; patientId: string }> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const now = new Date();

  const [deleted] = await db
    .update(medicalConsultations)
    .set({
      deletedAt: now,
      updatedBy: ctx.userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(medicalConsultations.id, id),
        eq(medicalConsultations.tenantId, ctx.tenantId),
        isNull(medicalConsultations.deletedAt)
      )
    )
    .returning({
      id: medicalConsultations.id,
      patientId: medicalConsultations.patientId,
      diagnosis: medicalConsultations.diagnosis,
    });

  if (!deleted) {
    throw new DomainError("Consulta médica no encontrada o ya eliminada.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "medical_consultations",
    entityId: deleted.id,
    changesSummary: {
      patientId: deleted.patientId,
      diagnosis: deleted.diagnosis,
    },
  });

  return { id: deleted.id, patientId: deleted.patientId };
}
