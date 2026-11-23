import { z } from "zod";
import type {
  ClinicalImageRecord,
  ColposcopyExtendedFindingsRecord,
} from "@/db/schema/specialty";
import { pgUuidSchema } from "@/features/configuracion/configuracion.schema";

export const SCJ_VISIBILITY_OPTIONS = [
  "Completamente visible",
  "Parcialmente visible",
  "No visible",
] as const;

export function normalizeScjVisibility(
  raw?: string | null
): (typeof SCJ_VISIBILITY_OPTIONS)[number] {
  if (raw === "Parcialmente visible" || raw === "No visible") return raw;
  return "Completamente visible";
}

export const TRANSFORMATION_ZONE_OPTIONS = [
  "Tipo 1",
  "Tipo 2",
  "Tipo 3",
] as const;

export const COLPOSCOPY_PAP_OPTIONS = [
  "Negativo / NILM",
  "ASC-US",
  "ASC-H",
  "LIE-BG",
  "LIE-AG",
  "CA in situ",
  "En proceso",
  "No se realizó",
  "Otros",
] as const;

export type ColposcopyPapOption = (typeof COLPOSCOPY_PAP_OPTIONS)[number];

export const COLPOSCOPY_VPH_OPTIONS = [
  "Negativo",
  "Positivo",
  "En proceso",
  "No se realizó",
] as const;

export type ColposcopyVphOption = (typeof COLPOSCOPY_VPH_OPTIONS)[number];

export const COLPOSCOPY_DIAGNOSIS_PRESETS = [
  {
    shortLabel: "Hallazgos normales (Z01.4)",
    diagnosis: "Hallazgos colposcópicos normales (Colposcopía sin alteraciones)",
    cie10Code: "Z01.4",
  },
  {
    shortLabel: "Probable VPH (B97.7)",
    diagnosis: "Probable infección por virus del papiloma humano (VPH)",
    cie10Code: "B97.7",
  },
  {
    shortLabel: "Displasia leve / NIC I (N87.0)",
    diagnosis: "Displasia cervical leve (NIC I / LIE-BG)",
    cie10Code: "N87.0",
  },
  {
    shortLabel: "Displasia moderada / NIC II (N87.1)",
    diagnosis: "Displasia cervical moderada (NIC II / LIE-AG)",
    cie10Code: "N87.1",
  },
  {
    shortLabel: "Displasia severa / NIC III (N87.2)",
    diagnosis: "Displasia cervical severa (NIC III / LIE-AG)",
    cie10Code: "N87.2",
  },
  {
    shortLabel: "Carcinoma in situ (D06.9)",
    diagnosis: "Carcinoma in situ del cuello uterino",
    cie10Code: "D06.9",
  },
] as const;

/**
 * Convierte el texto libre de Historial PAP a las opciones estructuradas del informe Excel.
 */
