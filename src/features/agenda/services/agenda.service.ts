import {
  and,
  asc,
  eq,
  gte,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  medicalAppointments,
  patientBackgrounds,
  patients,
  profiles,
} from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import {
  formatMinutesToTime,
  parseTimeToMinutes,
  resolveAppointmentTypeLabel,
  type AgendaAppointmentItem,
  type AgendaDoctorOption,
  type AgendaPatientOption,
  type AppointmentStatus,
  type CreateAppointmentInput,
  type QuickPatchAppointmentInput,
  type UpdateAppointmentInput,
} from "../agenda.schema";

type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface ListAppointmentsFilters {
  date?: string;
  fromDate?: string;
  toDate?: string;
  doctorId?: string;
  status?: string;
  patientId?: string;
}

function mapAppointmentJoinedRow(row: {
  appointment: typeof medicalAppointments.$inferSelect;
  patientFullName: string;
  patientDocumentType: string;
  patientDocumentNumber: string;
  patientPhone: string | null;
  patientInsurance: string | null;
  patientAllergies: string | null;
}): AgendaAppointmentItem {
  const appt = row.appointment;
  return {
    id: appt.id,
    patientId: appt.patientId,
    patientName: row.patientFullName,
    patientDocumentType: row.patientDocumentType,
    patientDocumentNumber: row.patientDocumentNumber,
    patientPhone: row.patientPhone ?? "",
    patientInsurance: row.patientInsurance ?? "Particular",
    patientAllergies: row.patientAllergies ?? "Niega",
    doctorId: appt.doctorId,
    doctorName: appt.doctorName,
    appointmentDate: appt.appointmentDate,
    appointmentTime: String(appt.appointmentTime).slice(0, 5),
    durationMinutes: appt.durationMinutes,
    appointmentType: resolveAppointmentTypeLabel(appt.appointmentType),
    reason: appt.reason,
    status: appt.status as AppointmentStatus,
    notes: appt.notes ?? "",
    reminderSent: appt.reminderSent,
    createdAt: appt.createdAt.toISOString(),
    updatedAt: appt.updatedAt.toISOString(),
  };
}

async function getHydratedAppointment(
  executor: DbExecutor,
  tenantId: string,
  appointmentId: string
): Promise<AgendaAppointmentItem> {
  const [row] = await executor
    .select({
      appointment: medicalAppointments,
      patientFullName: patients.fullName,
      patientDocumentType: patients.documentType,
      patientDocumentNumber: patients.documentNumber,
      patientPhone: patients.phone,
      patientInsurance: patients.insuranceInfo,
      patientAllergies: patientBackgrounds.medicalAllergies,
    })
    .from(medicalAppointments)
    .innerJoin(patients, eq(medicalAppointments.patientId, patients.id))
    .leftJoin(
      patientBackgrounds,
      and(
        eq(patientBackgrounds.patientId, patients.id),
        eq(patientBackgrounds.tenantId, tenantId),
        isNull(patientBackgrounds.deletedAt)
      )
    )
    .where(
      and(
        eq(medicalAppointments.id, appointmentId),
        eq(medicalAppointments.tenantId, tenantId),
        isNull(medicalAppointments.deletedAt),
        isNull(patients.deletedAt)
      )
    )
    .limit(1);

  if (!row) {
    throw new DomainError("Cita médica no encontrada o sin acceso autorizado.");
  }

  return mapAppointmentJoinedRow(row);
}

