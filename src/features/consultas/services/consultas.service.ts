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
import type { ConsultationVitalSignsRecord } from "@/db/schema/clinical";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import { getPeruDateString } from "@/lib/utils";
import { assertNoScheduleConflict } from "@/features/agenda/services/agenda.service";
import {
  parseConsultationAuxExamsToLabItems,
  type LabOrderItem,
} from "@/features/laboratorio/laboratorio.schema";
import { mapLabOrderRow } from "@/features/laboratorio/services/laboratorio.service";
import {
  parseConsultationRxNotesToDraftItems,
  type MedicalPrescriptionItem,
} from "@/features/recetas/recetas.schema";
import { mapPrescriptionRow } from "@/features/recetas/services/recetas.service";
import {
  calculateBmi,
  type ConsultationActiveAppointment,
  type ConsultationFormContext,
  type CreateConsultationInput,
  type DraftLabOrderForConsultation,
  type DraftPrescriptionForConsultation,
  type MedicalConsultationItem,
  type NextAppointmentScheduleInput,
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

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function buildNormalizedVitals(
  raw: CreateConsultationInput["vitalSigns"]
): ConsultationVitalSignsRecord {
  const normalized: ConsultationVitalSignsRecord = {};
  const bp = raw.bloodPressure?.trim();
  if (bp) normalized.bloodPressure = bp;
  if (typeof raw.heartRate === "number" && Number.isFinite(raw.heartRate)) {
    normalized.heartRate = raw.heartRate;
  }
  if (
    typeof raw.respiratoryRate === "number" &&
    Number.isFinite(raw.respiratoryRate)
  ) {
    normalized.respiratoryRate = raw.respiratoryRate;
  }
  if (typeof raw.temperature === "number" && Number.isFinite(raw.temperature)) {
    normalized.temperature = Number(raw.temperature.toFixed(1));
  }
  if (
    typeof raw.oxygenSaturation === "number" &&
    Number.isFinite(raw.oxygenSaturation)
  ) {
    normalized.oxygenSaturation = raw.oxygenSaturation;
  }
  if (typeof raw.weightKg === "number" && Number.isFinite(raw.weightKg)) {
    normalized.weightKg = Number(raw.weightKg.toFixed(2));
  }
  if (typeof raw.heightCm === "number" && Number.isFinite(raw.heightCm)) {
    normalized.heightCm = Number(raw.heightCm.toFixed(1));
  }
  if (normalized.weightKg && normalized.heightCm) {
    const bmi = calculateBmi(normalized.weightKg, normalized.heightCm);
    if (bmi > 0) normalized.bmi = bmi;
  }
  return normalized;
}

function buildAuxiliaryExamsSummaryFromDrafts(
  drafts: DraftLabOrderForConsultation[]
): string {
  if (drafts.length === 0) return "";
  const lines: string[] = [];
  for (const draft of drafts) {
    const testNames = draft.items.map((item) => item.testName.trim()).filter(Boolean);
    const custom = draft.customTests.trim();
    const parts = [...testNames];
    if (custom) parts.push(custom);
    if (parts.length > 0) {
      const prefix =
        draft.templateTitle && draft.templateType !== "GENERAL"
          ? `[${draft.templateTitle}] `
          : "";
      lines.push(`${prefix}${parts.join(" • ")}`);
    }
  }
  return lines.join("\n").slice(0, 1950);
}

function buildPrescriptionNotesSummaryFromDrafts(
  drafts: DraftPrescriptionForConsultation[]
): string {
  if (drafts.length === 0) return "";
  let lineNo = 1;
  const lines: string[] = [];
  for (const draft of drafts) {
    for (const item of draft.items) {
      lines.push(
        `${lineNo}. ${item.medicationName} — ${item.dosage} — ${item.frequency} — ${item.duration}`
      );
      lineNo += 1;
    }
  }
  return lines.join("\n").slice(0, 1950);
}

async function scheduleFollowUpAppointmentInTx(params: {
  tx: DbTx;
  ctx: SessionPayload;
  tenantId: string;
  patientId: string;
  doctorId: string;
  doctorDisplayName: string;
  appointmentDate: string;
  schedule: NextAppointmentScheduleInput;
}): Promise<ConsultationActiveAppointment> {
  await assertNoScheduleConflict({
    executor: params.tx,
    tenantId: params.tenantId,
    doctorId: params.doctorId,
    doctorDisplayName: params.doctorDisplayName,
    patientId: params.patientId,
    appointmentDate: params.appointmentDate,
    appointmentTime: params.schedule.appointmentTime,
    durationMinutes: params.schedule.durationMinutes,
    status: "CONFIRMADA",
  });

  const [apptRow] = await params.tx
    .insert(medicalAppointments)
    .values({
      tenantId: params.tenantId,
      patientId: params.patientId,
      doctorId: params.doctorId,
      doctorName: params.doctorDisplayName,
      appointmentDate: params.appointmentDate,
      appointmentTime: params.schedule.appointmentTime,
      durationMinutes: params.schedule.durationMinutes,
      appointmentType: params.schedule.appointmentType,
      reason: params.schedule.reason,
      status: "CONFIRMADA",
      notes: "Programada directamente desde Consulta Médica.",
      reminderSent: false,
      createdBy: params.ctx.userId,
      updatedBy: params.ctx.userId,
    })
    .returning();

  return {
    id: apptRow.id,
    appointmentDate: apptRow.appointmentDate,
    appointmentTime: String(apptRow.appointmentTime).slice(0, 5),
    appointmentType: apptRow.appointmentType,
    reason: apptRow.reason,
    status: apptRow.status,
    doctorName: apptRow.doctorName,
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

export async function createConsultation(
  ctx: SessionPayload,
  actorName: string,
  input: CreateConsultationInput
): Promise<{
  consultation: MedicalConsultationItem;
  createdPrescriptionId: string | null;
  createdPrescription: MedicalPrescriptionItem | null;
  createdPrescriptions: MedicalPrescriptionItem[];
  createdLabOrderId: string | null;
  createdLabOrder: LabOrderItem | null;
  createdLabOrders: LabOrderItem[];
  attendedAppointmentId: string | null;
  scheduledNextAppointment: ConsultationActiveAppointment | null;
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

  const effectiveAuxiliaryExams =
    input.auxiliaryExams.trim() ||
    buildAuxiliaryExamsSummaryFromDrafts(input.draftLabOrders);
  const effectivePrescriptionNotes =
    input.prescriptionNotes.trim() ||
    buildPrescriptionNotesSummaryFromDrafts(input.draftPrescriptions);

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
        auxiliaryExams: effectiveAuxiliaryExams || null,
        prescriptionNotes: effectivePrescriptionNotes || null,
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

    const createdPrescriptions: MedicalPrescriptionItem[] = [];
    if (input.draftPrescriptions.length > 0) {
      for (const draftRx of input.draftPrescriptions) {
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
            prescriptionDate: draftRx.prescriptionDate,
            diagnosis: draftRx.diagnosis,
            cie10Code: draftRx.cie10Code || null,
            items: draftRx.items,
            generalIndications:
              draftRx.generalIndications ||
              "Cumplir estrictamente la pauta médica indicada en consulta.",
            nextAppointmentDate:
              input.nextAppointmentDate || draftRx.nextAppointmentDate || null,
            createdBy: ctx.userId,
            updatedBy: ctx.userId,
          })
          .returning();
        createdPrescriptions.push(mapPrescriptionRow(rx));
      }
    } else if (input.generatePrescription && input.prescriptionNotes.trim()) {
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

        createdPrescriptions.push(mapPrescriptionRow(rx));
      }
    }

    const createdLabOrders: LabOrderItem[] = [];
    if (input.draftLabOrders.length > 0) {
      for (const draftLab of input.draftLabOrders) {
        const sanitizedSpecimen =
          draftLab.templateType === "GENERAL"
            ? null
            : (draftLab.specimenDetails ?? null);
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
            orderDate: draftLab.orderDate,
            diagnosis: draftLab.diagnosis,
            cie10Code: draftLab.cie10Code || null,
            urgency: draftLab.urgency,
            items: draftLab.items,
            customTests: draftLab.customTests || null,
            patientInstructions:
              draftLab.patientInstructions ||
              "Acudir en ayunas o seguir las indicaciones específicas del laboratorio.",
            templateType: draftLab.templateType,
            templateTitle:
              draftLab.templateType === "GENERAL"
                ? null
                : draftLab.templateTitle || null,
            specimenDetails: sanitizedSpecimen,
            createdBy: ctx.userId,
            updatedBy: ctx.userId,
          })
          .returning();
        createdLabOrders.push(mapLabOrderRow(lab));
      }
    } else if (input.generateLabOrder && input.auxiliaryExams.trim()) {
      const labItems = parseConsultationAuxExamsToLabItems(
        input.auxiliaryExams
      ).map((item) => ({
        ...item,
        notes: item.notes ?? (input.diagnosis ? `Dx: ${input.diagnosis}` : undefined),
      }));

      if (labItems.length > 0) {
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
          .returning();

        createdLabOrders.push(mapLabOrderRow(lab));
      }
    }

    let scheduledNextAppointment: ConsultationActiveAppointment | null = null;
    if (input.nextAppointmentDate && input.nextAppointmentSchedule) {
      scheduledNextAppointment = await scheduleFollowUpAppointmentInTx({
        tx,
        ctx,
        tenantId,
        patientId: input.patientId,
        doctorId: doctor.id,
        doctorDisplayName,
        appointmentDate: input.nextAppointmentDate,
        schedule: input.nextAppointmentSchedule,
      });
    }

    const createdPrescription = createdPrescriptions[0] ?? null;
    const createdLabOrder = createdLabOrders[0] ?? null;

    return {
      consultation: mapConsultationRow(inserted),
      createdPrescriptionId: createdPrescription?.id ?? null,
      createdPrescription,
      createdPrescriptions,
      createdLabOrderId: createdLabOrder?.id ?? null,
      createdLabOrder,
      createdLabOrders,
      attendedAppointmentId,
      scheduledNextAppointment,
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
      bmi: txResult.consultation.vitalSigns.bmi ?? null,
      attendedAppointmentId: txResult.attendedAppointmentId,
      createdPrescriptionsCount: txResult.createdPrescriptions.length,
      createdLabOrdersCount: txResult.createdLabOrders.length,
      scheduledNextAppointmentId: txResult.scheduledNextAppointment?.id ?? null,
    },
  });

  if (txResult.scheduledNextAppointment) {
    await recordAuditLog({
      ctx,
      actorName,
      action: "CREATE",
      entityType: "medical_appointments",
      entityId: txResult.scheduledNextAppointment.id,
      changesSummary: {
        patientId: input.patientId,
        source: "consulta_medica",
        appointmentDate: txResult.scheduledNextAppointment.appointmentDate,
        appointmentTime: txResult.scheduledNextAppointment.appointmentTime,
        appointmentType: txResult.scheduledNextAppointment.appointmentType,
      },
    });
  }

  return txResult;
}

