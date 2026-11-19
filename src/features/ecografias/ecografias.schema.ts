import { z } from "zod";
import type {
  ClinicalImageRecord,
  UltrasoundFindingsRecord,
} from "@/db/schema/specialty";
import { pgUuidSchema } from "@/features/configuracion/configuracion.schema";

export const ULTRASOUND_TYPES = [
  "TRANSVAGINAL",
  "PELVICA",
  "MAMA_BILATERAL",
  "OBSTETRICA_1T",
  "OBSTETRICA_2T_3T",
  "DOPPLER",
] as const;

export type UltrasoundType = (typeof ULTRASOUND_TYPES)[number];

export const ULTRASOUND_TYPE_LABELS: Record<UltrasoundType, string> = {
  TRANSVAGINAL: "Ecografía Transvaginal (Mapeo Ginecológico & Endometriosis)",
  PELVICA: "Ecografía Pélvica Suprapúbica",
  MAMA_BILATERAL: "Ecografía Mamaria Bilateral (BI-RADS)",
  OBSTETRICA_1T: "Ecografía Obstétrica del 1er Trimestre",
  OBSTETRICA_2T_3T: "Ecografía Obstétrica Morfológica (2do-3er Trimestre)",
  DOPPLER: "Ecografía Doppler Color Ginecológico",
};

export const ULTRASOUND_TYPE_SHORT_LABELS: Record<UltrasoundType, string> = {
  TRANSVAGINAL: "Transvaginal IDEA",
  PELVICA: "Pélvica",
  MAMA_BILATERAL: "Mamaria BI-RADS",
  OBSTETRICA_1T: "Obstétrica 1T",
  OBSTETRICA_2T_3T: "Obstétrica 2-3T",
  DOPPLER: "Doppler Color",
};

export const ULTRASOUND_COVER_TITLES: Record<UltrasoundType, string> = {
  TRANSVAGINAL: "ECOGRAFÍA TRANSVAGINAL DOPPLER",
  PELVICA: "ECOGRAFÍA PÉLVICA GINECOLÓGICA",
  MAMA_BILATERAL: "ECOGRAFÍA MAMARIA BILATERAL",
  OBSTETRICA_1T: "ECOGRAFÍA OBSTÉTRICA 1ER TRIMESTRE",
  OBSTETRICA_2T_3T: "ECOGRAFÍA OBSTÉTRICA MORFOLÓGICA",
  DOPPLER: "ECOGRAFÍA DOPPLER COLOR GINECOLÓGICO",
};

export const UTERUS_POSITIONS = ["AVF", "RVF", "Indiferente"] as const;

export const ENDOMETRIUM_PATTERNS = [
  "Trilaminar",
  "Secretor",
  "Atrófico",
  "Engrosado irregular",
] as const;

export const SLIDING_SIGN_OPTIONS = ["Positivo", "Negativo", "Parcial"] as const;

export const BIRADS_OPTIONS = [
  "BI-RADS 1",
  "BI-RADS 2",
  "BI-RADS 3",
  "BI-RADS 4A",
  "BI-RADS 4B",
  "BI-RADS 4C",
  "BI-RADS 5",
] as const;

