import {
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { auditColumns } from "./_helpers";
import { clinics, profiles } from "./clinics";
import { medicalConsultations } from "./clinical";
import { patients } from "./patients";

export interface ClinicalImageRecord {
  storagePath: string;
  caption: string;
  timestamp?: string;
}

export interface ColposcopyExtendedFindingsRecord {
  inadequateReason?: string;
  nabothCyst?: boolean;
  cryptOpenings?: boolean;
  deciduosis?: boolean;
  rapidAcetowhite?: boolean;
  thickenedGlands?: boolean;
  sharpBorders?: boolean;
  innerBorderSign?: boolean;
  ridgeSign?: boolean;
  leukoplakia?: boolean;
  erosion?: boolean;
  fragileVessels?: boolean;
  irregularSurface?: boolean;
  exophyticLesion?: boolean;
  necrosis?: boolean;
  nodularTumor?: boolean;
  congenitalTZ?: boolean;
  condyloma?: boolean;
  polyp?: boolean;
  inflammation?: boolean;
  stenosis?: boolean;
  postTreatmentAnomaly?: boolean;
  endometriosisFoci?: boolean;
  otherFindings?: string;
}

export interface UltrasoundBreastLesionRecord {
  id: string;
  breastSide: "Derecha" | "Izquierda" | "Bilateral";
  lesionType: string;
  clockHour?: string;
  distanceFromNippleCm?: string;
  depthFromSkinMm?: string;
  dimensionsMm?: string;
  shape?: string;
  margins?: string;
  orientation?: string;
  echoPattern?: string;
  posteriorAcoustic?: string;
  notes?: string;
}

export interface UltrasoundDopplerVesselRecord {
  pi?: number;
  percentile?: string;
  status?: "Normal" | "Alterado" | "No evaluado";
}

export interface UltrasoundDopplerRecord {
  umbilicalArtery?: UltrasoundDopplerVesselRecord;
  middleCerebralArtery?: UltrasoundDopplerVesselRecord;
  cerebroplacentalRatio?: UltrasoundDopplerVesselRecord;
  rightUterineArtery?: UltrasoundDopplerVesselRecord;
  leftUterineArtery?: UltrasoundDopplerVesselRecord;
  meanUterineArteries?: UltrasoundDopplerVesselRecord;
  ductusVenosus?: UltrasoundDopplerVesselRecord;
}

export interface UltrasoundFindingsRecord {
  // Común
  referringDoctor?: string;
  // Ginecológica / Pélvica-TV y compartidos con I Trimestre
  uterusPosition?: "AVF" | "RVF" | "Indiferente";
  uterusDimensions?: string;
  uterusVolumeCc?: number;
  myometriumStatus?: string;
  endometriumThicknessMm?: number;
  endometriumPattern?: "Trilaminar" | "Secretor" | "Atrófico" | "Engrosado irregular";
  cervixLengthMm?: number;
  cervixStatus?: string;
  uterusEcopulsionPain?: string;
  rightOvaryDimensions?: string;
  rightOvaryVolumeCc?: number;
  leftOvaryDimensions?: string;
  leftOvaryVolumeCc?: number;
  ovaryEcopulsionPain?: string;
  periOvarianFluid?: string;
  ovariesNotes?: string;
  douglasPouch?: string;
  endometriosisFoci?: string;
  slidingSign?: "Positivo" | "Negativo" | "Parcial";
  uterosacralLigaments?: string;
  // Mama bilateral (BI-RADS y lesiones estructuradas)
  breastAcrType?: "Tipo A" | "Tipo B" | "Tipo C" | "Tipo D";
  breastPattern?: string;
  rightBreastFindings?: string;
  leftBreastFindings?: string;
  breastLesions?: UltrasoundBreastLesionRecord[];
  breastComplement?: string;
  biradsCategory?: string;
  // Obstétrica I Trimestre y Genética 11-14 ss
  gestationalSacsCount?: number;
  gestationalSacMm?: number;
  yolkSacMm?: number;
  embryoCrownRumpLengthMm?: number;
  gestationalAgeByEcho?: string;
  fetalHeartRate?: number;
  choriodecidualReaction?: string;
  nuchalTranslucencyMm?: number;
  nasalBone?: "Presente" | "Ausente" | "Hipoplásico" | "No evaluable";
  ductusVenosusWave?: "Onda A (+)" | "Onda A ausente" | "Onda A reversa" | "No evaluado";
  ductusVenosusPi?: number;
  uterineArteriesMeanPi?: number;
  chromosomopathyRisk?: "Bajo riesgo" | "Riesgo intermedio" | "Alto riesgo";
  preeclampsiaRisk?: "Bajo riesgo" | "Riesgo intermedio" | "Alto riesgo";
  // Obstétrica II-III Trimestre, Morfológica y Estudio Doppler
  fetalStatic?: string;
  fetalSex?: "Masculino" | "Femenino" | "No determinado";
  fetalAnatomySummary?: string;
  fetalHeartFourChambers?: string;
  fetalAbdominalWall?: string;
  fetalKidneys?: string;
  fetalSpine?: string;
  bpdMm?: number;
  hcMm?: number;
  acMm?: number;
  flMm?: number;
  estimatedFetalWeightGr?: number;
  estimatedFetalWeightPercentile?: string;
  bppBodyMovements?: number;
  bppBreathingMovements?: number;
  bppMuscleTone?: number;
  bppAmnioticFluid?: number;
  placentaLocation?: string;
  placentaGrade?: string;
  placentaHematomas?: string;
  umbilicalCord?: string;
  amnioticFluidIndex?: string;
  amnioticFluidIlaMm?: number;
  includeDoppler?: boolean;
  doppler?: UltrasoundDopplerRecord;
}

export type ProcedurePathologyStatus = "NO_APLICA" | "PENDIENTE" | "RECIBIDO";

export interface MinorProcedureDetailsRecord {
  asepsisTechnique: string;
  biopsySites?: string;
  specimenSentToPathology: boolean;
  specimenDescription?: string;
  bleedingAmount: string;
  hemostasisMethod: string;
  complications: string;
  informedConsentConfirmed?: boolean;
  deviceInfo?: string;
  pathologyStatus?: ProcedurePathologyStatus;
  pathologyResultNotes?: string;
}

export type PrenatalBaselineRecord = Record<string, unknown>;
export type PrenatalVisitRecord = Record<string, unknown>;
export interface MaternalPathologyRecord {
  id: string;
  name: string;
  cie10: string;
  diagnosedDate: string;
}

export const colposcopyReports = pgTable(
  "colposcopy_reports",
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
    reportDate: date("report_date", { mode: "string" }).notNull(),
    adequateColposcopy: boolean("adequate_colposcopy").default(true).notNull(),
    squamocolumnarJunctionVisible: text("squamocolumnar_junction_visible")
      .default("Visible")
      .notNull(),
    transformationZoneType: text("transformation_zone_type").default("Tipo 1").notNull(),
    matureSquamousEpithelium: boolean("mature_squamous_epithelium").default(true).notNull(),
    ectopy: boolean("ectopy").default(false).notNull(),
    thinAcetowhiteEpithelium: boolean("thin_acetowhite_epithelium").default(false).notNull(),
    denseAcetowhiteEpithelium: boolean("dense_acetowhite_epithelium").default(false).notNull(),
    irregularBorder: boolean("irregular_border").default(false).notNull(),
    fineMosaic: boolean("fine_mosaic").default(false).notNull(),
    coarseMosaic: boolean("coarse_mosaic").default(false).notNull(),
    finePunctation: boolean("fine_punctation").default(false).notNull(),
    coarsePunctation: boolean("coarse_punctation").default(false).notNull(),
    atypicalVessels: boolean("atypical_vessels").default(false).notNull(),
    extendedFindings: jsonb("extended_findings")
      .$type<ColposcopyExtendedFindingsRecord>()
      .default({})
      .notNull(),
    schillerTest: text("schiller_test").default("Negativo").notNull(),
    cervicalBiopsyTaken: boolean("cervical_biopsy_taken").default(false).notNull(),
    biopsyClockHours: jsonb("biopsy_clock_hours").$type<string[]>().default([]).notNull(),
    images: jsonb("images").$type<ClinicalImageRecord[]>().default([]).notNull(),
    diagnosis: text("diagnosis").notNull(),
    planRecommendations: text("plan_recommendations").notNull(),
    cie10Code: varchar("cie10_code", { length: 15 }).default("Z01.4").notNull(),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    index("idx_colposcopy_tenant_patient_date").on(
      table.tenantId,
      table.patientId,
      table.reportDate
    ),
  ]
);

