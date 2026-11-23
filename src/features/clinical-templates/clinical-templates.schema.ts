import { z } from "zod";
import type {
  ColposcopyExtendedFindingsRecord,
  UltrasoundFindingsRecord,
} from "@/db/schema/specialty";
import {
  colposcopyExtendedFindingsSchema,
  SCHILLER_TEST_OPTIONS,
  SCJ_VISIBILITY_OPTIONS,
  TRANSFORMATION_ZONE_OPTIONS,
  VALID_CLOCK_HOURS,
} from "@/features/colposcopia/colposcopia.schema";
import { pgUuidSchema } from "@/features/configuracion/configuracion.schema";
import {
  ULTRASOUND_PRESETS,
  ULTRASOUND_TYPES,
  ultrasoundFindingsSchema,
  type UltrasoundType,
} from "@/features/ecografias/ecografias.schema";
import {
  PROCEDURE_PRESETS,
  PROCEDURE_TYPES,
  procedureDetailsSchema,
} from "@/features/procedimientos/procedimientos.schema";

export const CLINICAL_TEMPLATE_SCOPES = [
  "ULTRASOUND",
  "COLPOSCOPY",
  "PROCEDURE",
] as const;

export type ClinicalTemplateScope = (typeof CLINICAL_TEMPLATE_SCOPES)[number];

export const ultrasoundTemplatePayloadSchema = z
  .object({
    ultrasoundType: z.enum(ULTRASOUND_TYPES, {
      error: "Seleccione la modalidad ecográfica.",
    }),
    indication: z
      .string()
      .trim()
      .min(3, "La indicación clínica es obligatoria.")
      .max(500),
    findings: ultrasoundFindingsSchema,
    conclusion: z
      .string()
      .trim()
      .min(3, "La conclusión diagnóstica es obligatoria.")
      .max(2000),
    recommendations: z.string().trim().max(1500).optional().or(z.literal("")),
  })
  .strict();

export const colposcopyTemplatePayloadSchema = z
  .object({
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
    schillerTest: z
      .string()
      .trim()
      .min(2, "Seleccione resultado del Test de Schiller.")
      .max(120),
    cervicalBiopsyTaken: z.boolean(),
    biopsyClockHours: z
      .array(z.enum(VALID_CLOCK_HOURS))
      .max(12, "Máximo 12 horas en reloj cervical."),
    cie10Code: z.string().trim().min(2, "Código CIE-10 requerido.").max(15),
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
  })
  .strict();

export const procedureTemplatePayloadSchema = z
  .object({
    procedureType: z.enum(PROCEDURE_TYPES, {
      error: "Seleccione el tipo de procedimiento.",
    }),
    preOpDiagnosis: z
      .string()
      .trim()
      .min(3, "El diagnóstico pre-operatorio es obligatorio.")
      .max(500),
    postOpDiagnosis: z
      .string()
      .trim()
      .min(3, "El diagnóstico post-operatorio es obligatorio.")
      .max(500),
    cie10Code: z.string().trim().max(15).optional().or(z.literal("")),
    anesthesiaType: z.string().trim().min(2).max(100),
    procedureDetails: procedureDetailsSchema,
    postOpIndications: z
      .string()
      .trim()
      .min(3, "Las indicaciones post-operatorias son obligatorias.")
      .max(2500),
    medicationsPrescribed: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .or(z.literal("")),
  })
  .strict();

export type UltrasoundTemplatePayload = z.infer<
  typeof ultrasoundTemplatePayloadSchema
>;
export type ColposcopyTemplatePayload = z.infer<
  typeof colposcopyTemplatePayloadSchema
>;
export type ProcedureTemplatePayload = z.infer<
  typeof procedureTemplatePayloadSchema
>;

