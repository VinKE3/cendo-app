import { and, asc, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  labOrders,
  labOrderTemplates,
  medicalConsultations,
  patients,
  profiles,
} from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import {
  isPathologyLabTemplate,
  slugifyTemplateCode,
  type CreateLabOrderInput,
  type CreateLabTemplateInput,
  type LabOrderItem,
  type LabOrderTemplateItem,
  type LabTemplateType,
  type LabUrgency,
  type UpdateLabOrderInput,
  type UpdateLabTemplateInput,
} from "../laboratorio.schema";

export function mapLabOrderRow(
  row: typeof labOrders.$inferSelect
): LabOrderItem {
  const templateType = (row.templateType || "GENERAL") as LabTemplateType;
  return {
    id: row.id,
    patientId: row.patientId,
    consultationId: row.consultationId ?? null,
    doctorId: row.doctorId ?? null,
    doctorName: row.doctorName,
    doctorCmp: row.doctorCmp,
    doctorRne: row.doctorRne ?? "",
    orderDate: row.orderDate,
    diagnosis: row.diagnosis,
    cie10Code: row.cie10Code ?? "",
    urgency: row.urgency as LabUrgency,
    items: row.items ?? [],
    customTests: row.customTests ?? "",
    patientInstructions: row.patientInstructions ?? "",
    templateType,
    templateTitle: row.templateTitle ?? "",
    specimenDetails: !isPathologyLabTemplate(templateType)
      ? null
      : (row.specimenDetails ?? null),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapLabTemplateRow(
  row: typeof labOrderTemplates.$inferSelect
): LabOrderTemplateItem {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    category: row.category,
    templateType: (row.templateType || "CUSTOM") as LabTemplateType,
    sampleType: row.sampleType ?? "",
    fixativeTransport: row.fixativeTransport ?? "",
    suggestedDiagnosis: row.suggestedDiagnosis ?? "",
    cie10Code: row.cie10Code ?? "",
    defaultTests: row.defaultTests ?? [],
    clinicalNotes: row.clinicalNotes ?? "",
    isOfficial: row.isOfficial,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listLabOrdersByPatient(
  tenantId: string,
  patientId: string
): Promise<LabOrderItem[]> {
  const rows = await db
    .select()
    .from(labOrders)
    .where(
      and(
        eq(labOrders.tenantId, tenantId),
        eq(labOrders.patientId, patientId),
        isNull(labOrders.deletedAt)
      )
    )
    .orderBy(desc(labOrders.orderDate), desc(labOrders.createdAt));

  return rows.map(mapLabOrderRow);
}

export async function listLabOrdersForTenantPatient(
  tenantId: string,
  patientId: string
): Promise<LabOrderItem[]> {
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

  return listLabOrdersByPatient(tenantId, patientId);
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

export async function createLabOrder(
  ctx: SessionPayload,
  actorName: string,
  input: CreateLabOrderInput
): Promise<LabOrderItem> {
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

  // Regla clínica: solo las órdenes de Anatomía Patológica conservan specimenDetails
  const sanitizedSpecimen = !isPathologyLabTemplate(input.templateType)
    ? null
    : (input.specimenDetails ?? null);

  const [inserted] = await db
    .insert(labOrders)
    .values({
      tenantId,
      patientId: input.patientId,
      consultationId: validConsultationId,
      doctorId: doctor.id,
      doctorName: doctorDisplayName,
      doctorCmp,
      doctorRne,
      orderDate: input.orderDate,
      diagnosis: input.diagnosis,
      cie10Code: input.cie10Code || null,
      urgency: input.urgency,
      items: input.items,
      customTests: input.customTests || null,
      patientInstructions: input.patientInstructions || null,
      templateType: input.templateType,
      templateTitle:
        input.templateType === "GENERAL" ? null : input.templateTitle || null,
      specimenDetails: sanitizedSpecimen,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  const mapped = mapLabOrderRow(inserted);

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "lab_orders",
    entityId: mapped.id,
    changesSummary: {
      patientId: input.patientId,
      patientName: patient.fullName,
      consultationId: validConsultationId,
      templateType: mapped.templateType,
      urgency: mapped.urgency,
      itemsCount: mapped.items.length,
    },
  });

  return mapped;
}

export async function updateLabOrder(
  ctx: SessionPayload,
  actorName: string,
  input: UpdateLabOrderInput
): Promise<LabOrderItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");
  const tenantId = ctx.tenantId;

  const [[existing], validConsultationId] = await Promise.all([
    db
      .select({ id: labOrders.id, patientId: labOrders.patientId })
      .from(labOrders)
      .where(
        and(
          eq(labOrders.id, input.id),
          eq(labOrders.tenantId, tenantId),
          eq(labOrders.patientId, input.patientId),
          isNull(labOrders.deletedAt)
        )
      )
      .limit(1),
    resolveConsultationLink(tenantId, input.patientId, input.consultationId),
  ]);

  if (!existing) {
    throw new DomainError("Orden de laboratorio no encontrada o sin acceso autorizado.");
  }

  const sanitizedSpecimen = !isPathologyLabTemplate(input.templateType)
    ? null
    : (input.specimenDetails ?? null);

  const [updated] = await db
    .update(labOrders)
    .set({
      consultationId: validConsultationId,
      orderDate: input.orderDate,
      diagnosis: input.diagnosis,
      cie10Code: input.cie10Code || null,
      urgency: input.urgency,
      items: input.items,
      customTests: input.customTests || null,
      patientInstructions: input.patientInstructions || null,
      templateType: input.templateType,
      templateTitle:
        input.templateType === "GENERAL" ? null : input.templateTitle || null,
      specimenDetails: sanitizedSpecimen,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(labOrders.id, input.id),
        eq(labOrders.tenantId, tenantId),
        isNull(labOrders.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    throw new DomainError("No se pudo actualizar la orden de laboratorio.");
  }

  const mapped = mapLabOrderRow(updated);

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "lab_orders",
    entityId: mapped.id,
    changesSummary: {
      patientId: mapped.patientId,
      consultationId: mapped.consultationId,
      templateType: mapped.templateType,
      urgency: mapped.urgency,
      itemsCount: mapped.items.length,
    },
  });

  return mapped;
}

export async function softDeleteLabOrder(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string; patientId: string }> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const now = new Date();
  const [deleted] = await db
    .update(labOrders)
    .set({
      deletedAt: now,
      updatedBy: ctx.userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(labOrders.id, id),
        eq(labOrders.tenantId, ctx.tenantId),
        isNull(labOrders.deletedAt)
      )
    )
    .returning({
      id: labOrders.id,
      patientId: labOrders.patientId,
      diagnosis: labOrders.diagnosis,
    });

  if (!deleted) {
    throw new DomainError("Orden de laboratorio no encontrada o ya eliminada.");
  }

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "lab_orders",
    entityId: deleted.id,
    changesSummary: {
      patientId: deleted.patientId,
      diagnosis: deleted.diagnosis,
    },
  });

  return { id: deleted.id, patientId: deleted.patientId };
}

