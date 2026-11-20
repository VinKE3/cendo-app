import { z } from "zod";
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import type { UltrasoundReportItem } from "@/features/ecografias/ecografias.schema";
import { getPeruDateString } from "@/lib/utils";

const pgUuidSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "UUID inválido."
  );

// ============================================================================
// CATÁLOGOS OFICIALES MINSA / CLAP (NTS N° 105 - MINSA)
// ============================================================================

export interface FamilyHistoryCatalogItem {
  id: string;
  label: string;
  isAlert: boolean;
  note?: string;
  hint: string;
}

export const MINSA_FAMILY_HISTORY_COL1: FamilyHistoryCatalogItem[] = [
  { id: "Ninguno", label: "Ninguno", isAlert: false, hint: "Sin antecedentes familiares patológicos" },
  { id: "Alergias", label: "Alergias", isAlert: true, hint: "Alergias severas o anafilaxia familiar" },
  { id: "Enf. Hipertens. Emb.", label: "Enf. Hipertens. Emb.", isAlert: true, hint: "Preeclampsia / Eclampsia en madre o hermanas" },
  { id: "Epilepsia", label: "Epilepsia", isAlert: true, hint: "Trastornos convulsivos heredofamiliares" },
  { id: "Diabetes", label: "Diabetes", isAlert: true, hint: "Diabetes Mellitus Tipo 1, 2 o Gestacional" },
  { id: "Enferm. Congénitas", label: "Enferm. Congénitas", isAlert: true, hint: "Malformaciones o cromosomopatías" },
  { id: "Emb. Múltiple", label: "Emb. Múltiple", isAlert: true, hint: "Embarazos gemelares o múltiples en familiares" },
];

export const MINSA_FAMILY_HISTORY_COL2: FamilyHistoryCatalogItem[] = [
  { id: "Malaria", label: "Malaria", isAlert: false, hint: "Antecedente en zona endémica" },
  { id: "Hipertensión Arterial", label: "Hipertensión Arterial", isAlert: true, hint: "HTA crónica en padres o abuelos" },
  { id: "Hipotiroidismo", label: "Hipotiroidismo", isAlert: true, hint: "Patología tiroidea familiar" },
  { id: "Neoplasia", label: "Neoplasia", isAlert: true, note: "cáncer", hint: "Cáncer de mama, cérvix, ovario, colon u otros" },
  { id: "TBC Pulmonar", label: "TBC Pulmonar", isAlert: true, hint: "Tuberculosis pulmonar o contacto intradomiciliario" },
  { id: "Otros", label: "Otros", isAlert: true, hint: "Otras patologías familiares directas" },
];

export const ALL_MINSA_FAMILY_HISTORY = [
  ...MINSA_FAMILY_HISTORY_COL1,
  ...MINSA_FAMILY_HISTORY_COL2,
];

export const DIRECT_RELATIVES_OPTIONS = [
  "Madre",
  "Padre",
  "Hermana(o)",
  "Abuela(o)",
  "Tía(o)",
  "Padres",
] as const;

export interface PersonalHistoryCatalogItem {
  id: string;
  label: string;
  severity: "none" | "alert" | "continuous"; // none = blanco, alert = amarillo, continuous = rojo
  note?: string;
  eyeWarning?: boolean;
}

export const MINSA_PERSONAL_HISTORY_COL1: PersonalHistoryCatalogItem[] = [
  { id: "Ninguno", label: "Ninguno", severity: "none" },
  { id: "Aborto habitual/recurrente", label: "Aborto habitual/recurrente", severity: "continuous" },
  { id: "Alcoholismo", label: "Alcoholismo", severity: "alert" },
  { id: "Alergia a medicamentos", label: "Alergia a medicamentos", severity: "alert" },
  { id: "Violencia", label: "Violencia", severity: "alert" },
  { id: "Asma Bronquial", label: "Asma Bronquial", severity: "alert" },
  { id: "Cardiopatía", label: "Cardiopatía", severity: "continuous" },
  { id: "Cirugía Pélv.-uterina", label: "Cirugía Pélv.-uterina", severity: "continuous", note: "cesárea", eyeWarning: true },
  { id: "Diabetes", label: "Diabetes", severity: "alert" },
];

export const MINSA_PERSONAL_HISTORY_COL2: PersonalHistoryCatalogItem[] = [
  { id: "Eclampsia", label: "Eclampsia", severity: "continuous" },
  { id: "Enferm. Congénitas", label: "Enferm. Congénitas", severity: "alert" },
  { id: "Enferm. Infecciosas", label: "Enferm. Infecciosas", severity: "alert" },
  { id: "Epilepsia", label: "Epilepsia", severity: "alert" },
  { id: "Hemorra. Postparto", label: "Hemorra. Postparto", severity: "continuous" },
  { id: "Hipertensión Arterial", label: "Hipertensión Arterial", severity: "alert" },
  { id: "Coca", label: "Coca", severity: "alert" },
  { id: "Infertilidad", label: "Infertilidad", severity: "alert" },
  { id: "Neoplasias", label: "Neoplasias", severity: "alert" },
];

export const MINSA_PERSONAL_HISTORY_COL3: PersonalHistoryCatalogItem[] = [
  { id: "Otras Drogas", label: "Otras Drogas", severity: "alert" },
  { id: "Parto prolong.", label: "Parto prolong.", severity: "alert" },
  { id: "Preeclampsia", label: "Preeclampsia", severity: "alert" },
  { id: "Prematuridad", label: "Prematuridad", severity: "alert" },
  { id: "Reten. placenta", label: "Reten. placenta", severity: "alert" },
  { id: "Tabaco", label: "Tabaco", severity: "alert" },
  { id: "TBC Pulmonar", label: "TBC Pulmonar", severity: "continuous" },
  { id: "Transtorn. mentales", label: "Transtorn. mentales", severity: "alert" },
  { id: "VIH/SIDA", label: "VIH/SIDA", severity: "continuous" },
  { id: "Otros", label: "Otros", severity: "alert" },
];

