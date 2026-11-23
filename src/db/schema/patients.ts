import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { auditColumns } from "./_helpers";
import { clinics, profiles } from "./clinics";

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "PENDIENTE",
  "CONFIRMADA",
  "EN_ESPERA",
  "ATENDIDA",
  "CANCELADA",
  "NO_ASISTIO",
]);

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    documentType: varchar("document_type", { length: 20 }).default("DNI").notNull(),
    documentNumber: varchar("document_number", { length: 20 }).notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    fullName: text("full_name").notNull(),
    birthDate: date("birth_date", { mode: "string" }),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    district: text("district").default("Miraflores"),
    civilStatus: text("civil_status").default("Soltera"),
    occupation: text("occupation"),
    educationLevel: text("education_level"),
    birthPlace: text("birth_place"),
    religion: text("religion"),
    insuranceInfo: text("insurance_info").default("Particular"),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("idx_patients_tenant_doc")
      .on(table.tenantId, table.documentType, sql`TRIM(${table.documentNumber})`)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_patients_tenant_doc_num").on(table.tenantId, table.documentNumber),
    index("idx_patients_tenant_fullname").on(table.tenantId, table.fullName),
  ]
);

export const patientBackgrounds = pgTable(
  "patient_backgrounds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    menarche: integer("menarche"),
    sexualDebutAge: integer("sexual_debut_age"),
    sexualPartnersCount: integer("sexual_partners_count"),
    catamenialRegimen: text("catamenial_regimen"),
    stiHistory: text("sti_history"),
    obstetricFormula: varchar("obstetric_formula", { length: 30 }).default("G0 P0000"),
    obstetricFormulaDetails: text("obstetric_formula_details"),
    contraceptiveMethod: text("contraceptive_method"),
    lastMenstrualPeriod: date("last_menstrual_period", { mode: "string" }),
    papHistory: text("pap_history"),
    vphTestHistory: text("vph_test_history"),
    hasDiabetes: text("has_diabetes").default("Niega"),
    hasHypertension: text("has_hypertension").default("Niega"),
    hasAsthma: text("has_asthma").default("Niega"),
    medicalAllergies: text("medical_allergies"),
    surgeriesHistory: text("surgeries_history"),
    familyHistory: text("family_history"),
    otherPathologies: text("other_pathologies"),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("uq_patient_backgrounds_patient_id")
      .on(table.tenantId, table.patientId)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);

export const medicalAppointments = pgTable(
  "medical_appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id").references(() => profiles.id, { onDelete: "set null" }),
    doctorName: text("doctor_name").notNull(),
    appointmentDate: date("appointment_date", { mode: "string" }).notNull(),
    appointmentTime: time("appointment_time").notNull(),
    durationMinutes: integer("duration_minutes").default(30).notNull(),
    appointmentType: text("appointment_type").notNull(),
    reason: text("reason").notNull(),
    status: appointmentStatusEnum("status").default("CONFIRMADA").notNull(),
    notes: text("notes"),
    reminderSent: boolean("reminder_sent").default(false).notNull(),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    index("idx_appointments_tenant_date_doctor").on(
      table.tenantId,
      table.appointmentDate,
      table.doctorId
    ),
    index("idx_appointments_tenant_patient_date").on(
      table.tenantId,
      table.patientId,
      table.appointmentDate
    ),
  ]
);
