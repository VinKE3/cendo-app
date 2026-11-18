import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { auditColumns } from "./_helpers";
import { clinics, profiles } from "./clinics";
import { medicalAppointments, patients } from "./patients";

export const labUrgencyEnum = pgEnum("lab_urgency", [
  "Rutina",
  "Prioritario",
  "Urgente",
]);

export interface ConsultationVitalSignsRecord {
  bloodPressure: string;
  heartRate: number;
  respiratoryRate?: number;
  temperature: number;
  oxygenSaturation?: number;
  weightKg: number;
  heightCm: number;
  bmi: number;
}

export interface ConsultationPhysicalExamRecord {
  generalExam: string;
  breastsExam: string;
  externalGenitalia: string;
  speculoscopy: string;
  bimanualPalpation: string;
}

export interface PrescriptionItemRecord {
  id: string;
  medicationName: string;
  presentation: string;
  route: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: string;
}

export interface LabOrderItemRecord {
  id: string;
  category: string;
  testName: string;
  sampleType?: string;
  notes?: string;
}

export interface LabSpecimenDetailsRecord {
  anatomicalSite?: string;
  sampleMethod?: string;
  fixative?: string;
  containerCount?: number;
  cervixAspect?: string;
  furDate?: string;
  obstetricParity?: string;
  contraceptiveMethod?: string;
  clinicalFindings?: string;
  sampleObtainedAt?: string;
  procedureOrigin?: string;
}

export interface QuoteItemRecord {
  procedureId: string;
  code: string;
  name: string;
  category: string;
  regularPrice: number;
  discountPercent?: number;
  finalPrice: number;
}

export const medicalConsultations = pgTable(
  "medical_consultations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id").references(() => medicalAppointments.id, {
      onDelete: "set null",
    }),
    doctorId: uuid("doctor_id").references(() => profiles.id, { onDelete: "set null" }),
    doctorName: text("doctor_name").notNull(),
    doctorCmp: varchar("doctor_cmp", { length: 20 }).notNull(),
    doctorRne: varchar("doctor_rne", { length: 20 }),
    consultationDate: date("consultation_date", { mode: "string" }).notNull(),
    reasonForVisit: text("reason_for_visit").notNull(),
    illnessTime: text("illness_time"),
    symptoms: text("symptoms"),
    vitalSigns: jsonb("vital_signs").$type<ConsultationVitalSignsRecord>().notNull(),
    physicalExam: jsonb("physical_exam").$type<ConsultationPhysicalExamRecord>().notNull(),
    diagnosis: text("diagnosis").notNull(),
    cie10Code: varchar("cie10_code", { length: 15 }),
    treatmentPlan: text("treatment_plan").notNull(),
    auxiliaryExams: text("auxiliary_exams"),
    prescriptionNotes: text("prescription_notes"),
    nextAppointmentDate: date("next_appointment_date", { mode: "string" }),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    index("idx_consultations_tenant_patient_date").on(
      table.tenantId,
      table.patientId,
      table.consultationDate
    ),
  ]
);

export const clinicalCheckups = pgTable(
  "clinical_checkups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    consultationId: uuid("consultation_id").references(() => medicalConsultations.id, {
      onDelete: "set null",
    }),
    doctorId: uuid("doctor_id").references(() => profiles.id, { onDelete: "set null" }),
    doctorName: text("doctor_name").notNull(),
    doctorCmp: varchar("doctor_cmp", { length: 20 }).notNull(),
    doctorRne: varchar("doctor_rne", { length: 20 }),
    checkupDate: date("checkup_date", { mode: "string" }).notNull(),
    reasonForConsultation: text("reason_for_consultation"),
    breastUltrasoundFindings: text("breast_ultrasound_findings"),
    breastUltrasoundBirads: text("breast_ultrasound_birads").default("BI-RADS 1"),
    breastLesionMeasurements: text("breast_lesion_measurements"),
    transvaginalUltrasoundFindings: text("transvaginal_ultrasound_findings"),
    uterusMeasurements: text("uterus_measurements"),
    endometriumThicknessMm: numeric("endometrium_thickness_mm", { precision: 5, scale: 2 }),
    ovariesFindings: text("ovaries_findings"),
    colposcopyFindings: text("colposcopy_findings"),
    colposcopyResult: text("colposcopy_result"),
    papResult: text("pap_result"),
    vphResult: text("vph_result"),
    conclusions: text("conclusions"),
    cie10Code: varchar("cie10_code", { length: 15 }),
    medicalPrescription: text("medical_prescription"),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    index("idx_checkups_tenant_patient_date").on(
      table.tenantId,
      table.patientId,
      table.checkupDate
    ),
  ]
);