export function parseBackgroundPapToColposcopy(rawPap?: string | null): {
  papResult: string;
  papOther: string;
} {
  const clean = (rawPap ?? "").trim();
  if (!clean) return { papResult: "", papOther: "" };

  const lower = clean.toLowerCase();
  if (
    lower === "no refiere" ||
    lower === "sin antecedentes" ||
    lower === "na" ||
    lower === "n/a" ||
    lower === "-"
  ) {
    return { papResult: "", papOther: "" };
  }

  const upper = clean.toUpperCase();
  if (upper.startsWith("OTROS")) {
    const match = clean.match(/^otros\s*(?::|\()\s*(.+?)\)?$/i);
    return {
      papResult: "Otros",
      papOther: match?.[1]?.trim() ?? "",
    };
  }

  if (upper.includes("EN PROCESO") || upper.includes("PENDIENTE")) {
    return { papResult: "En proceso", papOther: "" };
  }
  if (
    upper.includes("NO SE REALIZ") ||
    upper.includes("NO REALIZ") ||
    upper.includes("NUNCA")
  ) {
    return { papResult: "No se realizó", papOther: "" };
  }
  if (upper.includes("ASC-US") || upper.includes("ASCUS")) {
    return { papResult: "ASC-US", papOther: "" };
  }
  if (upper.includes("ASC-H") || upper.includes("ASCH")) {
    return { papResult: "ASC-H", papOther: "" };
  }
  if (
    upper.includes("LIE-BG") ||
    upper.includes("LIEBG") ||
    upper.includes("NIC I") ||
    upper.includes("BAJO GRADO")
  ) {
    return { papResult: "LIE-BG", papOther: "" };
  }
  if (
    upper.includes("LIE-AG") ||
    upper.includes("LIEAG") ||
    upper.includes("NIC II") ||
    upper.includes("NIC III") ||
    upper.includes("ALTO GRADO")
  ) {
    return { papResult: "LIE-AG", papOther: "" };
  }
  if (upper.includes("CA IN SITU") || upper.includes("CARCINOMA")) {
    return { papResult: "CA in situ", papOther: "" };
  }
  if (
    upper.includes("NEGATIVO") ||
    upper.includes("NILM") ||
    upper.includes("NORMAL")
  ) {
    return { papResult: "Negativo / NILM", papOther: "" };
  }

  return { papResult: "Otros", papOther: clean };
}

/**
 * Convierte el texto libre de Test VPH a las opciones del Excel (incluyendo Serotipo y En proceso).
 */
export function parseBackgroundVphToColposcopy(rawVph?: string | null): {
  vphResult: string;
  vphSerotype: string;
} {
  const clean = (rawVph ?? "").trim();
  if (!clean) return { vphResult: "", vphSerotype: "" };

  const lower = clean.toLowerCase();
  if (
    lower === "no refiere" ||
    lower === "sin registro" ||
    lower === "na" ||
    lower === "n/a" ||
    lower === "-"
  ) {
    return { vphResult: "", vphSerotype: "" };
  }

  const upper = clean.toUpperCase();
  if (upper.includes("EN PROCESO") || upper.includes("PENDIENTE")) {
    return { vphResult: "En proceso", vphSerotype: "" };
  }
  if (upper.includes("NO SE REALIZ") || upper.includes("NO REALIZ")) {
    return { vphResult: "No se realizó", vphSerotype: "" };
  }
  if (upper.includes("NEGATIVO") || upper.includes("NO DETECTADO")) {
    return { vphResult: "Negativo", vphSerotype: "" };
  }
  if (
    upper.includes("POSITIVO") ||
    upper.includes("DETECTADO") ||
    upper.includes("SEROTIPO") ||
    upper.includes("GENOTIPO")
  ) {
    const match = clean.match(/(?:serotipo|genotipo)\s*[:\-]?\s*([^)]+)/i);
    return {
      vphResult: "Positivo",
      vphSerotype: match?.[1]?.trim() ?? "",
    };
  }

  return { vphResult: "", vphSerotype: "" };
}

export function formatPapForHistory(
  papResult?: string,
  papOther?: string
): string | null {
  const cleanResult = (papResult ?? "").trim();
  if (!cleanResult) return null;
  const cleanOther = (papOther ?? "").trim();
  if (cleanResult === "Otros") {
    return cleanOther ? `Otros: ${cleanOther}` : "Otros";
  }
  return cleanOther ? `${cleanResult} (${cleanOther})` : cleanResult;
}

export function formatVphForHistory(
  vphResult?: string,
  vphSerotype?: string
): string | null {
  const cleanResult = (vphResult ?? "").trim();
  if (!cleanResult) return null;
  const cleanSerotype = (vphSerotype ?? "").trim();
  if (cleanResult === "Positivo" && cleanSerotype) {
    return `Positivo (Serotipo: ${cleanSerotype})`;
  }
  return cleanResult;
}

export interface ColposcopyBackgroundSyncPatch {
  obstetricFormula?: string;
  lastMenstrualPeriod?: string;
  contraceptiveMethod?: string;
  sexualDebutAge?: number;
  sexualPartnersCount?: number;
  papHistory?: string;
  vphTestHistory?: string;
}

