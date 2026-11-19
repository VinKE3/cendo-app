import { z } from "zod";
import type {
  ClinicalImageRecord,
  ColposcopyExtendedFindingsRecord,
} from "@/db/schema/specialty";
import { pgUuidSchema } from "@/features/configuracion/configuracion.schema";

export const SCJ_VISIBILITY_OPTIONS = [
  "Visible",
  "No visible",
  "Parcialmente visible",
] as const;

export const TRANSFORMATION_ZONE_OPTIONS = [
  "Tipo 1",
  "Tipo 2",
  "Tipo 3",
] as const;

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
  extendedFindings?: Partial<ColposcopyExtendedFindingsRecord>;
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
      "Colposcopía adecuada satisfactoria sin lesiones intraepiteliales (Cérvix sano)",
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

export const colposcopyExtendedFindingsSchema = z
  .object({
    inadequateReason: z.string().trim().max(300).optional(),
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
    nodularTumor: z.boolean().optional(),
    congenitalTZ: z.boolean().optional(),
    condyloma: z.boolean().optional(),
    polyp: z.boolean().optional(),
    inflammation: z.boolean().optional(),
    stenosis: z.boolean().optional(),
    postTreatmentAnomaly: z.boolean().optional(),
    endometriosisFoci: z.boolean().optional(),
    otherFindings: z.string().trim().max(800).optional(),
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
