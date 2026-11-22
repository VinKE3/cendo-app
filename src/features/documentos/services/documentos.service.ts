import crypto from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { patientDocuments, patients, wordHistoryDocuments } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/audit-log";
import { DomainError, type SessionPayload } from "@/lib/security/action-guard";
import {
  deletePrivateStorageObject,
  downloadPrivateStorageObject,
  uploadPrivateStorageObject,
} from "@/lib/supabase/storage";
import { getPeruDateString } from "@/lib/utils";
import {
  detectSupportedDocumentMime,
  getExtensionForDocumentMime,
  isDocxZipMagicBytes,
  MAX_PATIENT_IMAGE_BYTES,
  MAX_PATIENT_PDF_BYTES,
  MAX_WORD_DOCX_BYTES,
  PATIENT_DOCUMENT_TYPES,
  type CreatePatientDocumentMetaInput,
  type PatientDocumentItem,
  type PatientDocumentType,
  type SupportedExternalDocumentMime,
  type WordHistoryDocumentItem,
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

function mapWordHistoryRow(
  row: typeof wordHistoryDocuments.$inferSelect
): WordHistoryDocumentItem {
  return {
    id: row.id,
    patientId: row.patientId,
    fileName: row.fileName,
    fileSize: row.fileSize ?? 0,
    extractedText: row.extractedText ?? "",
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function sanitizeStorageDownloadFilename(
  rawName: string,
  expectedExtension: string
): string {
  const cleaned = rawName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
  const extSuffix = `.${expectedExtension.toLowerCase()}`;
  if (!cleaned) return `documento${extSuffix}`;
  if (cleaned.toLowerCase().endsWith(extSuffix)) return cleaned;
  return `${cleaned.replace(/\.[a-z0-9]{1,5}$/i, "")}${extSuffix}`;
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

  const allowedMimes: readonly string[] = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ];
  const safeMime = allowedMimes.includes(docRow.mimeType)
    ? (docRow.mimeType as SupportedExternalDocumentMime)
    : "application/pdf";
  const ext = getExtensionForDocumentMime(safeMime);

  return {
    buffer: downloaded.buffer,
    mimeType: safeMime,
    fileName: sanitizeStorageDownloadFilename(
      docRow.fileName || docRow.title,
      ext
    ),
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
    throw new DomainError("El archivo está vacío.");
  }

  const detectedMime = detectSupportedDocumentMime(fileBytes);
  if (!detectedMime) {
    throw new DomainError(
      "Formato rechazado. Solo se admiten PDFs válidos (%PDF-) o imágenes JPG, PNG o WebP."
    );
  }

  const maxBytes =
    detectedMime === "application/pdf"
      ? MAX_PATIENT_PDF_BYTES
      : MAX_PATIENT_IMAGE_BYTES;
  if (fileBytes.byteLength > maxBytes) {
    throw new DomainError(
      detectedMime === "application/pdf"
        ? "El archivo PDF supera el límite máximo de 25 MB."
        : "La imagen supera el límite máximo de 15 MB."
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

  const ext = getExtensionForDocumentMime(detectedMime);
  const fileUuid = crypto.randomUUID();
  const storagePath = `documents/${ctx.tenantId}/${input.patientId}/${fileUuid}.${ext}`;

  await uploadPrivateStorageObject({
    bucket: "lab-reports",
    path: storagePath,
    body: fileBytes,
    contentType: detectedMime,
  });

  const safeFileName = sanitizeStorageDownloadFilename(
    originalFileName || input.title,
    ext
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
      mimeType: detectedMime,
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
      mimeType: detectedMime,
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

export async function listWordHistoriesByPatient(
  tenantId: string,
  patientId: string
): Promise<WordHistoryDocumentItem[]> {
  const rows = await db
    .select()
    .from(wordHistoryDocuments)
    .where(
      and(
        eq(wordHistoryDocuments.tenantId, tenantId),
        eq(wordHistoryDocuments.patientId, patientId),
        isNull(wordHistoryDocuments.deletedAt)
      )
    )
    .orderBy(desc(wordHistoryDocuments.createdAt));

  return rows.map(mapWordHistoryRow);
}

export async function getWordHistoryBinary(
  tenantId: string,
  wordDocId: string
): Promise<{ buffer: ArrayBuffer; fileName: string } | null> {
  const [row] = await db
    .select()
    .from(wordHistoryDocuments)
    .where(
      and(
        eq(wordHistoryDocuments.id, wordDocId),
        eq(wordHistoryDocuments.tenantId, tenantId),
        isNull(wordHistoryDocuments.deletedAt)
      )
    )
    .limit(1);

  if (!row) return null;

  const downloaded = await downloadPrivateStorageObject({
    bucket: "lab-reports",
    path: row.storagePath,
  });
  if (!downloaded) return null;

  return {
    buffer: downloaded.buffer,
    fileName: sanitizeStorageDownloadFilename(row.fileName, "docx"),
  };
}

export async function saveWordHistoryDocument(
  ctx: SessionPayload,
  actorName: string,
  params: {
    patientId: string;
    fileName: string;
    fileBytes: Uint8Array;
    extractedText: string;
    notes?: string;
  }
): Promise<WordHistoryDocumentItem> {
  if (!ctx.tenantId) {
    throw new DomainError("Sede clínica no asociada a la sesión.");
  }

  if (
    params.fileBytes.byteLength === 0 ||
    params.fileBytes.byteLength > MAX_WORD_DOCX_BYTES
  ) {
    throw new DomainError("El archivo Word (.docx) debe pesar máximo 10 MB.");
  }

  if (!isDocxZipMagicBytes(params.fileBytes)) {
    throw new DomainError("El archivo Word no corresponde a un .docx válido.");
  }

  const fileUuid = crypto.randomUUID();
  const storagePath = `word-histories/${ctx.tenantId}/${params.patientId}/${fileUuid}.docx`;

  await uploadPrivateStorageObject({
    bucket: "lab-reports",
    path: storagePath,
    body: params.fileBytes,
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const safeFileName = sanitizeStorageDownloadFilename(params.fileName, "docx");

  const [inserted] = await db
    .insert(wordHistoryDocuments)
    .values({
      tenantId: ctx.tenantId,
      patientId: params.patientId,
      fileName: safeFileName,
      fileSize: params.fileBytes.byteLength,
      storagePath,
      extractedText: params.extractedText.slice(0, 60000),
      notes: params.notes?.trim() || null,
      uploadedBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning();

  await recordAuditLog({
    ctx,
    actorName,
    action: "CREATE",
    entityType: "word_history_document",
    entityId: inserted.id,
    changesSummary: {
      patientId: params.patientId,
      fileName: inserted.fileName,
      fileSize: inserted.fileSize,
    },
  });

  return mapWordHistoryRow(inserted);
}

export async function softDeleteWordHistoryDocument(
  ctx: SessionPayload,
  actorName: string,
  id: string
): Promise<{ id: string; patientId: string }> {
  if (!ctx.tenantId) {
    throw new DomainError("Sede clínica no asociada a la sesión.");
  }

  const [existing] = await db
    .select()
    .from(wordHistoryDocuments)
    .where(
      and(
        eq(wordHistoryDocuments.id, id),
        eq(wordHistoryDocuments.tenantId, ctx.tenantId),
        isNull(wordHistoryDocuments.deletedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new DomainError("Historia Word no encontrada o ya eliminada.");
  }

  await db
    .update(wordHistoryDocuments)
    .set({
      deletedAt: new Date(),
      updatedBy: ctx.userId,
      updatedAt: new Date(),
    })
    .where(eq(wordHistoryDocuments.id, existing.id));

  await deletePrivateStorageObject({
    bucket: "lab-reports",
    path: existing.storagePath,
  }).catch(() => undefined);

  await recordAuditLog({
    ctx,
    actorName,
    action: "DELETE",
    entityType: "word_history_document",
    entityId: existing.id,
    changesSummary: {
      patientId: existing.patientId,
      fileName: existing.fileName,
    },
  });

  return { id: existing.id, patientId: existing.patientId };
}