/**
 * Extrae el subconjunto válido de Antecedentes/PAP/VPH para sincronizar con la Historia Clínica.
 */
export function buildColposcopyBackgroundSyncPatch(
  ext?: Partial<ColposcopyExtendedFindingsRecord> | null
): ColposcopyBackgroundSyncPatch {
  if (!ext) return {};
  const patch: ColposcopyBackgroundSyncPatch = {};

  const cleanFormula = ext.obstetricFormula?.trim().toUpperCase() ?? "";
  if (cleanFormula.length >= 2 && cleanFormula.length <= 30) {
    patch.obstetricFormula = cleanFormula;
  }

  if (ext.fur !== undefined) {
    const cleanFur = ext.fur.trim();
    if (cleanFur === "" || /^\d{4}-\d{2}-\d{2}$/.test(cleanFur)) {
      patch.lastMenstrualPeriod = cleanFur;
    }
  }

  const cleanMac = ext.mac?.trim() ?? "";
  if (cleanMac) {
    patch.contraceptiveMethod = cleanMac.slice(0, 150);
  }

  const cleanIrs = ext.irs?.trim() ?? "";
  if (cleanIrs) {
    const parsedIrs = Number.parseInt(cleanIrs, 10);
    if (
      String(parsedIrs) === cleanIrs &&
      parsedIrs >= 10 &&
      parsedIrs <= 45
    ) {
      patch.sexualDebutAge = parsedIrs;
    }
  }

  const cleanNps = ext.nps?.trim() ?? "";
  if (cleanNps) {
    const parsedNps = Number.parseInt(cleanNps, 10);
    if (
      String(parsedNps) === cleanNps &&
      parsedNps >= 0 &&
      parsedNps <= 100
    ) {
      patch.sexualPartnersCount = parsedNps;
    }
  }

  const formattedPap = formatPapForHistory(ext.papResult, ext.papOther);
  if (formattedPap) {
    patch.papHistory = formattedPap.slice(0, 300);
  }

  const formattedVph = formatVphForHistory(ext.vphResult, ext.vphSerotype);
  if (formattedVph) {
    patch.vphTestHistory = formattedVph.slice(0, 300);
  }

  return patch;
}

export interface ColposcopyBackgroundFallback {
  obstetricFormula?: string | null;
  lastMenstrualPeriod?: string | null;
  contraceptiveMethod?: string | null;
  sexualDebutAge?: number | null;
  sexualPartnersCount?: number | null;
  papHistory?: string | null;
  vphTestHistory?: string | null;
}

/**
 * Resuelve los antecedentes, PAP y VPH para impresión dando prioridad al snapshot del informe.
 */
export function resolveColposcopyComplementaryData(
  ext: Partial<ColposcopyExtendedFindingsRecord> | null | undefined,
  background?: ColposcopyBackgroundFallback | null
) {
  const e = ext ?? {};
  const parsedBgPap = parseBackgroundPapToColposcopy(background?.papHistory);
  const parsedBgVph = parseBackgroundVphToColposcopy(background?.vphTestHistory);

  const hasSavedPap = Boolean(e.papResult?.trim() || e.papOther?.trim());
  const papResult = hasSavedPap ? (e.papResult?.trim() ?? "") : parsedBgPap.papResult;
  const papOther = hasSavedPap ? (e.papOther?.trim() ?? "") : parsedBgPap.papOther;

  const hasSavedVph = Boolean(e.vphResult?.trim() || e.vphSerotype?.trim());
  const vphResult = hasSavedVph ? (e.vphResult?.trim() ?? "") : parsedBgVph.vphResult;
  const vphSerotype = hasSavedVph
    ? (e.vphSerotype?.trim() ?? "")
    : parsedBgVph.vphSerotype;

  return {
    nps:
      e.nps?.trim() ||
      (background?.sexualPartnersCount != null
        ? String(background.sexualPartnersCount)
        : "NA"),
    irs:
      e.irs?.trim() ||
      (background?.sexualDebutAge != null ? `${background.sexualDebutAge} años` : "NA"),
    fur: e.fur?.trim() || background?.lastMenstrualPeriod || "",
    obstetricFormula:
      e.obstetricFormula?.trim() || background?.obstetricFormula || "G0 P0000",
    mac: e.mac?.trim() || background?.contraceptiveMethod || "Ninguno",
    papResult,
    papOther,
    vphResult,
    vphSerotype,
  };
}