interface BaseClinicalTemplateItem {
  id: string;
  subType: string | null;
  code: string;
  name: string;
  description: string;
  isOfficial: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UltrasoundClinicalTemplateItem extends BaseClinicalTemplateItem {
  scope: "ULTRASOUND";
  payload: {
    ultrasoundType: UltrasoundType;
    indication: string;
    findings: UltrasoundFindingsRecord;
    conclusion: string;
    recommendations?: string;
  };
}

export interface ColposcopyClinicalTemplateItem extends BaseClinicalTemplateItem {
  scope: "COLPOSCOPY";
  payload: ColposcopyTemplatePayload;
}

export interface ProcedureClinicalTemplateItem extends BaseClinicalTemplateItem {
  scope: "PROCEDURE";
  payload: ProcedureTemplatePayload;
}

export type ClinicalTemplateItem =
  | UltrasoundClinicalTemplateItem
  | ColposcopyClinicalTemplateItem
  | ProcedureClinicalTemplateItem;

const templateMetaShape = {
  subType: z.string().trim().max(40).optional().nullable(),
  name: z
    .string()
    .trim()
    .min(2, "El nombre de la plantilla debe tener al menos 2 caracteres.")
    .max(120, "Nombre máximo de 120 caracteres."),
  description: z.string().trim().max(300).optional().nullable(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
};

export const createClinicalTemplateSchema = z.discriminatedUnion("scope", [
  z
    .object({
      scope: z.literal("ULTRASOUND"),
      ...templateMetaShape,
      payload: ultrasoundTemplatePayloadSchema,
    })
    .strict(),
  z
    .object({
      scope: z.literal("COLPOSCOPY"),
      ...templateMetaShape,
      payload: colposcopyTemplatePayloadSchema,
    })
    .strict(),
  z
    .object({
      scope: z.literal("PROCEDURE"),
      ...templateMetaShape,
      payload: procedureTemplatePayloadSchema,
    })
    .strict(),
]);

export const updateClinicalTemplateSchema = z.discriminatedUnion("scope", [
  z
    .object({
      id: pgUuidSchema("ID de plantilla inválido."),
      scope: z.literal("ULTRASOUND"),
      ...templateMetaShape,
      payload: ultrasoundTemplatePayloadSchema,
    })
    .strict(),
  z
    .object({
      id: pgUuidSchema("ID de plantilla inválido."),
      scope: z.literal("COLPOSCOPY"),
      ...templateMetaShape,
      payload: colposcopyTemplatePayloadSchema,
    })
    .strict(),
  z
    .object({
      id: pgUuidSchema("ID de plantilla inválido."),
      scope: z.literal("PROCEDURE"),
      ...templateMetaShape,
      payload: procedureTemplatePayloadSchema,
    })
    .strict(),
]);

export const deleteClinicalTemplateSchema = z
  .object({
    id: pgUuidSchema("ID de plantilla inválido."),
  })
  .strict();

export const restoreOfficialTemplatesSchema = z
  .object({
    scope: z.enum(CLINICAL_TEMPLATE_SCOPES).optional(),
  })
  .strict();

export const listClinicalTemplatesQuerySchema = z
  .object({
    scope: z.enum(CLINICAL_TEMPLATE_SCOPES).optional(),
  })
  .strict();

export type CreateClinicalTemplateInput = z.infer<
  typeof createClinicalTemplateSchema
>;
export type UpdateClinicalTemplateInput = z.infer<
  typeof updateClinicalTemplateSchema
>;
export type RestoreOfficialTemplatesInput = z.infer<
  typeof restoreOfficialTemplatesSchema
>;

export interface OfficialClinicalTemplateSeed {
  scope: ClinicalTemplateScope;
  subType: string;
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  payload:
    | UltrasoundTemplatePayload
    | ColposcopyTemplatePayload
    | ProcedureTemplatePayload;
}

const DEFAULT_EXTENDED_COLPOSCOPY: ColposcopyExtendedFindingsRecord = {
  inadequateReason: "",
  atrophicSquamousEpithelium: false,
  nabothCyst: false,
  cryptOpenings: false,
  deciduosis: false,
  rapidAcetowhite: false,
  thickenedGlands: false,
  sharpBorders: false,
  innerBorderSign: false,
  ridgeSign: false,
  leukoplakia: false,
  erosion: false,
  fragileVessels: false,
  irregularSurface: false,
  exophyticLesion: false,
  necrosis: false,
  necroticUlceration: false,
  nodularTumor: false,
  congenitalTZ: false,
  condyloma: false,
  polyp: false,
  inflammation: false,
  stenosis: false,
  congenitalAnomaly: false,
  postTreatmentAnomaly: false,
  endometriosisFoci: false,
  otherFindings: "",
  additionalDiagnoses: [],
};

const OFFICIAL_ULTRASOUND_TEMPLATES: OfficialClinicalTemplateSeed[] =
  ULTRASOUND_PRESETS.map((preset, idx) => ({
    scope: "ULTRASOUND",
    subType: preset.ultrasoundType,
    code: preset.id,
    name: preset.label,
    description: preset.indication,
    sortOrder: idx + 1,
    payload: ultrasoundTemplatePayloadSchema.parse({
      ultrasoundType: preset.ultrasoundType,
      indication: preset.indication,
      findings: preset.findings,
      conclusion: preset.conclusion,
      recommendations: preset.recommendations,
    }),
  }));

const OFFICIAL_COLPOSCOPY_TEMPLATES: OfficialClinicalTemplateSeed[] = [
  {
    scope: "COLPOSCOPY",
    subType: "NORMAL",
    code: "colpo-normal",
    name: "1. Normal (Sin LIE)",
    description: "Colposcopía adecuada satisfactoria sin lesiones intraepiteliales",
    sortOrder: 1,
    payload: {
      adequateColposcopy: true,
      squamocolumnarJunctionVisible: "Completamente visible",
      transformationZoneType: "Tipo 1",
      matureSquamousEpithelium: true,
      ectopy: false,
      thinAcetowhiteEpithelium: false,
      denseAcetowhiteEpithelium: false,
      irregularBorder: false,
      fineMosaic: false,
      coarseMosaic: false,
      finePunctation: false,
      coarsePunctation: false,
      atypicalVessels: false,
      extendedFindings: { ...DEFAULT_EXTENDED_COLPOSCOPY },
      schillerTest: SCHILLER_TEST_OPTIONS[0],
      cervicalBiopsyTaken: false,
      biopsyClockHours: [],
      cie10Code: "Z01.4",
      diagnosis:
        "Hallazgos colposcópicos normales (Colposcopía sin alteraciones).",
      planRecommendations:
        "Continuar control ginecológico preventivo periódico y tamizaje citológico / VPH según norma vigente.",
    },
  },
  {
    scope: "COLPOSCOPY",
    subType: "LIE_BG",
    code: "colpo-lie-bg",
    name: "2. LIE-BG (NIC 1)",
    description: "Hallazgos menores Grado 1: acetoblanco tenue y mosaico fino",
    sortOrder: 2,
    payload: {
      adequateColposcopy: true,
      squamocolumnarJunctionVisible: "Completamente visible",
      transformationZoneType: "Tipo 1",
      matureSquamousEpithelium: true,
      ectopy: false,
      thinAcetowhiteEpithelium: true,
      denseAcetowhiteEpithelium: false,
      irregularBorder: false,
      fineMosaic: true,
      coarseMosaic: false,
      finePunctation: false,
      coarsePunctation: false,
      atypicalVessels: false,
      extendedFindings: { ...DEFAULT_EXTENDED_COLPOSCOPY },
      schillerTest: SCHILLER_TEST_OPTIONS[1],
      cervicalBiopsyTaken: true,
      biopsyClockHours: ["12"],
      cie10Code: "N87.0",
      diagnosis:
        "Hallazgos colposcópicos anormales Grado 1 (menor): Epitelio acetoblanco tenue y mosaico fino en labio anterior. Compatible con LIE de bajo grado (L-SIL / NIC 1).",
      planRecommendations:
        "Biopsia de cérvix dirigida. Control citológico y colposcópico en 6 meses según informe anatomopatológico. Reforzar uso de preservativo.",
    },
  },
  {
    scope: "COLPOSCOPY",
    subType: "LIE_AG",
    code: "colpo-lie-ag",
    name: "3. LIE-AG (NIC 2-3)",
    description: "Hallazgos mayores Grado 2: acetoblanco denso, mosaico grueso y cresta",
    sortOrder: 3,
    payload: {
      adequateColposcopy: true,
      squamocolumnarJunctionVisible: "Completamente visible",
      transformationZoneType: "Tipo 2",
      matureSquamousEpithelium: false,
      ectopy: false,
      thinAcetowhiteEpithelium: false,
      denseAcetowhiteEpithelium: true,
      irregularBorder: false,
      fineMosaic: false,
      coarseMosaic: true,
      finePunctation: false,
      coarsePunctation: true,
      atypicalVessels: false,
      extendedFindings: {
        ...DEFAULT_EXTENDED_COLPOSCOPY,
        rapidAcetowhite: true,
        sharpBorders: true,
        ridgeSign: true,
      },
      schillerTest: SCHILLER_TEST_OPTIONS[1],
      cervicalBiopsyTaken: true,
      biopsyClockHours: ["6", "12"],
      cie10Code: "N87.2",
      diagnosis:
        "Hallazgos colposcópicos anormales Grado 2 (mayor): Epitelio acetoblanco denso de aparición rápida, mosaico y punteado grueso con signo de cresta. Sospecha de LIE de alto grado (H-SIL / NIC 2-3).",
      planRecommendations:
        "Biopsia cervical dirigida urgente (horas 6 y 12) con pinza Tischler + estudio histopatológico. Valorar conización LEEP según resultado.",
    },
  },
  {
    scope: "COLPOSCOPY",
    subType: "CERVICITIS",
    code: "colpo-cervicitis",
    name: "4. Cervicitis / Ectropion",
    description: "Ectopia cervical periorificial con inflamación sin displasia",
    sortOrder: 4,
    payload: {
      adequateColposcopy: true,
      squamocolumnarJunctionVisible: "Completamente visible",
      transformationZoneType: "Tipo 1",
      matureSquamousEpithelium: true,
      ectopy: true,
      thinAcetowhiteEpithelium: false,
      denseAcetowhiteEpithelium: false,
      irregularBorder: false,
      fineMosaic: false,
      coarseMosaic: false,
      finePunctation: false,
      coarsePunctation: false,
      atypicalVessels: false,
      extendedFindings: {
        ...DEFAULT_EXTENDED_COLPOSCOPY,
        inflammation: true,
      },
      schillerTest: SCHILLER_TEST_OPTIONS[2],
      cervicalBiopsyTaken: false,
      biopsyClockHours: [],
      cie10Code: "N72",
      diagnosis:
        "Ectopia cervical periorificial con signos de cervicitis inflamatoria moderada. Sin signos colposcópicos de displasia.",
      planRecommendations:
        "Tratamiento médico antiinflamatorio tópico / óvulos vaginales según etiología. Control ginecológico en 3 meses posterior al tratamiento.",
    },
  },
];

const OFFICIAL_PROCEDURE_TEMPLATES: OfficialClinicalTemplateSeed[] =
  PROCEDURE_PRESETS.map((preset, idx) => ({
    scope: "PROCEDURE",
    subType: preset.procedureType,
    code: preset.id,
    name: preset.label,
    description: preset.postOpDiagnosis,
    sortOrder: idx + 1,
    payload: procedureTemplatePayloadSchema.parse({
      procedureType: preset.procedureType,
      preOpDiagnosis: preset.preOpDiagnosis,
      postOpDiagnosis: preset.postOpDiagnosis,
      cie10Code: preset.cie10Code,
      anesthesiaType: preset.anesthesiaType,
      procedureDetails: preset.procedureDetails,
      postOpIndications: preset.postOpIndications,
      medicationsPrescribed: preset.medicationsPrescribed,
    }),
  }));

export const OFFICIAL_CLINICAL_TEMPLATES: OfficialClinicalTemplateSeed[] = [
  ...OFFICIAL_ULTRASOUND_TEMPLATES,
  ...OFFICIAL_COLPOSCOPY_TEMPLATES,
  ...OFFICIAL_PROCEDURE_TEMPLATES,
];