export const ALL_MINSA_PERSONAL_HISTORY = [
  ...MINSA_PERSONAL_HISTORY_COL1,
  ...MINSA_PERSONAL_HISTORY_COL2,
  ...MINSA_PERSONAL_HISTORY_COL3,
];

// ============================================================================
// SCHEMAS ZOD: VISITA PRENATAL (28 FILAS REVERSO MINSA), BASELINE & PATOLOGÍAS
// ============================================================================

export const prenatalReferralEntrySchema = z.object({
  status: z.enum(["SI", "NO", "NO_APLICA"]).default("NO_APLICA"),
  date: z.string().default(""),
  targetEstablishment: z.string().default(""),
});

export type PrenatalReferralEntry = z.infer<typeof prenatalReferralEntrySchema>;

export const prenatalVisitItemSchema = z.object({
  visitNumber: z.number().int().min(1).max(9),
  visitDate: z.string().default(""),
  visitTime: z.string().default("09:00"),
  gestationalAgeWeeks: z.number().int().min(0).max(45).default(0),
  gestationalAgeDays: z.number().int().min(0).max(6).default(0),
  maternalWeightKg: z.number().min(0).max(250).default(0),
  temperature: z.number().min(34).max(42).default(36.5),
  bloodPressure: z.string().default("110/70"),
  maternalPulse: z.number().int().min(30).max(220).default(76),
  uterineHeightCm: z.number().min(0).max(60).default(0),
  fetusSituation: z.enum(["L", "T", "NA"]).default("NA"),
  fetusPresentation: z.enum(["C", "P", "NA"]).default("NA"),
  fetusPosition: z.enum(["D", "I", "NA"]).default("NA"),
  fetalHeartRate: z.number().int().min(0).max(250).default(0),
  fetalMovements: z.enum(["+", "++", "+++", "SM", "NA"]).default("NA"),
  proteinuria: z.enum(["-", "+", "++", "+++", "NSH"]).default("-"),
  edema: z.enum(["-", "+", "++", "+++", "SE"]).default("SE"),
  tendonReflex: z.enum(["0", "+", "++", "+++"]).default("++"),
  nippleExam: z.enum(["Formado", "No Formado", "Sin Examen"]).default("Formado"),
  ironFolicAcidGiven: z.boolean().default(true),
  calciumGiven: z.boolean().default(false),
  folicAcidEarlyGiven: z.boolean().default(false),
  counselingGiven: z.string().default("Integral (PF/NUT/Signos Alarma)"),
  ultrasoundGestationalAge: z.string().default("NA"),
  biophysicalProfileScore: z.string().default("NA"),
  nextAppointmentDate: z.string().default(""),
  homeVisit: z.enum(["Si", "No", "NA"]).default("NA"),
  birthPlanVisit: z.enum(["Control", "Visita", "No se Hizo", "NA"]).default("Control"),
  attentionEstablishment: z.string().default("CENDO Miraflores"),
  attendingDoctorName: z.string().default("Dr. Patrick José Jacinto Gomero"),
  sisFormatNumber: z.string().default("Particular"),
  notes: z.string().default(""),
});

export type PrenatalVisitItem = z.infer<typeof prenatalVisitItemSchema>;

export const maternalPathologyItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  cie10: z.string().default(""),
  diagnosedDate: z.string().default(""),
});

export type MaternalPathologyItem = z.infer<typeof maternalPathologyItemSchema>;