export function formatColposcopyPapLabel(
  papResult: string,
  papOther: string
): string {
  return formatPapForHistory(papResult, papOther) || "No refiere";
}

export function formatColposcopyVphLabel(
  vphResult: string,
  vphSerotype: string
): string {
  return formatVphForHistory(vphResult, vphSerotype) || "No se realizó";
}

export const SCHILLER_TEST_OPTIONS = [
  "Negativo (Lugol Caoba Homogéneo)",
  "Positivo (Yodo Negativo Focal)",
  "Captación Débil / Moteada",
  "No Realizado",
] as const;

export const COLPOSCOPY_CAPTION_PRESETS = [
  "SSF (Suero Fisiológico)",
  "Ácido Acético al 5%",
  "Zona de Transformación Ampliada",
  "Test de Schiller (Lugol)",
  "Sitio de Biopsia Dirigida",
] as const;

export const VALID_CLOCK_HOURS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
] as const;

export type ClockHour = (typeof VALID_CLOCK_HOURS)[number];

export interface ColposcopyReportItem {
  id: string;
  patientId: string;
  consultationId: string | null;
  doctorId: string | null;
  doctorName: string;
  doctorCmp: string;
  doctorRne: string;
  reportDate: string;
  adequateColposcopy: boolean;
  squamocolumnarJunctionVisible: string;
  transformationZoneType: string;
  matureSquamousEpithelium: boolean;
  ectopy: boolean;
  thinAcetowhiteEpithelium: boolean;
  denseAcetowhiteEpithelium: boolean;
  irregularBorder: boolean;
  fineMosaic: boolean;
  coarseMosaic: boolean;
  finePunctation: boolean;
  coarsePunctation: boolean;
  atypicalVessels: boolean;
  extendedFindings: ColposcopyExtendedFindingsRecord;
  schillerTest: string;
  cervicalBiopsyTaken: boolean;
  biopsyClockHours: string[];
  images: ClinicalImageRecord[];
  diagnosis: string;
  planRecommendations: string;
  cie10Code: string;
  createdAt: string;
  updatedAt: string;
}

export type ColposcopySeverityGrade =
  | "NORMAL"
  | "GRADO_1"
  | "GRADO_2"
  | "SOSPECHA_INVASION";

export interface ColposcopyClassificationResult {
  grade: ColposcopySeverityGrade;
  label: string;
  tone: "normal" | "warning" | "destructive";
  suggestedDiagnosis: string;
  suggestedCie10: string;
  suggestedPlan: string;
}

export interface ColposcopyClassificationInput {
  thinAcetowhiteEpithelium?: boolean;
  irregularBorder?: boolean;
  fineMosaic?: boolean;
  finePunctation?: boolean;
  denseAcetowhiteEpithelium?: boolean;
  coarseMosaic?: boolean;
  coarsePunctation?: boolean;
  atypicalVessels?: boolean;
  extendedFindings?: Partial<
    Omit<ColposcopyExtendedFindingsRecord, "additionalDiagnoses"> & {
      additionalDiagnoses?: Array<{ diagnosis?: string; cie10Code?: string }>;
    }
  >;
}

/**
 * Clasificador clínico IFCPC 2011 automático a partir de los hallazgos marcados.
 */