export interface UltrasoundReportItem {
  id: string;
  patientId: string;
  consultationId: string | null;
  doctorId: string | null;
  doctorName: string;
  doctorCmp: string;
  doctorRne: string;
  reportDate: string;
  ultrasoundType: UltrasoundType;
  indication: string;
  findings: UltrasoundFindingsRecord;
  conclusion: string;
  recommendations: string;
  images: ClinicalImageRecord[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Calcula el volumen uterino elipsoide (L x AP x T x 0.523 / 1000) en cc
 * a partir de medidas ingresadas en milímetros (ej. "72 x 42 x 48 mm").
 */
export function calculateEllipsoidVolumeCc(dimensions: string): number | null {
  const match = dimensions.match(
    /(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/i
  );
  if (!match) return null;

  const d1 = Number(match[1].replace(",", "."));
  const d2 = Number(match[2].replace(",", "."));
  const d3 = Number(match[3].replace(",", "."));
  if (
    !Number.isFinite(d1) ||
    !Number.isFinite(d2) ||
    !Number.isFinite(d3) ||
    d1 <= 0 ||
    d2 <= 0 ||
    d3 <= 0 ||
    d1 > 500 ||
    d2 > 500 ||
    d3 > 500
  ) {
    return null;
  }

  return Number(((d1 * d2 * d3 * 0.523) / 1000).toFixed(1));
}

export interface UltrasoundPreset {
  id: string;
  label: string;
  ultrasoundType: UltrasoundType;
  indication: string;
  findings: UltrasoundFindingsRecord;
  conclusion: string;
  recommendations: string;
}

export const ULTRASOUND_PRESETS: UltrasoundPreset[] = [
  {
    id: "tv-normal",
    label: "TV Normal (Sin Endometriosis)",
    ultrasoundType: "TRANSVAGINAL",
    indication: "Control ginecológico preventivo anual",
    findings: {
      uterusPosition: "AVF",
      uterusDimensions: "70 x 40 x 46 mm",
      uterusVolumeCc: 67.4,
      myometriumStatus:
        "Ecoestructura miometrial homogénea, sin nódulos ni focos adenomióticos.",
      endometriumThicknessMm: 6.5,
      endometriumPattern: "Trilaminar",
      rightOvaryDimensions: "28 x 19 mm, folículos antrales conservados.",
      leftOvaryDimensions: "27 x 18 mm, estroma y folículos normales.",
      ovariesNotes: "Móviles al examen dinámico.",
      douglasPouch: "Libre de colecciones líquidas.",
      slidingSign: "Positivo",
      uterosacralLigaments: "Libres, sin engrosamientos nodulares ni dolor focal.",
      endometriosisFoci: "Sin evidencia ecográfica de focos profundos (protocolo IDEA negativo).",
    },
    conclusion: "1. ÚTERO Y OVARIOS DENTRO DE PARÁMETROS ECOGRÁFICOS NORMALES.",
    recommendations: "Control ginecológico preventivo en 12 meses.",
  },
  {
    id: "tv-endometrioma",
    label: "Endometrioma + IDEA",
    ultrasoundType: "TRANSVAGINAL",
    indication: "Dismenorrea severa / Sospecha de endometriosis pélvica",
    findings: {
      uterusPosition: "RVF",
      uterusDimensions: "76 x 44 x 50 mm",
      uterusVolumeCc: 87.4,
      myometriumStatus:
        "Ligera heterogeneidad difusa de la zona de unión sugestiva de adenomiosis incipiente.",
      endometriumThicknessMm: 7.4,
      endometriumPattern: "Secretor",
      rightOvaryDimensions: "30 x 21 mm, de morfología conservada.",
      leftOvaryDimensions:
        "44 x 38 mm con imagen quística unilocular de ecos internos homogéneos en vidrio esmerilado.",
      ovariesNotes: "Ovario izquierdo adherido parcialmente a cara posterior uterina.",
      douglasPouch: "Obliteración parcial de fondo de saco posterior.",
      slidingSign: "Negativo",
      uterosacralLigaments:
        "Ligamento uterosacro izquierdo engrosado e hipoecoico (~9 mm), doloroso a la sonopalpación.",
      endometriosisFoci:
        "Endometrioma ovárico izquierdo + compromiso de ligamento uterosacro izquierdo (Mapeo IDEA).",
    },
    conclusion:
      "1. ENDOMETRIOMA OVÁRICO IZQUIERDO (VIDRIO ESMERILADO).\n2. SIGNOS ECOGRÁFICOS DE ENDOMETRIOSIS PROFUNDA (SLIDING SIGN NEGATIVO).",
    recommendations:
      "Evaluación en consulta especializada CENDO para definir manejo médico hormonal o planificación laparoscópica.",
  },
  {
    id: "tv-adenomiosis",
    label: "Adenomiosis Difusa",
    ultrasoundType: "TRANSVAGINAL",
    indication: "Sangrado uterino abundante / Dismenorrea secundaria",
    findings: {
      uterusPosition: "AVF",
      uterusDimensions: "92 x 56 x 60 mm",
      uterusVolumeCc: 161.7,
      myometriumStatus:
        "Útero globuloso con miometrio asimétrico (pared posterior > anterior), estriaciones lineales ecogénicas y microquistes miometriales.",
      endometriumThicknessMm: 8.2,
      endometriumPattern: "Secretor",
      rightOvaryDimensions: "29 x 20 mm, normal.",
      leftOvaryDimensions: "28 x 19 mm, normal.",
      ovariesNotes: "Ovarios libres.",
      douglasPouch: "Libre de líquido.",
      slidingSign: "Positivo",
      uterosacralLigaments: "Sin nódulos evidentes.",
      endometriosisFoci: "Sin implantes profundos rectovaginales visibles.",
    },
    conclusion:
      "1. ÚTERO AUMENTADO DE VOLUMEN CON SIGNOS DE ADENOMIOSIS MIOMETRIAL DIFUSA (CRITERIOS MUSA).",
    recommendations: "Correlación clínica y evaluación hormonal terapéutica.",
  },
  {
    id: "tv-miomatosis",
    label: "Miomatosis Uterina",
    ultrasoundType: "TRANSVAGINAL",
    indication: "Miomatosis en seguimiento / Hipermenorrea",
    findings: {
      uterusPosition: "AVF",
      uterusDimensions: "98 x 58 x 62 mm",
      uterusVolumeCc: 184.3,
      myometriumStatus:
        "Nódulo sólido hipoecoico bien delimitado en pared corporal anterior (FIGO 4-5) de 34 x 28 mm, con vascularización periférica.",
      endometriumThicknessMm: 6.8,
      endometriumPattern: "Trilaminar",
      rightOvaryDimensions: "30 x 19 mm, normal.",
      leftOvaryDimensions: "29 x 18 mm, normal.",
      ovariesNotes: "Anexos sin masas.",
      douglasPouch: "Libre.",
      slidingSign: "Positivo",
      uterosacralLigaments: "Libres.",
      endometriosisFoci: "No evidenciados.",
    },
    conclusion: "1. MIOMATOSIS UTERINA INTRAMURAL-SUBSEROSA (FIGO 4-5) DE 34 MM.",
    recommendations:
      "Control ecográfico en 6 meses y valoración de hemograma / ferritina sérica.",
  },
  {
    id: "tv-sop",
    label: "SOP / Poliquísticos",
    ultrasoundType: "TRANSVAGINAL",
    indication: "Oligomenorrea / Evaluación folicular ovárica",
    findings: {
      uterusPosition: "AVF",
      uterusDimensions: "66 x 35 x 42 mm",
      uterusVolumeCc: 50.7,
      myometriumStatus: "Miometrio homogéneo sin lesiones focales.",
      endometriumThicknessMm: 5.2,
      endometriumPattern: "Trilaminar",
      rightOvaryDimensions: "39 x 26 mm (>10 cc), más de 20 folículos periféricos de 2-9 mm.",
      leftOvaryDimensions: "38 x 25 mm (>10 cc), estroma central hiperecogénico.",
      ovariesNotes: "Morfología ovárica multifolicular bilateral (criterios Rotterdam).",
      douglasPouch: "Libre.",
      slidingSign: "Positivo",
      uterosacralLigaments: "Libres.",
      endometriosisFoci: "Sin hallazgos sugestivos de endometriosis.",
    },
    conclusion: "1. OVARIOS DE MORFOLOGÍA POLIQUÍSTICA BILATERAL.",
    recommendations: "Correlación con perfil endocrinometabólico y criterios clínicos.",
  },
  {
    id: "mama-birads1",
    label: "Mamaria BI-RADS 1",
    ultrasoundType: "MAMA_BILATERAL",
    indication: "Chequeo preventivo mamario bilateral",
    findings: {
      breastPattern:
        "Tejido fibroglandular heterogéneo simétrico, planos cutáneos y retroareolares conservados.",
      rightBreastFindings:
        "Sin imágenes quísticas ni nódulos sólidos dominantes. Regiones axilares con ganglios de morfología conservada.",
      leftBreastFindings:
        "Sin lesiones focales sospechosas ni ectasia ductal patológica. Axila izquierda libre.",
      biradsCategory: "BI-RADS 1",
    },
    conclusion: "1. ECOGRAFÍA MAMARIA BILATERAL NORMAL (ACR BI-RADS 1).",
    recommendations: "Control ecográfico / mamográfico preventivo anual según edad.",
  },
  {
    id: "obs-1t",
    label: "Obstétrica 1T Viable",
    ultrasoundType: "OBSTETRICA_1T",
    indication: "Confirmación de gestación intrauterina y vitalidad embrionaria",
    findings: {
      gestationalSacsCount: 1,
      embryoCrownRumpLengthMm: 14.5,
      gestationalAgeByEcho: "7 semanas 5 días",
      fetalHeartRate: 156,
      placentaLocation: "Corion frondoso normoinserto, sin hematomas retrocoriales.",
      amnioticFluidIndex: "Acorde para edad gestacional",
      ovariesNotes: "Cuerpo lúteo gravídico presente sin quistes complicados.",
    },
    conclusion:
      "1. GESTACIÓN ÚNICA INTRAUTERINA ACTIVA DE 7 SEMANAS 5 DÍAS POR BIOMETRÍA (LCN).\n2. VITALIDAD EMBRIONARIA CONSERVADA (FCF 156 LPM).",
    recommendations: "Continuar suplementación con ácido fólico y control prenatal mensual.",
  },
];

const clinicalImageSchema = z
  .object({
    storagePath: z.string().trim().min(10, "Ruta de imagen inválida.").max(300),
    caption: z.string().trim().max(180, "Epígrafe máximo de 180 caracteres."),
    timestamp: z.string().trim().max(24).optional(),
  })
  .strict();

export const ultrasoundFindingsSchema = z
  .object({
    uterusPosition: z.enum(UTERUS_POSITIONS).optional(),
    uterusDimensions: z.string().trim().max(120).optional(),
    uterusVolumeCc: z.number().finite().min(0).max(5000).optional(),
    myometriumStatus: z.string().trim().max(600).optional(),
    endometriumThicknessMm: z.number().finite().min(0).max(80).optional(),
    endometriumPattern: z.enum(ENDOMETRIUM_PATTERNS).optional(),
    rightOvaryDimensions: z.string().trim().max(240).optional(),
    leftOvaryDimensions: z.string().trim().max(240).optional(),
    ovariesNotes: z.string().trim().max(500).optional(),
    douglasPouch: z.string().trim().max(400).optional(),
    endometriosisFoci: z.string().trim().max(600).optional(),
    slidingSign: z.enum(SLIDING_SIGN_OPTIONS).optional(),
    uterosacralLigaments: z.string().trim().max(400).optional(),
    breastPattern: z.string().trim().max(500).optional(),
    rightBreastFindings: z.string().trim().max(600).optional(),
    leftBreastFindings: z.string().trim().max(600).optional(),
    biradsCategory: z.enum(BIRADS_OPTIONS).optional(),
    gestationalSacsCount: z.number().int().min(0).max(8).optional(),
    embryoCrownRumpLengthMm: z.number().finite().min(0).max(300).optional(),
    gestationalAgeByEcho: z.string().trim().max(100).optional(),
    fetalHeartRate: z.number().int().min(0).max(260).optional(),
    placentaLocation: z.string().trim().max(400).optional(),
    amnioticFluidIndex: z.string().trim().max(200).optional(),
  })
  .strict();

const baseUltrasoundSchema = z.object({
  patientId: pgUuidSchema("ID de paciente inválido."),
  consultationId: pgUuidSchema("ID de consulta inválido.")
    .optional()
    .or(z.literal("")),
  reportDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)."),
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
  images: z.array(clinicalImageSchema).max(16, "Máximo 16 capturas por estudio."),
});

export const createUltrasoundSchema = baseUltrasoundSchema.strict();

export const updateUltrasoundSchema = baseUltrasoundSchema
  .extend({
    id: pgUuidSchema("ID de informe ecográfico inválido."),
  })
  .strict();

export const deleteUltrasoundSchema = z
  .object({
    id: pgUuidSchema("ID de informe ecográfico inválido."),
  })
  .strict();

export const listUltrasoundsSchema = z
  .object({
    patientId: pgUuidSchema("ID de paciente inválido."),
  })
  .strict();

export type CreateUltrasoundInput = z.infer<typeof createUltrasoundSchema>;
export type UpdateUltrasoundInput = z.infer<typeof updateUltrasoundSchema>;