export const prenatalBaselineDataSchema = z.object({
  // 1. Filiación y Ubigeo
  hcNumber: z.string().default(""),
  establishmentOrigin: z.string().default("CENDO - Miraflores"),
  originNoApplies: z.boolean().default(true),
  originReferral: z.boolean().default(false),
  insuranceType: z.enum(["SIS", "ESSALUD", "PRIVADO", "No Aplica"]).default("PRIVADO"),
  insuranceAffiliationCode: z.string().default(""),
  educationLevel: z
    .enum(["Analfabeta", "Primaria", "Secundaria", "Superior", "Superior No Univ"])
    .default("Superior"),
  approvedEducationYears: z.number().int().min(0).max(25).default(5),
  civilStatus: z.enum(["Casada", "Conviviente", "Soltera", "Otro"]).default("Casada"),
  fatherName: z.string().default(""),
  fatherDni: z.string().default(""),
  locality: z.string().default("Miraflores"),
  healthSectorCode: z.string().default("LIMA-SUR"),
  department: z.string().default("Lima"),
  province: z.string().default("Lima"),
  district: z.string().default("Miraflores"),
  patientAddress: z.string().default(""),
  patientPhone: z.string().default(""),
  patientEmail: z.string().default(""),
  patientOccupation: z.string().default(""),

  // 2. Antecedentes Obstétricos (Árbol MINSA)
  gestas: z.number().int().min(0).max(30).default(1),
  abortos: z.number().int().min(0).max(20).default(0),
  partosVaginales: z.number().int().min(0).max(20).default(0),
  cesareas: z.number().int().min(0).max(20).default(0),
  nacidosVivos: z.number().int().min(0).max(20).default(0),
  nacidosMuertos: z.number().int().min(0).max(20).default(0),
  viven: z.number().int().min(0).max(20).default(0),
  deadFirstWeek: z.number().int().min(0).max(20).default(0),
  deadAfterFirstWeek: z.number().int().min(0).max(20).default(0),
  rnMayorPesoGramos: z.number().int().min(0).max(7000).default(0),
  lowWeightHistory: z.boolean().default(false),
  multipleHistory: z.boolean().default(false),
  pretermHistory: z.boolean().default(false),

  // 3. Gestación Anterior & Captación
  previousDeliveryDate: z.string().default(""),
  adequateIntergenesicPeriod: z.boolean().default(true),
  previousDeliveryType: z
    .enum(["Parto Vaginal", "Cesárea", "Aborto", "Ectópico", "Aborto molar", "No Aplica"])
    .default("No Aplica"),
  previousAbortionType: z
    .enum(["Incompleto", "Completo", "Frustro/Retenido", "Séptico", "No Aplica"])
    .default("No Aplica"),
  breastfeedingMonths: z
    .enum(["no hubo", "< 6 meses", "6 meses o más", "No aplica"])
    .default("No aplica"),
  deliveryPlace: z.enum(["EESS", "Domic.", "No aplica"]).default("No aplica"),
  pregnancyCaptured: z.boolean().default(true),
  communityAgentReferred: z.boolean().default(false),

  // 4 & 5. Antecedentes Familiares (13) y Personales (27)
  familyHistory: z.array(z.string()).default(["Ninguno"]),
  familyHistoryDetails: z.record(z.string(), z.string()).default({}),
  familyHistoryOther: z.string().default(""),
  personalHistory: z.array(z.string()).default(["Ninguno"]),
  personalHistoryDetails: z.record(z.string(), z.string()).default({}),
  personalHistoryOther: z.string().default(""),

  // 6. Vacunas Previas, Peso/Talla, Antitetánica, Sangre y Hábitos
  previousVaccines: z
    .object({
      rubella: z.boolean().default(true),
      hepatitisB: z.boolean().default(true),
      hpv: z.boolean().default(true),
      yellowFever: z.boolean().default(true),
    })
    .default({
      rubella: true,
      hepatitisB: true,
      hpv: true,
      yellowFever: true,
    }),
  usualWeightKg: z.number().min(25).max(220).default(58),
  heightCm: z.number().min(110).max(210).default(160),
  antitetanicaPrevDoses: z.number().int().min(0).max(10).default(2),
  antitetanica1stDoseMonth: z.string().default(""),
  antitetanica2ndDoseMonth: z.string().default(""),
  antitetanicaStatus: z.enum(["Vacunada", "Sin dosis", "No Aplica"]).default("Vacunada"),
  bloodGroup: z.enum(["A", "B", "AB", "O"]).default("O"),
  rhFactor: z
    .enum([
      "Rh (+)",
      "Rh (-) Sensibilizada",
      "Rh (-) No Sensibilizada",
      "Rh (-) Desconocida",
    ])
    .default("Rh (+)"),
  smokerCigarettesDay: z.number().int().min(0).max(60).default(0),
  drugsUse: z.boolean().default(false),

  // 7. Embarazo Actual (FUM, Eco Precoz, FPP, Hospitalización, Emergencia, Violencia)
  fum: z.string().default(""),
  fumDoubt: z.boolean().default(false),
  ultrasoundGestationalAgeWeeks: z.number().int().min(0).max(42).default(0),
  ultrasoundDate: z.string().default(""),
  ultrasoundNoApplies: z.boolean().default(false),
  fpp: z.string().default(""),
  hospitalized: z.boolean().default(false),
  hospitalizationHistory: z
    .object({
      date: z.string().default(""),
      diagnosis: z.string().default(""),
      cie10: z.string().default(""),
    })
    .default({ date: "", diagnosis: "", cie10: "" }),
  hadEmergency: z.boolean().default(false),
  emergencyHistory: z
    .object({
      date: z.string().default(""),
      diagnosis: z.string().default(""),
      cie10: z.string().default(""),
    })
    .default({ date: "", diagnosis: "", cie10: "" }),
  violenceScreening: z
    .object({
      screeningDone: z.boolean().default(true),
      violenceDetected: z.boolean().default(false),
      date: z.string().default(""),
    })
    .default({ screeningDone: true, violenceDetected: false, date: "" }),

  // 8. Examen Físico Basal (5 ítems MINSA)
  clinicalExam: z.enum(["Sin Examen", "Normal", "Patológico"]).default("Normal"),
  clinicalExamDetail: z.string().default(""),
  breastsExam: z.enum(["Sin Examen", "Normal", "Patológico"]).default("Normal"),
  breastsExamDetail: z.string().default(""),
  cervixExam: z.enum(["Sin Examen", "Normal", "Patológico"]).default("Normal"),
  cervixExamDetail: z.string().default(""),
  pelvisExam: z.enum(["Sin Examen", "Normal", "Patológico"]).default("Normal"),
  pelvisExamDetail: z.string().default(""),
  dentalExam: z.enum(["Sin Examen", "Normal", "Patológico"]).default("Normal"),
  dentalExamDetail: z.string().default(""),

  // 9. Exámenes de Laboratorio (3 Trimestres + Alta + Tamizaje Especial MINSA)
  hemoglobin1: z.number().optional(),
  hemoglobin1Date: z.string().default(""),
  hemoglobin1NotDone: z.boolean().default(false),
  hemoglobin2: z.number().optional(),
  hemoglobin2Date: z.string().default(""),
  hemoglobin2NotDone: z.boolean().default(false),
  hemoglobin3: z.number().optional(),
  hemoglobin3Date: z.string().default(""),
  hemoglobin3NotDone: z.boolean().default(false),
  hemoglobinDischarge: z.number().optional(),
  hemoglobinDischargeDate: z.string().default(""),
  hemoglobinDischargeNotDone: z.boolean().default(true),

  glucose1Result: z.enum(["Normal", "Anormal", "No se Hizo", "No Aplica"]).default("Normal"),
  glucose1Value: z.number().optional(),
  glucose1Date: z.string().default(""),
  glucose2Result: z.enum(["Normal", "Anormal", "No se Hizo", "No Aplica"]).default("No se Hizo"),
  glucose2Value: z.number().optional(),
  glucose2Date: z.string().default(""),
  glucose3Result: z.enum(["Normal", "Anormal", "No se Hizo", "No Aplica"]).default("No se Hizo"),
  glucose3Value: z.number().optional(),
  glucose3Date: z.string().default(""),
  glucoseToleranceResult: z
    .enum(["Normal", "Anormal", "No se Hizo", "No Aplica"])
    .default("No Aplica"),
  glucoseToleranceValue: z.number().optional(),
  glucoseToleranceDate: z.string().default(""),

  vdrlRpr1Result: z
    .enum(["No reactivo", "Reactivo", "No se Hizo", "No Aplica"])
    .default("No reactivo"),
  vdrlRpr1Date: z.string().default(""),
  vdrlRpr2Result: z
    .enum(["No reactivo", "Reactivo", "No se Hizo", "No Aplica"])
    .default("No se Hizo"),
  vdrlRpr2Date: z.string().default(""),
  vdrlRpr3Result: z
    .enum(["No reactivo", "Reactivo", "No se Hizo", "No Aplica"])
    .default("No se Hizo"),
  vdrlRpr3Date: z.string().default(""),
  ftaAbsResult: z
    .enum(["No reactivo", "Reactivo", "No se Hizo", "No Aplica"])
    .default("No Aplica"),
  ftaAbsDate: z.string().default(""),
  tphaResult: z
    .enum(["No reactivo", "Reactivo", "No se Hizo", "No Aplica"])
    .default("No Aplica"),
  tphaDate: z.string().default(""),
  rapidSyphilisResult: z
    .enum(["No reactivo", "Reactivo", "No se Hizo", "No Aplica"])
    .default("No reactivo"),
  rapidSyphilisDate: z.string().default(""),

  hivRapid1Result: z
    .enum(["No reactivo", "Reactivo", "No se Hizo", "No Aplica"])
    .default("No reactivo"),
  hivRapid1Date: z.string().default(""),
  hivRapid2Result: z
    .enum(["No reactivo", "Reactivo", "No se Hizo", "No Aplica"])
    .default("No se Hizo"),
  hivRapid2Date: z.string().default(""),
  hivRapid3Result: z
    .enum(["No reactivo", "Reactivo", "No se Hizo", "No Aplica"])
    .default("No se Hizo"),
  hivRapid3Date: z.string().default(""),
  hivElisaResult: z
    .enum(["No reactivo", "Reactivo", "No se Hizo", "No Aplica"])
    .default("No Aplica"),
  hivElisaDate: z.string().default(""),

  // Columna derecha de laboratorio en el carnet MINSA
  westernBlotResult: z
    .enum(["Negativo", "Positivo", "No se Hizo", "No Aplica"])
    .default("No Aplica"),
  westernBlotDate: z.string().default(""),
  htlv1Result: z
    .enum(["Negativo", "Positivo", "No se Hizo", "No Aplica"])
    .default("No Aplica"),
  htlv1Date: z.string().default(""),
  torchResult: z
    .enum(["Negativo", "Positivo", "No se Hizo", "No Aplica"])
    .default("No Aplica"),
  torchDate: z.string().default(""),
  thickBloodSmearResult: z
    .enum(["Negativo", "Positivo", "No se Hizo", "No Aplica"])
    .default("No Aplica"),
  thickBloodSmearDate: z.string().default(""),
  malariaRapidResult: z
    .enum(["Negativo", "Positivo", "No se Hizo", "No Aplica"])
    .default("No Aplica"),
  malariaRapidDate: z.string().default(""),
  malariaFluorescenceResult: z
    .enum(["Negativo", "Positivo", "No se Hizo", "No Aplica"])
    .default("No Aplica"),
  malariaFluorescenceDate: z.string().default(""),

  completeUrineExamResult: z
    .enum(["Negativo", "Positivo", "No se Hizo", "No Aplica"])
    .default("Negativo"),
  completeUrineExamDate: z.string().default(""),
  completeUrineExam2Result: z
    .enum(["Negativo", "Positivo", "No se Hizo", "No Aplica"])
    .default("No se Hizo"),
  completeUrineExam2Date: z.string().default(""),
  completeUrineExam3Result: z
    .enum(["Negativo", "Positivo", "No se Hizo", "No Aplica"])
    .default("No se Hizo"),
  completeUrineExam3Date: z.string().default(""),
  leukocyturiaResult: z
    .enum(["Negativo", "Positivo", "No se Hizo", "No Aplica"])
    .default("Negativo"),
  leukocyturiaDate: z.string().default(""),
  nitritesResult: z
    .enum(["Negativo", "Positivo", "No se Hizo", "No Aplica"])
    .default("Negativo"),
  nitritesDate: z.string().default(""),
  urineCultureResult: z
    .enum(["Negativo", "Positivo", "No se Hizo", "No Aplica"])
    .default("Negativo"),
  urineCultureDate: z.string().default(""),
  urineCulture2Result: z
    .enum(["Negativo", "Positivo", "No se Hizo", "No Aplica"])
    .default("No se Hizo"),
  urineCulture2Date: z.string().default(""),
  urineCulture3Result: z
    .enum(["Negativo", "Positivo", "No se Hizo", "No Aplica"])
    .default("No se Hizo"),
  urineCulture3Date: z.string().default(""),

  bkSputumResult: z
    .enum(["Negativo", "Positivo", "No se Hizo", "No Aplica"])
    .default("No Aplica"),
  bkSputumDate: z.string().default(""),
  listeriaResult: z
    .enum(["Negativo", "Positivo", "No se Hizo", "No Aplica"])
    .default("No Aplica"),
  listeriaDate: z.string().default(""),
  hepatitisBResult: z
    .enum(["Negativo", "Positivo", "No se Hizo", "No Aplica"])
    .default("Negativo"),
  hepatitisBDate: z.string().default(""),

  papTestResult: z
    .enum(["Normal", "Anormal", "No se Hizo", "No Aplica"])
    .default("Normal"),
  papTestDate: z.string().default(""),
  ivaaResult: z
    .enum(["Normal", "Anormal", "No se Hizo", "No Aplica"])
    .default("No Aplica"),
  ivaaDate: z.string().default(""),
  colposcopyResult: z
    .enum(["Normal", "Anormal", "No se Hizo", "No Aplica"])
    .default("No Aplica"),
  colposcopyDate: z.string().default(""),

  // 10. Reverso: Referencias, Psicoprofilaxis, Estimulación, Plan de Parto y Casa de Espera
  referralExternal: prenatalReferralEntrySchema.default({
    status: "NO_APLICA",
    date: "",
    targetEstablishment: "",
  }),
  referralEmergency: prenatalReferralEntrySchema.default({
    status: "NO_APLICA",
    date: "",
    targetEstablishment: "",
  }),
  referralDiagnosticSupport: prenatalReferralEntrySchema.default({
    status: "NO_APLICA",
    date: "",
    targetEstablishment: "",
  }),
  psychoprophylaxisSessions: z.number().int().min(0).max(20).default(0),
  prenatalStimulationSessions: z.number().int().min(0).max(20).default(0),
  birthPlanDone: z.enum(["SI", "NO", "NO_APLICA"]).default("SI"),
  maternalWaitingHome: z.enum(["SI", "NO", "NO_APLICA"]).default("NO_APLICA"),
  plannedBirthPlace: z.string().default("Clínica / Centro Quirúrgico CENDO"),
  companionName: z.string().default("Pareja / Familiar directo"),
});