export function classifyColposcopyFindings(
  input: ColposcopyClassificationInput
): ColposcopyClassificationResult {
  const ext = input.extendedFindings ?? {};

  const hasInvasionSigns = Boolean(
    input.atypicalVessels ||
      ext.fragileVessels ||
      ext.irregularSurface ||
      ext.exophyticLesion ||
      ext.necrosis ||
      ext.necroticUlceration ||
      ext.nodularTumor
  );

  if (hasInvasionSigns) {
    return {
      grade: "SOSPECHA_INVASION",
      label: "Sospecha de Invasión (Prioritario)",
      tone: "destructive",
      suggestedDiagnosis:
        "Lesión cervical sospechosa de invasión en evaluación colposcópica IFCPC",
      suggestedCie10: "D06.9",
      suggestedPlan:
        "Biopsia cervical dirigida prioritaria y estudio histopatológico completo. Referencia preferente a Ginecología Oncológica según anatomía patológica.",
    };
  }

  const hasGrade2Signs = Boolean(
    input.denseAcetowhiteEpithelium ||
      input.coarseMosaic ||
      input.coarsePunctation ||
      ext.rapidAcetowhite ||
      ext.thickenedGlands ||
      ext.sharpBorders ||
      ext.innerBorderSign ||
      ext.ridgeSign
  );

  if (hasGrade2Signs) {
    return {
      grade: "GRADO_2",
      label: "Grado 2 (Mayor — Sug. NIC II / III)",
      tone: "destructive",
      suggestedDiagnosis:
        "Lesión intraepitelial escamosa de alto grado (NIC II / NIC III) en estudio colposcópico",
      suggestedCie10: "N87.1",
      suggestedPlan:
        "Biopsia cervical dirigida en las horas anatómicas señaladas y estudio endocervical si ZT Tipo 2/3. Programar control con resultado de anatomía patológica.",
    };
  }

  const hasGrade1Signs = Boolean(
    input.thinAcetowhiteEpithelium ||
      input.irregularBorder ||
      input.fineMosaic ||
      input.finePunctation
  );

  if (hasGrade1Signs) {
    return {
      grade: "GRADO_1",
      label: "Grado 1 (Menor — Sug. NIC I / VPH)",
      tone: "warning",
      suggestedDiagnosis:
        "Displasia cervical leve / Lesión intraepitelial de bajo grado (NIC I)",
      suggestedCie10: "N87.0",
      suggestedPlan:
        "Manejo expectante según correlación citocolposcópica o biopsia dirigida en zona de mayor captación acetoblanca. Control colposcópico y tipificación VPH en 6 meses.",
    };
  }

  return {
    grade: "NORMAL",
    label: "Colposcopía Normal / Sin Atipias",
    tone: "normal",
    suggestedDiagnosis:
      "Hallazgos colposcópicos normales (Colposcopía sin alteraciones)",
    suggestedCie10: "Z01.4",
    suggestedPlan:
      "Continuar control ginecológico preventivo periódico y tamizaje citológico / VPH según norma vigente.",
  };
}

const clinicalImageSchema = z
  .object({
    storagePath: z.string().trim().min(10, "Ruta de imagen inválida.").max(300),
    caption: z.string().trim().max(180, "Epígrafe máximo de 180 caracteres."),
    timestamp: z.string().trim().max(24).optional(),
  })
  .strict();

const colposcopyAdditionalDiagnosisSchema = z
  .object({
    diagnosis: z.string().trim().max(500),
    cie10Code: z.string().trim().max(15).optional(),
  })
  .strict();