export const ultrasoundReports = pgTable(
  "ultrasound_reports",
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
    reportDate: date("report_date", { mode: "string" }).notNull(),
    ultrasoundType: varchar("ultrasound_type", { length: 40 }).notNull(),
    indication: text("indication").notNull(),
    findings: jsonb("findings").$type<UltrasoundFindingsRecord>().default({}).notNull(),
    conclusion: text("conclusion").notNull(),
    recommendations: text("recommendations"),
    images: jsonb("images").$type<ClinicalImageRecord[]>().default([]).notNull(),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    index("idx_ultrasound_tenant_patient_date").on(
      table.tenantId,
      table.patientId,
      table.reportDate
    ),
  ]
);

export const minorProcedures = pgTable(
  "minor_procedures",
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
    procedureDate: date("procedure_date", { mode: "string" }).notNull(),
    procedureType: varchar("procedure_type", { length: 50 }).notNull(),
    preOpDiagnosis: text("pre_op_diagnosis").notNull(),
    postOpDiagnosis: text("post_op_diagnosis").notNull(),
    cie10Code: varchar("cie10_code", { length: 15 }),
    anesthesiaType: text("anesthesia_type").default("Local (Lidocaína 2%)").notNull(),
    procedureDetails: jsonb("procedure_details")
      .$type<MinorProcedureDetailsRecord>()
      .notNull(),
    postOpIndications: text("post_op_indications").notNull(),
    medicationsPrescribed: text("medications_prescribed"),
    nextControlDate: date("next_control_date", { mode: "string" }),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    index("idx_procedures_tenant_patient_date").on(
      table.tenantId,
      table.patientId,
      table.procedureDate
    ),
  ]
);

export const prenatalCards = pgTable(
  "prenatal_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    clinicEstablishment: text("clinic_establishment")
      .default("CENDO - Centro de Endometriosis & Ginecología Especializada")
      .notNull(),
    attendingDoctorId: uuid("attending_doctor_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    attendingDoctorName: text("attending_doctor_name").notNull(),
    baseline: jsonb("baseline").$type<PrenatalBaselineRecord>().default({}).notNull(),
    visits: jsonb("visits").$type<PrenatalVisitRecord[]>().default([]).notNull(),
    maternalPathologies: jsonb("maternal_pathologies")
      .$type<MaternalPathologyRecord[]>()
      .default([])
      .notNull(),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("uq_prenatal_cards_tenant_patient")
      .on(table.tenantId, table.patientId)
      .where(sql`${table.deletedAt} IS NULL`),
  ]
);