export type PrenatalBaselineData = z.infer<typeof prenatalBaselineDataSchema>;

export const upsertPrenatalCardInputSchema = z
  .object({
    id: pgUuidSchema.optional(),
    patientId: pgUuidSchema,
    clinicEstablishment: z
      .string()
      .trim()
      .min(2)
      .max(200)
      .default("CENDO - Centro de Endometriosis & Ginecología Especializada"),
    attendingDoctorName: z
      .string()
      .trim()
      .min(2)
      .max(160)
      .default("Dr. Patrick José Jacinto Gomero"),
    baseline: prenatalBaselineDataSchema,
    visits: z.array(prenatalVisitItemSchema).max(9).default([]),
    maternalPathologies: z.array(maternalPathologyItemSchema).max(20).default([]),
    syncBackgroundFur: z.boolean().optional(),
  })
  .strict();

export type UpsertPrenatalCardInput = z.infer<typeof upsertPrenatalCardInputSchema>;

export const deletePrenatalCardSchema = z
  .object({
    id: pgUuidSchema,
  })
  .strict();

export interface PrenatalCardItem {
  id: string;
  patientId: string;
  clinicEstablishment: string;
  attendingDoctorId: string | null;
  attendingDoctorName: string;
  doctorCmp: string;
  doctorRne: string;
  baseline: PrenatalBaselineData;
  visits: PrenatalVisitItem[];
  maternalPathologies: MaternalPathologyItem[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CALCULADORAS OBSTÉTRICAS (REGLA DE NAEGELE, EDAD GESTACIONAL & RIESGO ARO)
// ============================================================================

export function calculateNaegeleFPP(fumStr: string): string {
  if (!fumStr || !/^\d{4}-\d{2}-\d{2}$/.test(fumStr)) return "";
  const [y, m, d] = fumStr.split("-").map((v) => parseInt(v, 10));
  const fumDate = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(fumDate.getTime())) return "";

  const fppDate = new Date(fumDate.getTime() + 280 * 24 * 60 * 60 * 1000);
  const fYear = fppDate.getUTCFullYear();
  const fMonth = String(fppDate.getUTCMonth() + 1).padStart(2, "0");
  const fDay = String(fppDate.getUTCDate()).padStart(2, "0");
  return `${fYear}-${fMonth}-${fDay}`;
}

export function calculateGestationalAge(
  fumStr: string,
  targetDateStr?: string
): {
  weeks: number;
  days: number;
  totalDays: number;
  formatted: string;
  trimester: 1 | 2 | 3;
} {
  if (!fumStr || !/^\d{4}-\d{2}-\d{2}$/.test(fumStr)) {
    return { weeks: 0, days: 0, totalDays: 0, formatted: "0 sem 0 d", trimester: 1 };
  }
  const [fy, fm, fd] = fumStr.split("-").map((v) => parseInt(v, 10));
  const fumUtc = Date.UTC(fy, fm - 1, fd);

  const refStr =
    targetDateStr && /^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)
      ? targetDateStr
      : getPeruDateString();
  const [ty, tm, td] = refStr.split("-").map((v) => parseInt(v, 10));
  const targetUtc = Date.UTC(ty, tm - 1, td);

