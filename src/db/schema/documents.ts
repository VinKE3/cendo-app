import { date, index, integer, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { auditColumns } from "./_helpers";
import { clinics, profiles } from "./clinics";
import { patients } from "./patients";

export const patientDocuments = pgTable(
  "patient_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    documentType: varchar("document_type", { length: 40 })
      .default("LABORATORIO")
      .notNull(),
    title: text("title").notNull(),
    documentDate: date("document_date", { mode: "string" }),
    storagePath: text("storage_path").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size"),
    mimeType: text("mime_type").default("application/pdf").notNull(),
    notes: text("notes"),
    uploadedBy: uuid("uploaded_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    index("idx_patient_docs_tenant_patient_created").on(
      table.tenantId,
      table.patientId,
      table.createdAt
    ),
  ]
);

export const wordHistoryDocuments = pgTable(
  "word_history_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size"),
    storagePath: text("storage_path").notNull(),
    extractedText: text("extracted_text"),
    notes: text("notes"),
    uploadedBy: uuid("uploaded_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    index("idx_word_docs_tenant_patient_created").on(
      table.tenantId,
      table.patientId,
      table.createdAt
    ),
  ]
);