export async function listAppointments(
  tenantId: string,
  filters: ListAppointmentsFilters = {}
): Promise<AgendaAppointmentItem[]> {
  const conditions = [
    eq(medicalAppointments.tenantId, tenantId),
    isNull(medicalAppointments.deletedAt),
    isNull(patients.deletedAt),
  ];

  if (filters.date) {
    conditions.push(eq(medicalAppointments.appointmentDate, filters.date));
  } else {
    if (filters.fromDate) {
      conditions.push(gte(medicalAppointments.appointmentDate, filters.fromDate));
    }
    if (filters.toDate) {
      conditions.push(lte(medicalAppointments.appointmentDate, filters.toDate));
    }
  }

  if (filters.doctorId && filters.doctorId !== "ALL") {
    conditions.push(eq(medicalAppointments.doctorId, filters.doctorId));
  }
  if (filters.status && filters.status !== "ALL") {
    conditions.push(
      eq(medicalAppointments.status, filters.status as AppointmentStatus)
    );
  }
  if (filters.patientId) {
    conditions.push(eq(medicalAppointments.patientId, filters.patientId));
  }

  const rows = await db
    .select({
      appointment: medicalAppointments,
      patientFullName: patients.fullName,
      patientDocumentType: patients.documentType,
      patientDocumentNumber: patients.documentNumber,
      patientPhone: patients.phone,
      patientInsurance: patients.insuranceInfo,
      patientAllergies: patientBackgrounds.medicalAllergies,
    })
    .from(medicalAppointments)
    .innerJoin(patients, eq(medicalAppointments.patientId, patients.id))
    .leftJoin(
      patientBackgrounds,
      and(
        eq(patientBackgrounds.patientId, patients.id),
        eq(patientBackgrounds.tenantId, tenantId),
        isNull(patientBackgrounds.deletedAt)
      )
    )
    .where(and(...conditions))
    .orderBy(
      asc(medicalAppointments.appointmentDate),
      asc(medicalAppointments.appointmentTime)
    );

  return rows.map(mapAppointmentJoinedRow);
}

export async function listActiveDoctorsForAgenda(
  tenantId: string
): Promise<AgendaDoctorOption[]> {
  const rows = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      doctorTitle: profiles.doctorTitle,
      specialty: profiles.specialty,
      phone: profiles.phone,
      clinicAddress: profiles.clinicAddress,
      googleMapsUrl: profiles.googleMapsUrl,
    })
    .from(profiles)
    .where(
      and(
        eq(profiles.tenantId, tenantId),
        eq(profiles.isActive, true),
        isNull(profiles.deletedAt)
      )
    )
    .orderBy(asc(profiles.createdAt));

  return rows;
}

export async function listPatientsForAgendaSelect(
  tenantId: string
): Promise<AgendaPatientOption[]> {
  const rows = await db
    .select({
      id: patients.id,
      fullName: patients.fullName,
      documentType: patients.documentType,
      documentNumber: patients.documentNumber,
      phone: patients.phone,
      insuranceInfo: patients.insuranceInfo,
      medicalAllergies: patientBackgrounds.medicalAllergies,
    })
    .from(patients)
    .leftJoin(
      patientBackgrounds,
      and(
        eq(patientBackgrounds.patientId, patients.id),
        eq(patientBackgrounds.tenantId, tenantId),
        isNull(patientBackgrounds.deletedAt)
      )
    )
    .where(and(eq(patients.tenantId, tenantId), isNull(patients.deletedAt)))
    .orderBy(asc(patients.fullName));

  return rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    documentType: row.documentType,
    documentNumber: row.documentNumber,
    phone: row.phone ?? "",
    insuranceInfo: row.insuranceInfo ?? "Particular",
    medicalAllergies: row.medicalAllergies ?? "Niega",
  }));
}

async function resolveActiveDoctor(
  executor: DbExecutor,
  tenantId: string,
  doctorId: string
) {
  const [doctor] = await executor
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      doctorTitle: profiles.doctorTitle,
    })
    .from(profiles)
    .where(
      and(
        eq(profiles.id, doctorId),
        eq(profiles.tenantId, tenantId),
        eq(profiles.isActive, true),
        isNull(profiles.deletedAt)
      )
    )
    .limit(1);

  if (!doctor) {
    throw new DomainError(
      "El especialista seleccionado no está activo o no pertenece a esta sede."
    );
  }

  return {
    id: doctor.id,
    displayName: `${doctor.doctorTitle} ${doctor.fullName}`.trim(),
  };
}

