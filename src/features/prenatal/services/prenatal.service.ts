import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  patientBackgrounds,
  patients,
  prenatalCards,
  profiles,
} from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import {
  maternalPathologyItemSchema,
  prenatalBaselineDataSchema,
  prenatalVisitItemSchema,
  type MaternalPathologyItem,
  type PrenatalBaselineData,
  type PrenatalCardItem,
  type PrenatalVisitItem,
  type UpsertPrenatalCardInput,
} from "../prenatal.schema";

function normalizeBaseline(raw: unknown): PrenatalBaselineData {
  const parsed = prenatalBaselineDataSchema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  return prenatalBaselineDataSchema.parse({});
}

function normalizeVisits(raw: unknown): PrenatalVisitItem[] {
  if (!Array.isArray(raw)) return [];
  const items: PrenatalVisitItem[] = [];
  for (const item of raw) {
    const parsed = prenatalVisitItemSchema.safeParse(item);
    if (parsed.success) {
      items.push(parsed.data);
    }
  }
  return items
    .sort((a, b) => a.visitNumber - b.visitNumber)
    .slice(0, 9);
}

function normalizePathologies(raw: unknown): MaternalPathologyItem[] {
  if (!Array.isArray(raw)) return [];
  const items: MaternalPathologyItem[] = [];
  for (const item of raw) {
    const parsed = maternalPathologyItemSchema.safeParse(item);
    if (parsed.success) {
      items.push(parsed.data);
    }
  }
  return items;
}

