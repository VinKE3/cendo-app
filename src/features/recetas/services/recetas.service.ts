import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  medicalConsultations,
  medicalPrescriptions,
  patients,
  profiles,
} from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import type {
  CreatePrescriptionInput,
  MedicalPrescriptionItem,
  UpdatePrescriptionInput,
} from "../recetas.schema";

export function mapPrescriptionRow(
  row: typeof medicalPrescriptions.$inferSelect
): MedicalPrescriptionItem {
  return {
    id: row.id,
    patientId: row.patientId,
    consultationId: row.consultationId ?? null,
    doctorId: row.doctorId ?? null,
    doctorName: row.doctorName,
    doctorCmp: row.doctorCmp,
    doctorRne: row.doctorRne ?? "",
    prescriptionDate: row.prescriptionDate,
    diagnosis: row.diagnosis,
    cie10Code: row.cie10Code ?? "",
    items: row.items ?? [],
    generalIndications: row.generalIndications ?? "",
    nextAppointmentDate: row.nextAppointmentDate ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listPrescriptionsByPatient(
  tenantId: string,
  patientId: string
): Promise<MedicalPrescriptionItem[]> {
  const rows = await db
    .select()
    .from(medicalPrescriptions)
    .where(
      and(
        eq(medicalPrescriptions.tenantId, tenantId),
        eq(medicalPrescriptions.patientId, patientId),
        isNull(medicalPrescriptions.deletedAt)
      )
    )
    .orderBy(
      desc(medicalPrescriptions.prescriptionDate),
      desc(medicalPrescriptions.createdAt)
    );

  return rows.map(mapPrescriptionRow);
}

export async function listPrescriptionsForTenantPatient(
  tenantId: string,
  patientId: string
): Promise<MedicalPrescriptionItem[]> {
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
    throw new DomainError("Paciente no encontrada o sin acceso autorizado.");
  }

  return listPrescriptionsByPatient(tenantId, patientId);
}

async function resolveConsultationLink(
  tenantId: string,
  patientId: string,
  consultationId?: string | null
): Promise<string | null> {
  if (!consultationId) return null;

  const [cons] = await db
    .select({ id: medicalConsultations.id })
    .from(medicalConsultations)
    .where(
      and(
        eq(medicalConsultations.id, consultationId),
        eq(medicalConsultations.tenantId, tenantId),
        eq(medicalConsultations.patientId, patientId),
        isNull(medicalConsultations.deletedAt)
      )
    )
    .limit(1);

  if (!cons) {
    throw new DomainError(
      "La consulta vinculada no existe o no pertenece a esta paciente."
    );
  }

  return cons.id;
}

export async function createPrescription(
  ctx: SessionPayload,
  actorName: string,
  input: CreatePrescriptionInput
): Promise<MedicalPrescriptionItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");
  const tenantId = ctx.tenantId;

  const [[doctor], [patient], validConsultationId] = await Promise.all([
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
    resolveConsultationLink(tenantId, input.patientId, input.consultationId),
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

  const [inserted] = await db
    .insert(medicalPrescriptions)
    .values({
      tenantId,
      patientId: input.patientId,
      consultationId: validConsultationId,
      doctorId: doctor.id,
      doctorName: doctorDisplayName,
      doctorCmp,
      doctorRne,
      prescriptionDate: input.prescriptionDate,
      diagnosis: input.diagnosis,
      cie10Code: input.cie10Code || null,
      items: input.items,
      generalIndications: input.generalIndications || null,
      nextAppointmentDate: input.nextAppointmentDate || null,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  const mapped = mapPrescriptionRow(inserted);

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "medical_prescriptions",
    entityId: mapped.id,
    changesSummary: {
      patientId: input.patientId,
      patientName: patient.fullName,
      consultationId: validConsultationId,
      diagnosis: mapped.diagnosis,
      cie10Code: mapped.cie10Code,
      itemsCount: mapped.items.length,
    },
  });

  return mapped;
}

export async function updatePrescription(
  ctx: SessionPayload,
  actorName: string,
  input: UpdatePrescriptionInput
): Promise<MedicalPrescriptionItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");
  const tenantId = ctx.tenantId;

  const [[existing], validConsultationId] = await Promise.all([
    db
      .select({
        id: medicalPrescriptions.id,
        patientId: medicalPrescriptions.patientId,
      })
      .from(medicalPrescriptions)
      .where(
        and(
          eq(medicalPrescriptions.id, input.id),
          eq(medicalPrescriptions.tenantId, tenantId),
          eq(medicalPrescriptions.patientId, input.patientId),
          isNull(medicalPrescriptions.deletedAt)
        )
      )
      .limit(1),
    resolveConsultationLink(tenantId, input.patientId, input.consultationId),
  ]);

  if (!existing) {
    throw new DomainError("Receta médica no encontrada o sin acceso autorizado.");
  }

  const [updated] = await db
    .update(medicalPrescriptions)
    .set({
      consultationId: validConsultationId,
      prescriptionDate: input.prescriptionDate,
      diagnosis: input.diagnosis,
      cie10Code: input.cie10Code || null,
      items: input.items,
      generalIndications: input.generalIndications || null,
      nextAppointmentDate: input.nextAppointmentDate || null,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(medicalPrescriptions.id, input.id),
        eq(medicalPrescriptions.tenantId, tenantId),
        isNull(medicalPrescriptions.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    throw new DomainError("No se pudo actualizar la receta médica.");
  }

  const mapped = mapPrescriptionRow(updated);

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "medical_prescriptions",
    entityId: mapped.id,
    changesSummary: {
      patientId: mapped.patientId,
      consultationId: mapped.consultationId,
      diagnosis: mapped.diagnosis,
      cie10Code: mapped.cie10Code,
      itemsCount: mapped.items.length,
    },
  });

  return mapped;
}

export async function softDeletePrescription(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string; patientId: string }> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const now = new Date();

  const [deleted] = await db
    .update(medicalPrescriptions)
    .set({
      deletedAt: now,
      updatedBy: ctx.userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(medicalPrescriptions.id, id),
        eq(medicalPrescriptions.tenantId, ctx.tenantId),
        isNull(medicalPrescriptions.deletedAt)
      )
    )
    .returning({
      id: medicalPrescriptions.id,
      patientId: medicalPrescriptions.patientId,
      diagnosis: medicalPrescriptions.diagnosis,
    });

  if (!deleted) {
    throw new DomainError("Receta médica no encontrada o ya eliminada.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "medical_prescriptions",
    entityId: deleted.id,
    changesSummary: {
      patientId: deleted.patientId,
      diagnosis: deleted.diagnosis,
    },
  });

  return { id: deleted.id, patientId: deleted.patientId };
}