async function assertNoScheduleConflict(params: {
  executor: DbExecutor;
  tenantId: string;
  doctorId: string;
  doctorDisplayName: string;
  patientId: string;
  appointmentDate: string;
  appointmentTime: string;
  durationMinutes: number;
  status: AppointmentStatus;
  excludeAppointmentId?: string;
}) {
  // Citas canceladas o inasistencias liberan el horario
  if (params.status === "CANCELADA" || params.status === "NO_ASISTIO") {
    return;
  }

  const candidateStart = parseTimeToMinutes(params.appointmentTime);
  const candidateEnd = candidateStart + params.durationMinutes;

  const dayConflicts = await params.executor
    .select({
      id: medicalAppointments.id,
      doctorId: medicalAppointments.doctorId,
      doctorName: medicalAppointments.doctorName,
      patientId: medicalAppointments.patientId,
      patientName: patients.fullName,
      appointmentTime: medicalAppointments.appointmentTime,
      durationMinutes: medicalAppointments.durationMinutes,
    })
    .from(medicalAppointments)
    .innerJoin(patients, eq(medicalAppointments.patientId, patients.id))
    .where(
      and(
        eq(medicalAppointments.tenantId, params.tenantId),
        eq(medicalAppointments.appointmentDate, params.appointmentDate),
        isNull(medicalAppointments.deletedAt),
        isNull(patients.deletedAt),
        ne(medicalAppointments.status, "CANCELADA"),
        ne(medicalAppointments.status, "NO_ASISTIO"),
        params.excludeAppointmentId
          ? ne(medicalAppointments.id, params.excludeAppointmentId)
          : undefined,
        or(
          eq(medicalAppointments.doctorId, params.doctorId),
          eq(medicalAppointments.patientId, params.patientId)
        )
      )
    );

  for (const existing of dayConflicts) {
    const existingStart = parseTimeToMinutes(String(existing.appointmentTime));
    const existingEnd = existingStart + existing.durationMinutes;

    // Solapamiento estricto: back-to-back (candidateStart === existingEnd) sí se permite
    if (candidateStart < existingEnd && candidateEnd > existingStart) {
      const rangeStr = `${formatMinutesToTime(existingStart)} – ${formatMinutesToTime(
        existingEnd
      )}`;

      if (existing.doctorId === params.doctorId) {
        throw new DomainError(
          `Conflicto de horario: ${params.doctorDisplayName} ya tiene asignada la cita de ${existing.patientName} (${rangeStr}).`
        );
      }

      if (existing.patientId === params.patientId) {
        throw new DomainError(
          `La paciente ${existing.patientName} ya tiene otra cita programada con ${existing.doctorName} (${rangeStr}).`
        );
      }
    }
  }
}