export const medicalPrescriptions = pgTable(
  "medical_prescriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    consultationId: uuid("consultation_id").references(() => medicalConsultations.id, {
      onDelete: "set null",
    }),
    doctorId: uuid("doctor_id").references(() => profiles.id, { onDelete: "set null" }),
    doctorName: text("doctor_name").notNull(),
    doctorCmp: varchar("doctor_cmp", { length: 20 }).notNull(),
    doctorRne: varchar("doctor_rne", { length: 20 }),
    prescriptionDate: date("prescription_date", { mode: "string" }).notNull(),
    diagnosis: text("diagnosis").notNull(),
    cie10Code: varchar("cie10_code", { length: 15 }),
    items: jsonb("items").$type<PrescriptionItemRecord[]>().default([]).notNull(),
    generalIndications: text("general_indications"),
    nextAppointmentDate: date("next_appointment_date", { mode: "string" }),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    index("idx_prescriptions_tenant_patient_date").on(
      table.tenantId,
      table.patientId,
      table.prescriptionDate
    ),
  ]
);

export const labOrders = pgTable(
  "lab_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    consultationId: uuid("consultation_id").references(() => medicalConsultations.id, {
      onDelete: "set null",
    }),
    doctorId: uuid("doctor_id").references(() => profiles.id, { onDelete: "set null" }),
    doctorName: text("doctor_name").notNull(),
    doctorCmp: varchar("doctor_cmp", { length: 20 }).notNull(),
    doctorRne: varchar("doctor_rne", { length: 20 }),
    orderDate: date("order_date", { mode: "string" }).notNull(),
    diagnosis: text("diagnosis").notNull(),
    cie10Code: varchar("cie10_code", { length: 15 }),
    urgency: labUrgencyEnum("urgency").default("Rutina").notNull(),
    items: jsonb("items").$type<LabOrderItemRecord[]>().default([]).notNull(),
    customTests: text("custom_tests"),
    patientInstructions: text("patient_instructions"),
    templateType: varchar("template_type", { length: 30 }).default("GENERAL"),
    templateTitle: text("template_title"),
    specimenDetails: jsonb("specimen_details").$type<LabSpecimenDetailsRecord>(),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    index("idx_lab_orders_tenant_patient_date").on(
      table.tenantId,
      table.patientId,
      table.orderDate
    ),
  ]
);

export const procedureQuotes = pgTable(
  "procedure_quotes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    consultationId: uuid("consultation_id").references(() => medicalConsultations.id, {
      onDelete: "set null",
    }),
    doctorId: uuid("doctor_id").references(() => profiles.id, { onDelete: "set null" }),
    doctorName: text("doctor_name").notNull(),
    quoteDate: date("quote_date", { mode: "string" }).notNull(),
    validityDays: integer("validity_days").default(30).notNull(),
    items: jsonb("items").$type<QuoteItemRecord[]>().default([]).notNull(),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).default("0.00").notNull(),
    discountTotal: numeric("discount_total", { precision: 10, scale: 2 })
      .default("0.00")
      .notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).default("0.00").notNull(),
    paymentTerms: text("payment_terms")
      .default("Efectivo, Transferencia BCP/BBVA o Tarjeta de Crédito/Débito")
      .notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    index("idx_quotes_tenant_patient_date").on(
      table.tenantId,
      table.patientId,
      table.quoteDate
    ),
  ]
);