// =============================================================================
// CRUD Plantillas de Laboratorio / Patología (lab_order_templates)
// =============================================================================

export async function listLabTemplates(
  tenantId: string
): Promise<LabOrderTemplateItem[]> {
  const rows = await db
    .select()
    .from(labOrderTemplates)
    .where(
      and(
        eq(labOrderTemplates.tenantId, tenantId),
        isNull(labOrderTemplates.deletedAt)
      )
    )
    .orderBy(desc(labOrderTemplates.isOfficial), asc(labOrderTemplates.title));

  return rows.map(mapLabTemplateRow);
}

async function resolveUniqueTemplateCode(
  tenantId: string,
  preferredCode: string,
  excludeId?: string
): Promise<string> {
  const cleanCode = preferredCode.trim().toLowerCase();
  const [dup] = await db
    .select({ id: labOrderTemplates.id, title: labOrderTemplates.title })
    .from(labOrderTemplates)
    .where(
      and(
        eq(labOrderTemplates.tenantId, tenantId),
        isNull(labOrderTemplates.deletedAt),
        sql`LOWER(TRIM(${labOrderTemplates.code})) = ${cleanCode}`,
        excludeId ? ne(labOrderTemplates.id, excludeId) : undefined
      )
    )
    .limit(1);

  if (dup) {
    throw new DomainError(
      `El código de plantilla "${preferredCode}" ya pertenece a "${dup.title}".`
    );
  }

  return preferredCode.trim();
}