export async function createAppointment(
  ctx: SessionPayload,
  actorName: string,
  input: CreateAppointmentInput
): Promise<{
  appointment: AgendaAppointmentItem;
  createdPatient: AgendaPatientOption | null;
}> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");
  const tenantId = ctx.tenantId;

  const result = await db.transaction(async (tx) => {
    const doctor = await resolveActiveDoctor(tx, tenantId, input.doctorId);

    let targetPatientId = input.patientId ?? "";
    let createdPatientOption: AgendaPatientOption | null = null;

    if (input.quickPatient) {
      const qp = input.quickPatient;
      const cleanDoc = qp.documentNumber.trim().toUpperCase();

      const [existingDoc] = await tx
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
            eq(patients.documentType, qp.documentType),
            sql`UPPER(TRIM(${patients.documentNumber})) = ${cleanDoc}`,
            isNull(patients.deletedAt)
          )
        )
        .limit(1);

      if (existingDoc) {
        throw new DomainError(
          `El documento ${existingDoc.documentType} ${existingDoc.documentNumber} ya pertenece a ${existingDoc.fullName}. Selecciónela desde "Paciente Registrada".`
        );
      }

      const fullName = `${qp.lastName}, ${qp.firstName}`;

      const [newPatient] = await tx
        .insert(patients)
        .values({
          tenantId,
          documentType: qp.documentType,
          documentNumber: cleanDoc,
          firstName: qp.firstName,
          lastName: qp.lastName,
          fullName,
          birthDate: qp.birthDate,
          phone: qp.phone,
          district: "Miraflores",
          civilStatus: "Soltera",
          educationLevel: "Superior Universitaria Completa",
          birthPlace: "Lima, Perú",
          religion: "Católica",
          insuranceInfo: qp.insuranceInfo || "Particular",
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })
        .returning();

      await tx.insert(patientBackgrounds).values({
        tenantId,
        patientId: newPatient.id,
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

      targetPatientId = newPatient.id;
      createdPatientOption = {
        id: newPatient.id,
        fullName: newPatient.fullName,
        documentType: newPatient.documentType,
        documentNumber: newPatient.documentNumber,
        phone: newPatient.phone ?? "",
        insuranceInfo: newPatient.insuranceInfo ?? "Particular",
        medicalAllergies: "Niega",
      };
    } else {
      const [existingPatient] = await tx
        .select({ id: patients.id })
        .from(patients)
        .where(
          and(
            eq(patients.id, targetPatientId),
            eq(patients.tenantId, tenantId),
            isNull(patients.deletedAt)
          )
        )
        .limit(1);

      if (!existingPatient) {
        throw new DomainError(
          "La paciente seleccionada no existe o no pertenece a esta sede."
        );
      }
    }

    await assertNoScheduleConflict({
      executor: tx,
      tenantId,
      doctorId: doctor.id,
      doctorDisplayName: doctor.displayName,
      patientId: targetPatientId,
      appointmentDate: input.appointmentDate,
      appointmentTime: input.appointmentTime,
      durationMinutes: input.durationMinutes,
      status: input.status,
    });

    const resolvedType = resolveAppointmentTypeLabel(input.appointmentType);
    const finalReason = input.reason.trim() || resolvedType;

    const [inserted] = await tx
      .insert(medicalAppointments)
      .values({
        tenantId,
        patientId: targetPatientId,
        doctorId: doctor.id,
        doctorName: doctor.displayName,
        appointmentDate: input.appointmentDate,
        appointmentTime: input.appointmentTime,
        durationMinutes: input.durationMinutes,
        appointmentType: resolvedType,
        reason: finalReason,
        status: input.status,
        notes: input.notes.trim() || null,
        reminderSent: false,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning({ id: medicalAppointments.id });

    const hydrated = await getHydratedAppointment(tx, tenantId, inserted.id);

    return {
      appointment: hydrated,
      createdPatient: createdPatientOption,
    };
  });

  if (result.createdPatient) {
    await recordAuditLog({
      ctx,
      actorName,
      action: "CREATE",
      entityType: "patients",
      entityId: result.createdPatient.id,
      changesSummary: {
        source: "agenda_quick_create",
        documentType: result.createdPatient.documentType,
        documentNumber: result.createdPatient.documentNumber,
        fullName: result.createdPatient.fullName,
      },
    });
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "medical_appointments",
    entityId: result.appointment.id,
    changesSummary: {
      patientId: result.appointment.patientId,
      patientName: result.appointment.patientName,
      doctorName: result.appointment.doctorName,
      appointmentDate: result.appointment.appointmentDate,
      appointmentTime: result.appointment.appointmentTime,
      status: result.appointment.status,
    },
  });

  return result;
}