export const colposcopyExtendedFindingsSchema = z
  .object({
    inadequateReason: z.string().trim().max(300).optional(),
    nps: z.string().trim().max(40).optional(),
    irs: z.string().trim().max(40).optional(),
    fur: z.string().trim().max(20).optional(),
    obstetricFormula: z.string().trim().max(40).optional(),
    mac: z.string().trim().max(150).optional(),
    papResult: z.string().trim().max(60).optional(),
    papOther: z.string().trim().max(200).optional(),
    vphResult: z.string().trim().max(60).optional(),
    vphSerotype: z.string().trim().max(120).optional(),
    atrophicSquamousEpithelium: z.boolean().optional(),
    nabothCyst: z.boolean().optional(),
    cryptOpenings: z.boolean().optional(),
    deciduosis: z.boolean().optional(),
    rapidAcetowhite: z.boolean().optional(),
    thickenedGlands: z.boolean().optional(),
    sharpBorders: z.boolean().optional(),
    innerBorderSign: z.boolean().optional(),
    ridgeSign: z.boolean().optional(),
    leukoplakia: z.boolean().optional(),
    erosion: z.boolean().optional(),
    fragileVessels: z.boolean().optional(),
    irregularSurface: z.boolean().optional(),
    exophyticLesion: z.boolean().optional(),
    necrosis: z.boolean().optional(),
    necroticUlceration: z.boolean().optional(),
    nodularTumor: z.boolean().optional(),
    congenitalTZ: z.boolean().optional(),
    condyloma: z.boolean().optional(),
    polyp: z.boolean().optional(),
    inflammation: z.boolean().optional(),
    stenosis: z.boolean().optional(),
    congenitalAnomaly: z.boolean().optional(),
    postTreatmentAnomaly: z.boolean().optional(),
    endometriosisFoci: z.boolean().optional(),
    otherFindings: z.string().trim().max(800).optional(),
    additionalDiagnoses: z
      .array(colposcopyAdditionalDiagnosisSchema)
      .max(8, "Máximo 8 diagnósticos adicionales.")
      .optional(),
  })
  .strict();

const baseColposcopySchema = z.object({
  patientId: pgUuidSchema("ID de paciente inválido."),
  consultationId: pgUuidSchema("ID de consulta inválido.")
    .optional()
    .or(z.literal("")),
  reportDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)."),
  adequateColposcopy: z.boolean(),
  squamocolumnarJunctionVisible: z.enum(SCJ_VISIBILITY_OPTIONS),
  transformationZoneType: z.enum(TRANSFORMATION_ZONE_OPTIONS),
  matureSquamousEpithelium: z.boolean(),
  ectopy: z.boolean(),
  thinAcetowhiteEpithelium: z.boolean(),
  denseAcetowhiteEpithelium: z.boolean(),
  irregularBorder: z.boolean(),
  fineMosaic: z.boolean(),
  coarseMosaic: z.boolean(),
  finePunctation: z.boolean(),
  coarsePunctation: z.boolean(),
  atypicalVessels: z.boolean(),
  extendedFindings: colposcopyExtendedFindingsSchema,
  schillerTest: z.string().trim().min(2, "Seleccione resultado del Test de Schiller.").max(120),
  cervicalBiopsyTaken: z.boolean(),
  biopsyClockHours: z
    .array(z.enum(VALID_CLOCK_HOURS))
    .max(12, "Máximo 12 horas en reloj cervical."),
  images: z.array(clinicalImageSchema).max(16, "Máximo 16 capturas colposcópicas."),
  diagnosis: z
    .string()
    .trim()
    .min(3, "El diagnóstico colposcópico es obligatorio.")
    .max(1000),
  planRecommendations: z
    .string()
    .trim()
    .min(3, "El plan / recomendaciones son obligatorios.")
    .max(1500),
  cie10Code: z.string().trim().min(2, "Código CIE-10 requerido.").max(15),
  syncBackgroundToHistory: z.boolean().optional(),
});

export const createColposcopySchema = baseColposcopySchema.strict();

export const updateColposcopySchema = baseColposcopySchema
  .extend({
    id: pgUuidSchema("ID de colposcopía inválido."),
  })
  .strict();

export const deleteColposcopySchema = z
  .object({
    id: pgUuidSchema("ID de colposcopía inválido."),
  })
  .strict();

export const listColposcopiesSchema = z
  .object({
    patientId: pgUuidSchema("ID de paciente inválido."),
  })
  .strict();

export type CreateColposcopyInput = z.infer<typeof createColposcopySchema>;
export type UpdateColposcopyInput = z.infer<typeof updateColposcopySchema>;