export function mapPrenatalCardRow(
  row: typeof prenatalCards.$inferSelect,
  doctorMeta?: { cmp?: string | null; rne?: string | null }
): PrenatalCardItem {
  return {
    id: row.id,
    patientId: row.patientId,
    clinicEstablishment:
      row.clinicEstablishment ||
      "CENDO - Centro de Endometriosis & Ginecología Especializada",
    attendingDoctorId: row.attendingDoctorId ?? null,
    attendingDoctorName:
      row.attendingDoctorName || "Dr. Patrick José Jacinto Gomero",
    doctorCmp: doctorMeta?.cmp?.trim() || "61693",
    doctorRne: doctorMeta?.rne?.trim() || "38657",
    baseline: normalizeBaseline(row.baseline),
    visits: normalizeVisits(row.visits),
    maternalPathologies: normalizePathologies(row.maternalPathologies),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function resolveDoctorCredentials(
  tenantId: string,
  doctorId?: string | null
): Promise<{ fullName: string; cmp: string; rne: string }> {
  if (doctorId) {
    const [doc] = await db
      .select({
        fullName: profiles.fullName,
        cmp: profiles.cmp,
        rne: profiles.rne,
      })
      .from(profiles)
      .where(and(eq(profiles.id, doctorId), eq(profiles.tenantId, tenantId)))
      .limit(1);

    if (doc) {
      return {
        fullName: doc.fullName || "Dr. Patrick José Jacinto Gomero",
        cmp: doc.cmp || "61693",
        rne: doc.rne || "38657",
      };
    }
  }

  return {
    fullName: "Dr. Patrick José Jacinto Gomero",
    cmp: "61693",
    rne: "38657",
  };
}

export async function getPrenatalCardByPatient(
  tenantId: string,
  patientId: string
): Promise<PrenatalCardItem | null> {
  const [row] = await db
    .select()
    .from(prenatalCards)
    .where(
      and(
        eq(prenatalCards.tenantId, tenantId),
        eq(prenatalCards.patientId, patientId),
        isNull(prenatalCards.deletedAt)
      )
    )
    .orderBy(desc(prenatalCards.updatedAt))
    .limit(1);

  if (!row) return null;

  const docMeta = await resolveDoctorCredentials(tenantId, row.attendingDoctorId);
  return mapPrenatalCardRow(row, docMeta);
}

export async function getPrenatalCardById(
  tenantId: string,
  id: string
): Promise<PrenatalCardItem | null> {
  const [row] = await db
    .select()
    .from(prenatalCards)
    .where(
      and(
        eq(prenatalCards.tenantId, tenantId),
        eq(prenatalCards.id, id),
        isNull(prenatalCards.deletedAt)
      )
    )
    .limit(1);

  if (!row) return null;

  const docMeta = await resolveDoctorCredentials(tenantId, row.attendingDoctorId);
  return mapPrenatalCardRow(row, docMeta);
}

export async function upsertPrenatalCard(
  ctx: SessionPayload,
  actorName: string,
  input: UpsertPrenatalCardInput
): Promise<PrenatalCardItem> {
  const tenantId = ctx.tenantId!;

  // 1. Verificar propiedad anti-IDOR de la paciente
  const [patientRow] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(
      and(
        eq(patients.id, input.patientId),
        eq(patients.tenantId, tenantId),
        isNull(patients.deletedAt)
      )
    )
    .limit(1);

  if (!patientRow) {
    throw new DomainError(
      "La paciente seleccionada no existe o no pertenece a su clínica."
    );
  }

  const docMeta = await resolveDoctorCredentials(tenantId, ctx.userId);
  const cleanBaseline = normalizeBaseline(input.baseline);
  const cleanVisits = normalizeVisits(input.visits);
  const cleanPathologies = normalizePathologies(input.maternalPathologies);

  // 2. Buscar si ya existe un carnet prenatal activo para esta paciente
  const [existing] = await db
    .select()
    .from(prenatalCards)
    .where(
      and(
        eq(prenatalCards.tenantId, tenantId),
        eq(prenatalCards.patientId, input.patientId),
        isNull(prenatalCards.deletedAt)
      )
    )
    .limit(1);

  let savedRow: typeof prenatalCards.$inferSelect;

  if (existing) {
    const [updated] = await db
      .update(prenatalCards)
      .set({
        clinicEstablishment: input.clinicEstablishment.trim(),
        attendingDoctorId: ctx.userId,
        attendingDoctorName:
          input.attendingDoctorName.trim() || docMeta.fullName,
        baseline: cleanBaseline,
        visits: cleanVisits,
        maternalPathologies: cleanPathologies,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(prenatalCards.id, existing.id),
          eq(prenatalCards.tenantId, tenantId)
        )
      )
      .returning();

    savedRow = updated;

    await recordAuditLog({
      ctx,
      actorName,
      action: "UPDATE",
      entityType: "prenatal_cards",
      entityId: updated.id,
      changesSummary: {
        patientId: input.patientId,
        visitsCount: cleanVisits.length,
        fum: cleanBaseline.fum,
        fpp: cleanBaseline.fpp,
      },
    });
  } else {
    const [created] = await db
      .insert(prenatalCards)
      .values({
        tenantId,
        patientId: input.patientId,
        clinicEstablishment: input.clinicEstablishment.trim(),
        attendingDoctorId: ctx.userId,
        attendingDoctorName:
          input.attendingDoctorName.trim() || docMeta.fullName,
        baseline: cleanBaseline,
        visits: cleanVisits,
        maternalPathologies: cleanPathologies,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning();

    savedRow = created;

    await recordAuditLog({
      ctx,
      actorName,
      action: "CREATE",
      entityType: "prenatal_cards",
      entityId: created.id,
      changesSummary: {
        patientId: input.patientId,
        visitsCount: cleanVisits.length,
        fum: cleanBaseline.fum,
        fpp: cleanBaseline.fpp,
      },
    });
  }

  // 3. Sincronización opcional de FUR (FUM) hacia patient_backgrounds
  if (
    input.syncBackgroundFur !== false &&
    cleanBaseline.fum &&
    /^\d{4}-\d{2}-\d{2}$/.test(cleanBaseline.fum)
  ) {
    const [bgRow] = await db
      .select({ id: patientBackgrounds.id })
      .from(patientBackgrounds)
      .where(
        and(
          eq(patientBackgrounds.tenantId, tenantId),
          eq(patientBackgrounds.patientId, input.patientId),
          isNull(patientBackgrounds.deletedAt)
        )
      )
      .limit(1);

    if (bgRow) {
      await db
        .update(patientBackgrounds)
        .set({
          lastMenstrualPeriod: cleanBaseline.fum,
          updatedBy: ctx.userId,
          updatedAt: new Date(),
        })
        .where(eq(patientBackgrounds.id, bgRow.id));
    }
  }

  return mapPrenatalCardRow(savedRow, docMeta);
}

export async function softDeletePrenatalCard(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string }> {
  const tenantId = ctx.tenantId!;

  const [existing] = await db
    .select({ id: prenatalCards.id, patientId: prenatalCards.patientId })
    .from(prenatalCards)
    .where(
      and(
        eq(prenatalCards.id, id),
        eq(prenatalCards.tenantId, tenantId),
        isNull(prenatalCards.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("El carnet prenatal no existe o ya fue eliminado.");
  }

  await db
    .update(prenatalCards)
    .set({
      deletedAt: new Date(),
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(
      and(eq(prenatalCards.id, id), eq(prenatalCards.tenantId, tenantId))
    );

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "prenatal_cards",
    entityId: id,
    changesSummary: { patientId: existing.patientId },
  });

  return { id };
}