export async function createLabTemplate(
  ctx: SessionPayload,
  actorName: string,
  input: CreateLabTemplateInput
): Promise<LabOrderTemplateItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");
  const tenantId = ctx.tenantId;

  const baseCode = input.code?.trim()
    ? input.code.trim().toLowerCase()
    : slugifyTemplateCode(input.title);
  const code = await resolveUniqueTemplateCode(tenantId, baseCode);

  const [created] = await db
    .insert(labOrderTemplates)
    .values({
      tenantId,
      code,
      title: input.title,
      category: input.category,
      templateType: input.templateType,
      sampleType: input.sampleType,
      fixativeTransport: input.fixativeTransport,
      suggestedDiagnosis: input.suggestedDiagnosis,
      cie10Code: input.cie10Code || null,
      defaultTests: input.defaultTests,
      clinicalNotes: input.clinicalNotes || null,
      isOfficial: false,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  const mapped = mapLabTemplateRow(created);

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "lab_order_templates",
    entityId: mapped.id,
    changesSummary: { code: mapped.code, title: mapped.title },
  });

  return mapped;
}

export async function updateLabTemplate(
  ctx: SessionPayload,
  actorName: string,
  input: UpdateLabTemplateInput
): Promise<LabOrderTemplateItem> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");
  const tenantId = ctx.tenantId;

  const [existing] = await db
    .select()
    .from(labOrderTemplates)
    .where(
      and(
        eq(labOrderTemplates.id, input.id),
        eq(labOrderTemplates.tenantId, tenantId),
        isNull(labOrderTemplates.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Plantilla de laboratorio no encontrada.");
  }

  const nextCode = input.code?.trim() ? input.code.trim().toLowerCase() : existing.code;
  await resolveUniqueTemplateCode(tenantId, nextCode, input.id);

  const [updated] = await db
    .update(labOrderTemplates)
    .set({
      code: nextCode,
      title: input.title,
      category: input.category,
      templateType: input.templateType,
      sampleType: input.sampleType,
      fixativeTransport: input.fixativeTransport,
      suggestedDiagnosis: input.suggestedDiagnosis,
      cie10Code: input.cie10Code || null,
      defaultTests: input.defaultTests,
      clinicalNotes: input.clinicalNotes || null,
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(labOrderTemplates.id, input.id),
        eq(labOrderTemplates.tenantId, tenantId),
        isNull(labOrderTemplates.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    throw new DomainError("No se pudo actualizar la plantilla de laboratorio.");
  }

  const mapped = mapLabTemplateRow(updated);

  await recordAuditLog({
    ctx,
    actorName,
    action: "UPDATE",
    entityType: "lab_order_templates",
    entityId: mapped.id,
    changesSummary: { code: mapped.code, title: mapped.title },
  });

  return mapped;
}

export async function softDeleteLabTemplate(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string }> {
  if (!ctx.tenantId) throw new DomainError("Sesión sin sede asociada.");

  const [existing] = await db
    .select()
    .from(labOrderTemplates)
    .where(
      and(
        eq(labOrderTemplates.id, id),
        eq(labOrderTemplates.tenantId, ctx.tenantId),
        isNull(labOrderTemplates.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Plantilla de laboratorio no encontrada.");
  }

  if (existing.isOfficial) {
    throw new DomainError(
      "No se puede eliminar una plantilla oficial CENDO. Puede editarla o crear una personalizada."
    );
  }

  const now = new Date();
  await db
    .update(labOrderTemplates)
    .set({ deletedAt: now, updatedBy: ctx.userId, updatedAt: now })
    .where(eq(labOrderTemplates.id, id));

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "lab_order_templates",
    entityId: id,
    changesSummary: { code: existing.code, title: existing.title },
  });

  return { id };
}