  const diffMs = targetUtc - fumUtc;
  if (diffMs < 0) {
    return { weeks: 0, days: 0, totalDays: 0, formatted: "0 sem 0 d", trimester: 1 };
  }

  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  const trimester: 1 | 2 | 3 = weeks < 14 ? 1 : weeks < 28 ? 2 : 3;

  return {
    weeks,
    days,
    totalDays,
    formatted: `${weeks} sem ${days} d`,
    trimester,
  };
}

export interface PrenatalWarningFlag {
  label: string;
  severity: "alert" | "continuous"; // alert = amarillo MINSA, continuous = rojo MINSA
}

export interface PrenatalRiskReport {
  isHighRisk: boolean;
  hasContinuousFollowUp: boolean;
  riskCategory:
    | "Bajo Riesgo Obstétrico"
    | "Alto Riesgo Obstétrico (ARO)"
    | "ARO • Seguimiento Continuo Prioritario";
  alertCount: number;
  continuousCount: number;
  warningFlags: PrenatalWarningFlag[];
}

export function evaluatePrenatalRisks(
  baseline: PrenatalBaselineData,
  maternalAge: number,
  visits: PrenatalVisitItem[] = [],
  maternalPathologies: MaternalPathologyItem[] = []
): PrenatalRiskReport {
  const flags: PrenatalWarningFlag[] = [];

  if (maternalAge < 15) {
    flags.push({
      label: `Edad materna adolescente (< 15 años: ${maternalAge}a)`,
      severity: "continuous",
    });
  } else if (maternalAge > 35) {
    flags.push({
      label: `Edad materna avanzada (> 35 años: ${maternalAge}a)`,
      severity: "continuous",
    });
  }

  if (baseline.educationLevel === "Analfabeta") {
    flags.push({ label: "Grado de instrucción: Analfabeta", severity: "alert" });
  }

  const totalPartos = (baseline.partosVaginales || 0) + (baseline.cesareas || 0);
  if (totalPartos === 0) {
    flags.push({ label: "Nulípara (0 partos previos)", severity: "alert" });
  } else if (totalPartos >= 4) {
    flags.push({ label: `Multípara (${totalPartos} partos previos)`, severity: "alert" });
  }

  if (baseline.cesareas >= 2) {
    flags.push({
      label: `Cesárea iterativa (${baseline.cesareas} cesáreas previas)`,
      severity: "continuous",
    });
  } else if (baseline.cesareas === 1) {
    flags.push({
      label: "Cesárea previa única (Cicatriz uterina)",
      severity: "continuous",
    });
  }

  if (baseline.abortos >= 2) {
    flags.push({
      label: `Antecedente de abortos recurrentes (${baseline.abortos})`,
      severity: "continuous",
    });
  } else if (baseline.abortos === 1) {
    flags.push({ label: "Antecedente de 1 aborto previo", severity: "alert" });
  }

  if (baseline.lowWeightHistory || (baseline.rnMayorPesoGramos > 0 && baseline.rnMayorPesoGramos < 2500)) {
    flags.push({ label: "Antecedente de RN con bajo peso (< 2500 g)", severity: "alert" });
  }
  if (baseline.rnMayorPesoGramos >= 4000) {
    flags.push({
      label: `Antecedente de macrosomía fetal (${baseline.rnMayorPesoGramos} g)`,
      severity: "alert",
    });
  }
  if (baseline.multipleHistory) {
    flags.push({ label: "Antecedente de embarazo múltiple", severity: "alert" });
  }
  if (baseline.pretermHistory) {
    flags.push({ label: "Antecedente de parto pretérmino (< 37 sem.)", severity: "alert" });
  }
  if (baseline.nacidosMuertos > 0) {
    flags.push({ label: `Antecedente de óbito fetal (${baseline.nacidosMuertos})`, severity: "alert" });
  }
  if (baseline.deadFirstWeek > 0 || baseline.deadAfterFirstWeek > 0) {
    flags.push({ label: "Antecedente de mortalidad neonatal previa", severity: "alert" });
  }

  // Antecedentes Familiares
  for (const fam of baseline.familyHistory || []) {
    if (fam !== "Ninguno" && fam !== "Malaria") {
      const rel = baseline.familyHistoryDetails?.[fam];
      flags.push({
        label: `Ant. Familiar: ${fam}${rel ? ` (${rel})` : ""}`,
        severity: "alert",
      });
    }
  }

  // Antecedentes Personales
  for (const per of baseline.personalHistory || []) {
    if (per !== "Ninguno") {
      const cat = ALL_MINSA_PERSONAL_HISTORY.find((i) => i.id === per);
      const detail = baseline.personalHistoryDetails?.[per];
      flags.push({
        label: `Ant. Personal: ${per}${detail ? ` (${detail})` : ""}`,
        severity: cat?.severity === "continuous" ? "continuous" : "alert",
      });
    }
  }

  // Grupo Rh y Hábitos
  if (baseline.rhFactor === "Rh (-) Sensibilizada") {
    flags.push({
      label: "Incompatibilidad Rh (-) Sensibilizada",
      severity: "continuous",
    });
  } else if (baseline.rhFactor.startsWith("Rh (-)")) {
    flags.push({ label: `Factor ${baseline.rhFactor}`, severity: "alert" });
  }
  if (baseline.smokerCigarettesDay > 0) {
    flags.push({
      label: `Tabaquismo en gestación (${baseline.smokerCigarettesDay} cig/día)`,
      severity: "alert",
    });
  }
  if (baseline.drugsUse) {
    flags.push({ label: "Consumo de drogas reportado", severity: "alert" });
  }
  if (baseline.antitetanicaStatus === "Sin dosis") {
    flags.push({ label: "Antitetánica: Sin dosis", severity: "alert" });
  }
  if (baseline.fumDoubt) {
    flags.push({ label: "FUM dudosa (Requiere confirmación ecográfica)", severity: "alert" });
  }
  if (baseline.hospitalized) {
    flags.push({
      label: `Hospitalización en embarazo actual${baseline.hospitalizationHistory?.diagnosis ? `: ${baseline.hospitalizationHistory.diagnosis}` : ""}`,
      severity: "alert",
    });
  }
  if (baseline.hadEmergency) {
    flags.push({
      label: `Ingreso por Emergencia en embarazo actual${baseline.emergencyHistory?.diagnosis ? `: ${baseline.emergencyHistory.diagnosis}` : ""}`,
      severity: "alert",
    });
  }
  if (baseline.violenceScreening?.violenceDetected) {
    flags.push({ label: "Tamizaje de Violencia: Positivo", severity: "alert" });
  }

  // Examen físico patológico
  const examChecks: Array<[string, string]> = [
    ["Clínico", baseline.clinicalExam],
    ["Mamas", baseline.breastsExam],
    ["Cuello Uterino", baseline.cervixExam],
    ["Pelvis", baseline.pelvisExam],
    ["Odontológico", baseline.dentalExam],
  ];
  for (const [name, status] of examChecks) {
    if (status === "Patológico") {
      flags.push({ label: `Examen Físico ${name}: Patológico`, severity: "alert" });
    }
  }

  // Laboratorios patológicos
  if (typeof baseline.hemoglobin1 === "number" && baseline.hemoglobin1 < 11) {
    flags.push({
      label: `Anemia en 1° Trimestre (Hb ${baseline.hemoglobin1} g/dL)`,
      severity: "alert",
    });
  }
  if (typeof baseline.hemoglobin2 === "number" && baseline.hemoglobin2 < 11) {
    flags.push({
      label: `Anemia en 2° Trimestre (Hb ${baseline.hemoglobin2} g/dL)`,
      severity: "alert",
    });
  }
  if (typeof baseline.hemoglobin3 === "number" && baseline.hemoglobin3 < 11) {
    flags.push({
      label: `Anemia en 3° Trimestre (Hb ${baseline.hemoglobin3} g/dL)`,
      severity: "alert",
    });
  }
  if (
    baseline.glucose1Result === "Anormal" ||
    baseline.glucose2Result === "Anormal" ||
    baseline.glucose3Result === "Anormal" ||
    baseline.glucoseToleranceResult === "Anormal"
  ) {
    flags.push({ label: "Glicemia / Tolerancia a la glucosa anormal", severity: "alert" });
  }
  if (
    baseline.vdrlRpr1Result === "Reactivo" ||
    baseline.vdrlRpr2Result === "Reactivo" ||
    baseline.vdrlRpr3Result === "Reactivo" ||
    baseline.rapidSyphilisResult === "Reactivo"
  ) {
    flags.push({ label: "Serología para Sífilis (VDRL/RPR/P.Rápida) Reactiva", severity: "continuous" });
  }
  if (
    baseline.hivRapid1Result === "Reactivo" ||
    baseline.hivRapid2Result === "Reactivo" ||
    baseline.hivRapid3Result === "Reactivo" ||
    baseline.hivElisaResult === "Reactivo"
  ) {
    flags.push({ label: "Tamizaje VIH Reactivo", severity: "continuous" });
  }
  if (
    baseline.urineCultureResult === "Positivo" ||
    baseline.urineCulture2Result === "Positivo" ||
    baseline.urineCulture3Result === "Positivo"
  ) {
    flags.push({ label: "Urocultivo positivo (ITU / Bacteriuria en gestante)", severity: "alert" });
  }

  // Evaluar controles prenatales (1 a 9)
  for (const v of visits) {
    if (v.bloodPressure && v.bloodPressure.includes("/")) {
      const [sysStr, diaStr] = v.bloodPressure.split("/");
      const sys = parseInt(sysStr || "0", 10);
      const dia = parseInt(diaStr || "0", 10);
      if (sys >= 140 || dia >= 90) {
        flags.push({
          label: `PA elevada en Atención ${v.visitNumber} (${v.bloodPressure} mmHg)`,
          severity: "continuous",
        });
      }
    }
    if (v.proteinuria && v.proteinuria !== "-" && v.proteinuria !== "NSH") {
      flags.push({
        label: `Proteinuria cualitativa (${v.proteinuria}) en Atención ${v.visitNumber}`,
        severity: "continuous",
      });
    }
    if (v.fetalHeartRate > 0 && (v.fetalHeartRate < 120 || v.fetalHeartRate > 160)) {
      flags.push({
        label: `FCF fuera de rango (${v.fetalHeartRate} lpm) en Atención ${v.visitNumber}`,
        severity: "continuous",
      });
    }
    if (v.fetalMovements === "SM") {
      flags.push({
        label: `Sin movimientos fetales (SM) reportado en Atención ${v.visitNumber}`,
        severity: "continuous",
      });
    }
  }

  for (const mp of maternalPathologies) {
    flags.push({
      label: `Patología diagnosticada: ${mp.name}${mp.cie10 ? ` (${mp.cie10})` : ""}`,
      severity: "alert",
    });
  }

  const continuousCount = flags.filter((f) => f.severity === "continuous").length;
  const alertCount = flags.filter((f) => f.severity === "alert").length;
  const isHighRisk = flags.length > 0;
  const hasContinuousFollowUp = continuousCount > 0;

  return {
    isHighRisk,
    hasContinuousFollowUp,
    riskCategory: hasContinuousFollowUp
      ? "ARO • Seguimiento Continuo Prioritario"
      : isHighRisk
        ? "Alto Riesgo Obstétrico (ARO)"
        : "Bajo Riesgo Obstétrico",
    alertCount,
    continuousCount,
    warningFlags: flags,
  };
}

