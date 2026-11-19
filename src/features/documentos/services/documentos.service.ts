import crypto from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { patientDocuments, patients } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import {
  deletePrivateStorageObject,
  downloadPrivateStorageObject,
  uploadPrivateStorageObject,
} from "@/lib/supabase/storage";
import { getPeruDateString } from "@/lib/utils";
import {
  isPdfMagicBytes,
  MAX_PATIENT_PDF_BYTES,
  PATIENT_DOCUMENT_TYPES,
  type CreatePatientDocumentMetaInput,
  type PatientDocumentItem,
  type PatientDocumentType,
} from "../documentos.schema";

function normalizeDocumentType(raw: string): PatientDocumentType {
  if ((PATIENT_DOCUMENT_TYPES as readonly string[]).includes(raw)) {
    return raw as PatientDocumentType;
  }
  return "EXTERNO";
}

function mapPatientDocumentRow(
  row: typeof patientDocuments.$inferSelect
): PatientDocumentItem {
  return {
    id: row.id,
    patientId: row.patientId,
    documentType: normalizeDocumentType(row.documentType),
    title: row.title,
    documentDate: row.documentDate ?? getPeruDateString(row.createdAt),
    storagePath: row.storagePath,
    fileName: row.fileName,
    fileSize: row.fileSize ?? 0,
    mimeType: row.mimeType,
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function sanitizePdfFilename(rawName: string): string {
  const cleaned = rawName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
  if (!cleaned) return "documento.pdf";
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

export async function listPatientDocumentsByPatient(
  tenantId: string,
  patientId: string
): Promise<PatientDocumentItem[]> {
  const rows = await db
    .select()
    .from(patientDocuments)
    .where(
      and(
        eq(patientDocuments.tenantId, tenantId),
        eq(patientDocuments.patientId, patientId),
        isNull(patientDocuments.deletedAt)
      )
    )
    .orderBy(
      desc(patientDocuments.documentDate),
      desc(patientDocuments.createdAt)
    );

  return rows.map(mapPatientDocumentRow);
}

export async function getPatientDocumentBinary(
  tenantId: string,
  documentId: string
): Promise<{
  buffer: ArrayBuffer;
  mimeType: string;
  fileName: string;
  title: string;
} | null> {
  const [docRow] = await db
    .select()
    .from(patientDocuments)
    .where(
      and(
        eq(patientDocuments.id, documentId),
        eq(patientDocuments.tenantId, tenantId),
        isNull(patientDocuments.deletedAt)
      )
    )
    .limit(1);

  if (!docRow) return null;

  const downloaded = await downloadPrivateStorageObject({
    bucket: "lab-reports",
    path: docRow.storagePath,
  });

  if (!downloaded) return null;

  return {
    buffer: downloaded.buffer,
    mimeType: "application/pdf",
    fileName: sanitizePdfFilename(docRow.fileName || `${docRow.title}.pdf`),
    title: docRow.title,
  };
}

export async function uploadPatientDocument(
  ctx: SessionPayload,
  actorName: string,
  input: CreatePatientDocumentMetaInput,
  fileBytes: Uint8Array,
  originalFileName: string
): Promise<PatientDocumentItem> {
  if (!ctx.tenantId) {
    throw new DomainError("Sede clínica no asociada a la sesión.");
  }

  if (fileBytes.byteLength === 0) {
    throw new DomainError("El archivo PDF está vacío.");
  }
  if (fileBytes.byteLength > MAX_PATIENT_PDF_BYTES) {
    throw new DomainError("El archivo PDF supera el límite máximo de 15 MB.");
  }
  if (!isPdfMagicBytes(fileBytes)) {
    throw new DomainError(
      "Formato rechazado. Solo se admiten archivos PDF válidos (%PDF-)."
    );
  }

  const [patientRow] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(
      and(
        eq(patients.id, input.patientId),
        eq(patients.tenantId, ctx.tenantId),
        isNull(patients.deletedAt)
      )
    )
    .limit(1);

  if (!patientRow) {
    throw new DomainError("Paciente no encontrada en la sede actual.");
  }

  const fileUuid = crypto.randomUUID();
  const storagePath = `documents/${ctx.tenantId}/${input.patientId}/${fileUuid}.pdf`;

  await uploadPrivateStorageObject({
    bucket: "lab-reports",
    path: storagePath,
    body: fileBytes,
    contentType: "application/pdf",
  });

  const safeFileName = sanitizePdfFilename(
    originalFileName || `${input.title}.pdf`
  );
  const effectiveDate = input.documentDate?.trim() || getPeruDateString();

  const [inserted] = await db
    .insert(patientDocuments)
    .values({
      tenantId: ctx.tenantId,
      patientId: input.patientId,
      documentType: input.documentType,
      title: input.title.trim(),
      documentDate: effectiveDate,
      storagePath,
      fileName: safeFileName,
      fileSize: fileBytes.byteLength,
      mimeType: "application/pdf",
      notes: input.notes?.trim() || null,
      uploadedBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "patient_document",
    entityId: inserted.id,
    changesSummary: {
      patientId: input.patientId,
      documentType: input.documentType,
      title: inserted.title,
      fileSize: inserted.fileSize,
    },
  });

  return mapPatientDocumentRow(inserted);
}

export async function softDeletePatientDocument(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string; patientId: string }> {
  if (!ctx.tenantId) {
    throw new DomainError("Sede clínica no asociada a la sesión.");
  }

  const [existing] = await db
    .select()
    .from(patientDocuments)
    .where(
      and(
        eq(patientDocuments.id, id),
        eq(patientDocuments.tenantId, ctx.tenantId),
        isNull(patientDocuments.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Documento externo no encontrado o ya eliminado.");
  }

  await db
    .update(patientDocuments)
    .set({
      deletedAt: new Date(),
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(patientDocuments.id, existing.id));

  await deletePrivateStorageObject({
    bucket: "lab-reports",
    path: existing.storagePath,
  }).catch(() => undefined);

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "patient_document",
    entityId: existing.id,
    changesSummary: {
      patientId: existing.patientId,
      documentType: existing.documentType,
      title: existing.title,
    },
  });

  return { id: existing.id, patientId: existing.patientId };
}