export async function updateConsultation(
  ctx: SessionPayload,
  actorName: string,
  input: UpdateConsultationInput
): Promise<{
  consultation: MedicalConsultationItem;
  scheduledNextAppointment: ConsultationActiveAppointment | null;
}> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");
  const tenantId = ctx.tenantId;

  const [existing] = await db
    .select({
      id: medicalConsultations.id,
      patientId: medicalConsultations.patientId,
      doctorId: medicalConsultations.doctorId,
      doctorName: medicalConsultations.doctorName,
    })
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

  let scheduleDoctor: { id: string; displayName: string } | null = null;
  if (input.nextAppointmentDate && input.nextAppointmentSchedule) {
    if (existing.doctorId) {
      scheduleDoctor = {
        id: existing.doctorId,
        displayName: existing.doctorName || actorName,
      };
    } else {
      const [doctor] = await db
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
        .limit(1);

      if (!doctor) {
        throw new DomainError("Médico autenticado no encontrado o inactivo en la sede.");
      }
      scheduleDoctor = {
        id: doctor.id,
        displayName: `${doctor.doctorTitle} ${doctor.fullName}`.trim(),
      };
    }
  }

  const normalizedVitals = buildNormalizedVitals(input.vitalSigns);

  const txResult = await db.transaction(async (tx) => {
    const [updated] = await tx
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

    await tx
      .update(medicalPrescriptions)
      .set({
        nextAppointmentDate: input.nextAppointmentDate || null,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(medicalPrescriptions.consultationId, input.id),
          eq(medicalPrescriptions.tenantId, tenantId),
          isNull(medicalPrescriptions.deletedAt)
        )
      );

    let scheduledNextAppointment: ConsultationActiveAppointment | null = null;
    if (input.nextAppointmentDate && input.nextAppointmentSchedule && scheduleDoctor) {
      scheduledNextAppointment = await scheduleFollowUpAppointmentInTx({
        tx,
        ctx,
        tenantId,
        patientId: input.patientId,
        doctorId: scheduleDoctor.id,
        doctorDisplayName: scheduleDoctor.displayName,
        appointmentDate: input.nextAppointmentDate,
        schedule: input.nextAppointmentSchedule,
      });
    }

    return {
      consultation: mapConsultationRow(updated),
      scheduledNextAppointment,
    };
  });

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "medical_consultations",
    entityId: txResult.consultation.id,
    changesSummary: {
      patientId: txResult.consultation.patientId,
      diagnosis: txResult.consultation.diagnosis,
      cie10Code: txResult.consultation.cie10Code,
      bmi: txResult.consultation.vitalSigns.bmi ?? null,
      scheduledNextAppointmentId: txResult.scheduledNextAppointment?.id ?? null,
    },
  });

  if (txResult.scheduledNextAppointment) {
    await recordAuditLog({
      ctx,
      actorName,
      action: "CREATE",
      entityType: "medical_appointments",
      entityId: txResult.scheduledNextAppointment.id,
      changesSummary: {
        patientId: txResult.consultation.patientId,
        source: "consulta_medica_edicion",
        appointmentDate: txResult.scheduledNextAppointment.appointmentDate,
        appointmentTime: txResult.scheduledNextAppointment.appointmentTime,
        appointmentType: txResult.scheduledNextAppointment.appointmentType,
      },
    });
  }

  return txResult;
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