// ============================================================================
// AUTOLLENADO INTELIGENTE DESDE HISTORIA CLÍNICA & ECOGRAFÍA OBSTÉTRICA
// ============================================================================

export function parseObstetricFormulaToMinsa(formulaStr?: string | null): {
  gestas: number;
  partosVaginales: number;
  cesareas: number;
  abortos: number;
  nacidosVivos: number;
  viven: number;
} {
  const raw = (formulaStr || "G1 P0000").trim().toUpperCase();
  const match = raw.match(/G(\d+)\s*P(\d)(\d)(\d)(\d)/);
  if (!match) {
    return {
      gestas: 1,
      partosVaginales: 0,
      cesareas: 0,
      abortos: 0,
      nacidosVivos: 0,
      viven: 0,
    };
  }
  const gestas = Math.max(1, parseInt(match[1], 10) || 1);
  const term = parseInt(match[2], 10) || 0;
  const preterm = parseInt(match[3], 10) || 0;
  const abortos = parseInt(match[4], 10) || 0;
  const viven = parseInt(match[5], 10) || 0;
  const totalBirths = term + preterm;

  return {
    gestas,
    partosVaginales: totalBirths,
    cesareas: 0,
    abortos,
    nacidosVivos: viven,
    viven,
  };
}

export function buildDefaultPrenatalBaseline(params: {
  patient: PatientDirectoryItem;
  background?: PatientBackgroundItem | null;
  firstObstetricEcho?: UltrasoundReportItem | null;
}): PrenatalBaselineData {
  const { patient, background, firstObstetricEcho } = params;
  const todayStr = getPeruDateString();

  const parsedFormula = parseObstetricFormulaToMinsa(
    background?.obstetricFormula || patient.obstetricFormula
  );

  // Detectar si en cirugías previas menciona cesárea
  const surgeriesLower = (background?.surgeriesHistory || "").toLowerCase();
  const hasPreviousCesarean =
    surgeriesLower.includes("cesarea") || surgeriesLower.includes("cesárea");

  const cesareasCount = hasPreviousCesarean
    ? Math.max(1, parsedFormula.cesareas)
    : parsedFormula.cesareas;
  const vaginalesCount = hasPreviousCesarean
    ? Math.max(0, parsedFormula.partosVaginales - cesareasCount)
    : parsedFormula.partosVaginales;

  const personalHistory: string[] = [];
  const personalHistoryDetails: Record<string, string> = {};

  if (cesareasCount > 0 || hasPreviousCesarean) {
    personalHistory.push("Cirugía Pélv.-uterina");
    personalHistoryDetails["Cirugía Pélv.-uterina"] = "Cesárea previa";
  }
  if (
    background?.hasDiabetes &&
    !background.hasDiabetes.toLowerCase().startsWith("niega")
  ) {
    personalHistory.push("Diabetes");
    personalHistoryDetails["Diabetes"] = background.hasDiabetes;
  }
  if (
    background?.hasHypertension &&
    !background.hasHypertension.toLowerCase().startsWith("niega")
  ) {
    personalHistory.push("Hipertensión Arterial");
    personalHistoryDetails["Hipertensión Arterial"] = background.hasHypertension;
  }
  if (
    background?.hasAsthma &&
    !background.hasAsthma.toLowerCase().startsWith("niega")
  ) {
    personalHistory.push("Asma Bronquial");
    personalHistoryDetails["Asma Bronquial"] = background.hasAsthma;
  }
  if (
    background?.medicalAllergies &&
    !background.medicalAllergies.toLowerCase().startsWith("niega") &&
    background.medicalAllergies.toLowerCase() !== "ninguna"
  ) {
    personalHistory.push("Alergia a medicamentos");
    personalHistoryDetails["Alergia a medicamentos"] = background.medicalAllergies;
  }
  if (parsedFormula.abortos >= 2) {
    personalHistory.push("Aborto habitual/recurrente");
    personalHistoryDetails["Aborto habitual/recurrente"] = `${parsedFormula.abortos} abortos`;
  }

  const familyHistory: string[] = [];
  const familyHistoryDetails: Record<string, string> = {};
  const famLower = (background?.familyHistory || "").toLowerCase();
  if (famLower.includes("diabet")) {
    familyHistory.push("Diabetes");
    familyHistoryDetails["Diabetes"] = "Madre";
  }
  if (famLower.includes("hiperten") || famLower.includes("hta")) {
    familyHistory.push("Hipertensión Arterial");
    familyHistoryDetails["Hipertensión Arterial"] = "Padre";
  }
  if (famLower.includes("cancer") || famLower.includes("cáncer") || famLower.includes("neoplas")) {
    familyHistory.push("Neoplasia");
    familyHistoryDetails["Neoplasia"] = "Madre";
  }

  const fum =
    background?.lastMenstrualPeriod && /^\d{4}-\d{2}-\d{2}$/.test(background.lastMenstrualPeriod)
      ? background.lastMenstrualPeriod
      : todayStr;
  const fpp = calculateNaegeleFPP(fum);

  let echoWeeks = 0;
  let echoDate = "";
  if (firstObstetricEcho) {
    echoDate = firstObstetricEcho.reportDate;
    const rawEchoGa = firstObstetricEcho.findings.gestationalAgeByEcho || "";
    const matchWeeks = rawEchoGa.match(/(\d+)/);
    if (matchWeeks) {
      echoWeeks = parseInt(matchWeeks[1], 10) || 0;
    }
  }

  const rawCivil = (patient.civilStatus || "Casada").toLowerCase();
  const civilStatus: PrenatalBaselineData["civilStatus"] = rawCivil.includes("solter")
    ? "Soltera"
    : rawCivil.includes("conviv")
      ? "Conviviente"
      : rawCivil.includes("casad")
        ? "Casada"
        : "Otro";

  const rawIns = (patient.insuranceInfo || "Particular").toUpperCase();
  const insuranceType: PrenatalBaselineData["insuranceType"] = rawIns.includes("SIS")
    ? "SIS"
    : rawIns.includes("ESSALUD")
      ? "ESSALUD"
      : "PRIVADO";

  return prenatalBaselineDataSchema.parse({
    hcNumber: patient.documentNumber,
    establishmentOrigin: "CENDO - Miraflores",
    originNoApplies: true,
    originReferral: false,
    insuranceType,
    insuranceAffiliationCode: `CENDO-${patient.documentNumber}`,
    educationLevel: "Superior",
    approvedEducationYears: 5,
    civilStatus,
    locality: patient.district || "Miraflores",
    department: "Lima",
    province: "Lima",
    district: patient.district || "Miraflores",
    patientAddress: patient.address || "",
    patientPhone: patient.phone || "",
    patientEmail: patient.email || "",
    patientOccupation: patient.occupation || "",
    gestas: parsedFormula.gestas,
    abortos: parsedFormula.abortos,
    partosVaginales: vaginalesCount,
    cesareas: cesareasCount,
    nacidosVivos: parsedFormula.nacidosVivos,
    nacidosMuertos: 0,
    viven: parsedFormula.viven,
    previousDeliveryType:
      cesareasCount > 0
        ? "Cesárea"
        : vaginalesCount > 0
          ? "Parto Vaginal"
          : parsedFormula.abortos > 0
            ? "Aborto"
            : "No Aplica",
    familyHistory: familyHistory.length > 0 ? familyHistory : ["Ninguno"],
    familyHistoryDetails,
    personalHistory: personalHistory.length > 0 ? personalHistory : ["Ninguno"],
    personalHistoryDetails,
    fum,
    fumDoubt: false,
    ultrasoundGestationalAgeWeeks: echoWeeks,
    ultrasoundDate: echoDate,
    ultrasoundNoApplies: echoWeeks === 0,
    fpp,
    violenceScreening: {
      screeningDone: true,
      violenceDetected: false,
      date: todayStr,
    },
    hemoglobin1: 12.4,
    hemoglobin1Date: todayStr,
    glucose1Result: "Normal",
    glucose1Value: 84,
    glucose1Date: todayStr,
    vdrlRpr1Result: "No reactivo",
    vdrlRpr1Date: todayStr,
    rapidSyphilisResult: "No reactivo",
    rapidSyphilisDate: todayStr,
    hivRapid1Result: "No reactivo",
    hivRapid1Date: todayStr,
    completeUrineExamResult: "Negativo",
    completeUrineExamDate: todayStr,
    urineCultureResult: "Negativo",
    urineCultureDate: todayStr,
    hepatitisBResult: "Negativo",
    hepatitisBDate: todayStr,
    papTestResult: "Normal",
    papTestDate: todayStr,
  });
}