export async function updateAppointment(
  ctx: SessionPayload,
  actorName: string,
  input: UpdateAppointmentInput
): Promise<AgendaAppointmentItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");
  const tenantId = ctx.tenantId;

  const [existing] = await db
    .select({
      id: medicalAppointments.id,
      reminderSent: medicalAppointments.reminderSent,
    })
    .from(medicalAppointments)
    .where(
      and(
        eq(medicalAppointments.id, input.id),
        eq(medicalAppointments.tenantId, tenantId),
        isNull(medicalAppointments.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Cita médica no encontrada o sin acceso autorizado.");
  }

  const [doctor, [patientRow]] = await Promise.all([
    resolveActiveDoctor(db, tenantId, input.doctorId),
    db
      .select({ id: patients.id })
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

  if (!patientRow) {
    throw new DomainError("Paciente no encontrada o sin acceso autorizado.");
  }

  await assertNoScheduleConflict({
    executor: db,
    tenantId,
    doctorId: doctor.id,
    doctorDisplayName: doctor.displayName,
    patientId: input.patientId,
    appointmentDate: input.appointmentDate,
    appointmentTime: input.appointmentTime,
    durationMinutes: input.durationMinutes,
    status: input.status,
    excludeAppointmentId: input.id,
  });

  const resolvedType = resolveAppointmentTypeLabel(input.appointmentType);
  const finalReason = input.reason.trim() || resolvedType;

  await db
    .update(medicalAppointments)
    .set({
      patientId: input.patientId,
      doctorId: doctor.id,
      doctorName: doctor.displayName,
      appointmentDate: input.appointmentDate,
      appointmentTime: input.appointmentTime,
      durationMinutes: input.durationMinutes,
      appointmentType: resolvedType,
      reason: finalReason,
      status: input.status,
      notes: input.notes.trim() || null,
      reminderSent: input.reminderSent ?? existing.reminderSent,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(medicalAppointments.id, input.id),
        eq(medicalAppointments.tenantId, tenantId),
        isNull(medicalAppointments.deletedAt)
      )
    );

  const hydrated = await getHydratedAppointment(db, tenantId, input.id);

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "medical_appointments",
    entityId: hydrated.id,
    changesSummary: {
      appointmentDate: hydrated.appointmentDate,
      appointmentTime: hydrated.appointmentTime,
      durationMinutes: hydrated.durationMinutes,
      status: hydrated.status,
      doctorName: hydrated.doctorName,
    },
  });

  return hydrated;
}

export async function patchAppointmentQuick(
  ctx: SessionPayload,
  actorName: string,
  input: QuickPatchAppointmentInput
): Promise<AgendaAppointmentItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");
  const tenantId = ctx.tenantId;

  const [existing] = await db
    .select()
    .from(medicalAppointments)
    .where(
      and(
        eq(medicalAppointments.id, input.id),
        eq(medicalAppointments.tenantId, tenantId),
        isNull(medicalAppointments.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Cita médica no encontrada o sin acceso autorizado.");
  }

  const nextStatus = (input.status ?? existing.status) as AppointmentStatus;
  const wasInactive =
    existing.status === "CANCELADA" || existing.status === "NO_ASISTIO";
  const becomingActive =
    nextStatus !== "CANCELADA" && nextStatus !== "NO_ASISTIO";

  if (wasInactive && becomingActive && existing.doctorId) {
    await assertNoScheduleConflict({
      executor: db,
      tenantId,
      doctorId: existing.doctorId,
      doctorDisplayName: existing.doctorName,
      patientId: existing.patientId,
      appointmentDate: existing.appointmentDate,
      appointmentTime: String(existing.appointmentTime).slice(0, 5),
      durationMinutes: existing.durationMinutes,
      status: nextStatus,
      excludeAppointmentId: existing.id,
    });
  }

  await db
    .update(medicalAppointments)
    .set({
      status: nextStatus,
      reminderSent: input.reminderSent ?? existing.reminderSent,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(medicalAppointments.id, input.id),
        eq(medicalAppointments.tenantId, tenantId),
        isNull(medicalAppointments.deletedAt)
      )
    );

  const hydrated = await getHydratedAppointment(db, tenantId, input.id);

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "medical_appointments",
    entityId: hydrated.id,
    changesSummary: {
      status: hydrated.status,
      reminderSent: hydrated.reminderSent,
    },
  });

  return hydrated;
}

export async function softDeleteAppointment(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string; patientId: string }> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const now = new Date();

  const [deleted] = await db
    .update(medicalAppointments)
    .set({
      deletedAt: now,
      updatedBy: ctx.userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(medicalAppointments.id, id),
        eq(medicalAppointments.tenantId, ctx.tenantId),
        isNull(medicalAppointments.deletedAt)
      )
    )
    .returning({
      id: medicalAppointments.id,
      patientId: medicalAppointments.patientId,
      appointmentDate: medicalAppointments.appointmentDate,
      appointmentTime: medicalAppointments.appointmentTime,
    });

  if (!deleted) {
    throw new DomainError("Cita médica no encontrada o ya eliminada.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "medical_appointments",
    entityId: deleted.id,
    changesSummary: {
      patientId: deleted.patientId,
      appointmentDate: deleted.appointmentDate,
      appointmentTime: String(deleted.appointmentTime).slice(0, 5),
    },
  });

  return { id: deleted.id, patientId: deleted.patientId };
}
