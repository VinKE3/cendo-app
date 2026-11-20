import { z } from "zod";
import type {
  ClinicalImageRecord,
  UltrasoundBreastLesionRecord,
  UltrasoundDopplerRecord,
  UltrasoundFindingsRecord,
} from "@/db/schema/specialty";
import { pgUuidSchema } from "@/features/configuracion/configuracion.schema";

export const ULTRASOUND_TYPES = [
  "TRANSVAGINAL",
  "PELVICA",
  "MAMA_BILATERAL",
  "OBSTETRICA_1T",
  "OBSTETRICA_GENETICA",
  "OBSTETRICA_2T_3T",
  "OBSTETRICA_MORFOLOGICA",
  "DOPPLER",
] as const;

export type UltrasoundType = (typeof ULTRASOUND_TYPES)[number];

export const ULTRASOUND_TYPE_LABELS: Record<UltrasoundType, string> = {
  TRANSVAGINAL: "Ecografía Transvaginal (Pélvica / Mapeo IDEA)",
  PELVICA: "Ecografía Pélvica Suprapúbica",
  MAMA_BILATERAL: "Ecografía de Mama Bilateral (ACR BI-RADS)",
  OBSTETRICA_1T: "Ecografía Obstétrica del I Trimestre",
  OBSTETRICA_GENETICA: "Ecografía Genética (11–14 Semanas / FMF)",
  OBSTETRICA_2T_3T: "Ecografía Obstétrica del II–III Trimestre",
  OBSTETRICA_MORFOLOGICA: "Ecografía Obstétrica Morfológica + Doppler",
  DOPPLER: "Ecografía Doppler Color Ginecológico",
};

export const ULTRASOUND_TYPE_SHORT_LABELS: Record<UltrasoundType, string> = {
  TRANSVAGINAL: "Transvaginal",
  PELVICA: "Pélvica",
  MAMA_BILATERAL: "Mama BI-RADS",
  OBSTETRICA_1T: "Obstétrica I T",
  OBSTETRICA_GENETICA: "Genética 11-14s",
  OBSTETRICA_2T_3T: "Obstétrica II-III T",
  OBSTETRICA_MORFOLOGICA: "Morfológica + Doppler",
  DOPPLER: "Doppler Color",
};

export const ULTRASOUND_COVER_TITLES: Record<UltrasoundType, string> = {
  TRANSVAGINAL: "ECOGRAFÍA PÉLVICA Y TRANSVAGINAL",
  PELVICA: "ECOGRAFÍA PÉLVICA GINECOLÓGICA",
  MAMA_BILATERAL: "ECOGRAFÍA DE MAMA BILATERAL",
  OBSTETRICA_1T: "ECOGRAFÍA OBSTÉTRICA DEL I TRIMESTRE",
  OBSTETRICA_GENETICA: "ECOGRAFÍA OBSTÉTRICA GENÉTICA (11–14 SS)",
  OBSTETRICA_2T_3T: "ECOGRAFÍA OBSTÉTRICA DEL II–III TRIMESTRE",
  OBSTETRICA_MORFOLOGICA: "ECOGRAFÍA OBSTÉTRICA MORFOLÓGICA & DOPPLER",
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
  "BI-RADS 0",
  "BI-RADS 1",
  "BI-RADS 2",
  "BI-RADS 3",
  "BI-RADS 4A",
  "BI-RADS 4B",
  "BI-RADS 4C",
  "BI-RADS 5",
  "BI-RADS 6",
] as const;

export const BREAST_ACR_TYPES = ["Tipo A", "Tipo B", "Tipo C", "Tipo D"] as const;

export const BREAST_ACR_LABELS: Record<
  (typeof BREAST_ACR_TYPES)[number],
  string
> = {
  "Tipo A": "Tipo A — Ecotextura homogénea a predominio graso",
  "Tipo B": "Tipo B — Ecotextura homogénea predominantemente fibroglandular",
  "Tipo C": "Tipo C — Ecotextura heterogéneamente densa",
  "Tipo D": "Tipo D — Ecotextura extremadamente densa",
};

export const BREAST_LESION_TYPES = [
  "Quiste simple",
  "Quiste complicado",
  "Fibroadenoma",
  "Nódulo sólido",
  "Ectasia ductal",
  "Otro hallazgo",
] as const;

export const STANDARD_BREAST_COMPLEMENT =
  "No se evidencia áreas de distorsión de la arquitectura, neoformaciones ni calcificaciones asociadas. Complejo areola-pezón, región retroareolar y piel de ambas mamas sin alteraciones significativas. No se evidencia ectasia ductal. No se evidencian adenopatías en ambas axilas.";

export const NASAL_BONE_OPTIONS = [
  "Presente",
  "Ausente",
  "Hipoplásico",
  "No evaluable",
] as const;

export const DUCTUS_VENOSUS_WAVE_OPTIONS = [
  "Onda A (+)",
  "Onda A ausente",
  "Onda A reversa",
  "No evaluado",
] as const;

export const RISK_LEVEL_OPTIONS = [
  "Bajo riesgo",
  "Riesgo intermedio",
  "Alto riesgo",
] as const;

export const FETAL_SEX_OPTIONS = [
  "Masculino",
  "Femenino",
  "No determinado",
] as const;

export const PLACENTA_GRADES = [
  "Grado 0",
  "Grado I/III",
  "Grado II/III",
  "Grado III/III",
] as const;

export const DOPPLER_INTERPRETATIONS = [
  "Normal",
  "Alterado",
  "No evaluado",
] as const;

export const DOPPLER_VESSEL_META = [
  { key: "umbilicalArtery", label: "Arteria umbilical" },
  { key: "middleCerebralArtery", label: "Arteria cerebral media" },
  { key: "cerebroplacentalRatio", label: "Índice cerebro placentario (ICP)" },
  { key: "rightUterineArtery", label: "Arteria uterina derecha" },
  { key: "leftUterineArtery", label: "Arteria uterina izquierda" },
  { key: "meanUterineArteries", label: "Promedio de arterias uterinas" },
  { key: "ductusVenosus", label: "Ductus venoso" },
] as const;

export type DopplerVesselKey = (typeof DOPPLER_VESSEL_META)[number]["key"];

export function getUltrasoundModeFlags(type: UltrasoundType) {
  const isGynMode =
    type === "TRANSVAGINAL" || type === "PELVICA" || type === "DOPPLER";
  const isBreastMode = type === "MAMA_BILATERAL";
  const isGeneticMode = type === "OBSTETRICA_GENETICA";
  const isObs1TMode =
    type === "OBSTETRICA_1T" || type === "OBSTETRICA_GENETICA";
  const isMorfologicaMode = type === "OBSTETRICA_MORFOLOGICA";
  const isObs23Mode =
    type === "OBSTETRICA_2T_3T" || type === "OBSTETRICA_MORFOLOGICA";
  return {
    isGynMode,
    isBreastMode,
    isGeneticMode,
    isObs1TMode,
    isMorfologicaMode,
    isObs23Mode,
    isAnyObstetricMode: isObs1TMode || isObs23Mode,
  };
}

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

/**
 * Fórmula de Hadlock IV (DBP, CC, CA, LF en mm -> cm) para ponderado fetal (g).
 */
export function calculateHadlockEfwGr(
  bpdMm?: number,
  hcMm?: number,
  acMm?: number,
  flMm?: number
): number | null {
  if (
    typeof bpdMm !== "number" ||
    typeof hcMm !== "number" ||
    typeof acMm !== "number" ||
    typeof flMm !== "number" ||
    !Number.isFinite(bpdMm) ||
    !Number.isFinite(hcMm) ||
    !Number.isFinite(acMm) ||
    !Number.isFinite(flMm) ||
    bpdMm <= 0 ||
    hcMm <= 0 ||
    acMm <= 0 ||
    flMm <= 0
  ) {
    return null;
  }

  const bpd = bpdMm / 10;
  const hc = hcMm / 10;
  const ac = acMm / 10;
  const fl = flMm / 10;

  const log10Efw =
    1.3596 -
    0.00386 * ac * fl +
    0.0064 * hc +
    0.00061 * bpd * ac +
    0.0424 * ac +
    0.174 * fl;

  const efw = Math.round(Math.pow(10, log10Efw));
  if (!Number.isFinite(efw) || efw < 100 || efw > 6500) return null;
  return efw;
}

export function calculateDopplerDerivedIndices(
  doppler?: UltrasoundDopplerRecord
): {
  cerebroplacentalRatioPi?: number;
  meanUterinePi?: number;
} {
  if (!doppler) return {};
  const au = doppler.umbilicalArtery?.pi;
  const acm = doppler.middleCerebralArtery?.pi;
  const utR = doppler.rightUterineArtery?.pi;
  const utL = doppler.leftUterineArtery?.pi;

  const cerebroplacentalRatioPi =
    typeof au === "number" &&
    typeof acm === "number" &&
    Number.isFinite(au) &&
    Number.isFinite(acm) &&
    au > 0 &&
    acm > 0
      ? Number((acm / au).toFixed(2))
      : undefined;

  const meanUterinePi =
    typeof utR === "number" &&
    typeof utL === "number" &&
    Number.isFinite(utR) &&
    Number.isFinite(utL) &&
    utR > 0 &&
    utL > 0
      ? Number(((utR + utL) / 2).toFixed(2))
      : undefined;

  return { cerebroplacentalRatioPi, meanUterinePi };
}

export function formatBreastLesionSentence(
  lesion: UltrasoundBreastLesionRecord
): string {
  const locationParts = [
    lesion.clockHour ? `en ${lesion.clockHour}` : "",
    lesion.distanceFromNippleCm ? `a ${lesion.distanceFromNippleCm} del pezón` : "",
    lesion.depthFromSkinMm ? `a ${lesion.depthFromSkinMm} de la superficie` : "",
  ].filter(Boolean);

  const descriptorParts = [
    lesion.shape ? `imagen ${lesion.shape}` : "",
    lesion.dimensionsMm ? `de ${lesion.dimensionsMm}` : "",
    lesion.margins ? `de márgenes ${lesion.margins}` : "",
    lesion.orientation ? `de orientación ${lesion.orientation}` : "",
    lesion.echoPattern ? `con patrón ecográfico ${lesion.echoPattern}` : "",
    lesion.posteriorAcoustic || "",
  ].filter(Boolean);

  const body = [...locationParts, ...descriptorParts].join(", ");
  const prefix = `${lesion.lesionType} (${lesion.breastSide})`;
  const tail = lesion.notes?.trim() ? ` ${lesion.notes.trim()}` : "";
  if (!body) return `${prefix}.${tail}`.trim();
  const capitalizedBody = body.charAt(0).toUpperCase() + body.slice(1);
  return `${prefix}: ${capitalizedBody}.${tail}`.trim();
}

export function calculateBppTotal(
  findings: Pick<
    UltrasoundFindingsRecord,
    | "bppBodyMovements"
    | "bppBreathingMovements"
    | "bppMuscleTone"
    | "bppAmnioticFluid"
  >
): number | null {
  const vals = [
    findings.bppBodyMovements,
    findings.bppBreathingMovements,
    findings.bppMuscleTone,
    findings.bppAmnioticFluid,
  ].filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (vals.length === 0) return null;
  const total = vals.reduce((acc, val) => acc + val, 0);
  return Math.min(8, Math.max(0, total));
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
    label: "Pélvica / TV Normal",
    ultrasoundType: "TRANSVAGINAL",
    indication: "Control ginecológico preventivo",
    findings: {
      uterusPosition: "AVF",
      uterusDimensions: "70 x 40 x 46 mm",
      uterusVolumeCc: 67.4,
      myometriumStatus: "Homogéneo, sin lesiones.",
      endometriumThicknessMm: 6.5,
      endometriumPattern: "Trilaminar",
      cervixLengthMm: 33,
      cervixStatus: "Morfología conservada.",
      uterusEcopulsionPain: "No evidencia de dolor a la ecopulsión.",
      rightOvaryDimensions: "28 x 19 x 20 mm",
      rightOvaryVolumeCc: 5.6,
      leftOvaryDimensions: "27 x 18 x 19 mm",
      leftOvaryVolumeCc: 4.8,
      ovariesNotes:
        "De localización lateral al útero, contornos definidos, parénquima homogéneo con presencia de folículos en su interior.",
      periOvarianFluid: "Ausencia de líquido peri-ovárico.",
      ovaryEcopulsionPain: "No evidencia de dolor a la ecopulsión.",
      douglasPouch: "Libre de colecciones.",
    },
    conclusion: "ÚTERO Y OVARIOS DENTRO DE PARÁMETROS NORMALES.",
    recommendations: "Control ginecológico preventivo anual.",
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
      cervixLengthMm: 34,
      cervixStatus: "Morfología conservada.",
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
    label: "Mama Normal (BI-RADS 1)",
    ultrasoundType: "MAMA_BILATERAL",
    indication: "Chequeo preventivo mamario bilateral",
    findings: {
      breastAcrType: "Tipo B",
      breastPattern:
        "Ambas mamas con ecotextura homogénea predominantemente fibroglandular (Tipo B).",
      rightBreastFindings:
        "No se evidencia nódulos, quistes, áreas de distorsión de la arquitectura, neoformaciones ni calcificaciones asociadas. Complejo areola-pezón, región retroareolar y piel sin alteraciones significativas. Sin ectasia ductal ni adenopatías axilares.",
      leftBreastFindings:
        "No se evidencia nódulos, quistes, áreas de distorsión de la arquitectura, neoformaciones ni calcificaciones asociadas. Complejo areola-pezón, región retroareolar y piel sin alteraciones significativas. Sin ectasia ductal ni adenopatías axilares.",
      breastComplement: STANDARD_BREAST_COMPLEMENT,
      biradsCategory: "BI-RADS 1",
    },
    conclusion:
      "MAMAS CON ECOTEXTURA HOMOGÉNEA PREDOMINANTEMENTE FIBROGLANDULAR (TIPO B).\nNO SE EVIDENCIAN LESIONES SOSPECHOSAS DE MALIGNIDAD.\nBI-RADS: 1.",
    recommendations: "Control ecográfico preventivo anual según edad.",
  },
  {
    id: "mama-patologica",
    label: "Mama Patológica (Quistes / Fibroadenoma)",
    ultrasoundType: "MAMA_BILATERAL",
    indication: "Evaluación ecográfica de nódulo palpable / mastalgia",
    findings: {
      breastAcrType: "Tipo B",
      breastPattern:
        "Ambas mamas con ecotextura predominantemente fibroglandular (Tipo B). Presencia de imágenes quísticas / nodulares descritas:",
      rightBreastFindings:
        "Fibroadenoma en R10 a 2 cm del pezón y a 12 mm de la superficie: imagen nodular ovalada de 12 x 5 mm, márgenes circunscritos, orientación paralela, patrón isoecoico con refuerzo posterior.",
      leftBreastFindings:
        "Quiste simple en R11 (10 x 4 mm, anecoico) y quiste complicado en R10 (12 x 5 mm, microlobulado con tabiques internos).",
      breastLesions: [
        {
          id: "lesion-quiste-simple",
          breastSide: "Derecha",
          lesionType: "Quiste simple",
          clockHour: "R11",
          distanceFromNippleCm: "1 cm",
          depthFromSkinMm: "6 mm",
          dimensionsMm: "10 x 4 mm",
          shape: "ovalada",
          margins: "circunscritos",
          orientation: "paralela",
          echoPattern: "anecoico",
          posteriorAcoustic: "con refuerzo posterior",
        },
        {
          id: "lesion-quiste-complicado",
          breastSide: "Izquierda",
          lesionType: "Quiste complicado",
          clockHour: "R10",
          distanceFromNippleCm: "2 cm",
          depthFromSkinMm: "12 mm",
          dimensionsMm: "12 x 5 mm",
          shape: "ovalada",
          margins: "microlobulados con tabiques internos",
          orientation: "paralela",
          echoPattern: "anecoico",
          posteriorAcoustic: "con refuerzo posterior",
        },
        {
          id: "lesion-fibroadenoma",
          breastSide: "Derecha",
          lesionType: "Fibroadenoma",
          clockHour: "R10",
          distanceFromNippleCm: "2 cm",
          depthFromSkinMm: "12 mm",
          dimensionsMm: "12 x 5 mm",
          shape: "ovalada",
          margins: "circunscritos",
          orientation: "paralela",
          echoPattern: "isoecoico",
          posteriorAcoustic: "con refuerzo posterior",
        },
      ],
      breastComplement: STANDARD_BREAST_COMPLEMENT,
      biradsCategory: "BI-RADS 3",
    },
    conclusion:
      "1. QUISTES SIMPLES DE MAMA BILATERAL.\n2. QUISTE COMPLICADO DE MAMA IZQUIERDA.\n3. FIBROADENOMA DE MAMA DERECHA.\n4. MAMAS CON ECOTEXTURA PREDOMINANTEMENTE FIBROGLANDULAR (TIPO B) — BI-RADS 3.",
    recommendations: "Control ecográfico mamario en 6 meses (ACR BI-RADS 3).",
  },
  {
    id: "obs-1t",
    label: "Obstétrica I Trimestre",
    ultrasoundType: "OBSTETRICA_1T",
    indication: "Confirmación de gestación intrauterina y vitalidad embrionaria",
    findings: {
      uterusPosition: "AVF",
      uterusDimensions: "88 x 51 x 60 mm",
      myometriumStatus: "Parénquima homogéneo.",
      gestationalSacsCount: 1,
      gestationalSacMm: 24,
      yolkSacMm: 5,
      embryoCrownRumpLengthMm: 22,
      gestationalAgeByEcho: "9 semanas 0 días",
      fetalHeartRate: 166,
      choriodecidualReaction:
        "Reacción coriodecidual adecuada, sin evidencia de hematomas.",
      cervixLengthMm: 33,
      cervixStatus: "Morfología conservada.",
      rightOvaryDimensions: "30 x 13 x 22 mm",
      leftOvaryDimensions: "28 x 14 x 15 mm",
      ovariesNotes: "Localización lateral al útero, contornos definidos, parénquima homogéneo.",
      douglasPouch: "Libre de colecciones.",
    },
    conclusion: "GESTACIÓN ÚNICA ACTIVA DE 9 SEMANAS 0 DÍAS POR CRL.",
    recommendations:
      "Continuar suplementación con ácido fólico y programar ecografía genética entre las 11 y 13+6 semanas.",
  },
  {
    id: "obs-genetica",
    label: "Obstétrica Genética (11–14 ss)",
    ultrasoundType: "OBSTETRICA_GENETICA",
    indication: "Ecografía genética del I trimestre (tamizaje 11–14 semanas)",
    findings: {
      uterusPosition: "AVF",
      uterusDimensions: "148 x 71 x 80 mm",
      myometriumStatus: "Parénquima homogéneo.",
      gestationalSacsCount: 1,
      embryoCrownRumpLengthMm: 70,
      gestationalAgeByEcho: "13 semanas 1 día",
      fetalHeartRate: 152,
      nuchalTranslucencyMm: 1.2,
      nasalBone: "Presente",
      ductusVenosusWave: "Onda A (+)",
      ductusVenosusPi: 0.89,
      uterineArteriesMeanPi: 1.5,
      chromosomopathyRisk: "Bajo riesgo",
      preeclampsiaRisk: "Bajo riesgo",
      cervixLengthMm: 33,
      cervixStatus: "Morfología conservada.",
      rightOvaryDimensions: "30 x 13 x 22 mm",
      leftOvaryDimensions: "38 x 14 x 15 mm",
      ovariesNotes: "Contornos definidos, parénquima homogéneo.",
      douglasPouch: "Libre de colecciones.",
    },
    conclusion:
      "GESTACIÓN ÚNICA ACTIVA DE 13 SEMANAS 1 DÍA POR CRL.\nBAJO RIESGO DE CROMOSOMOPATÍAS.\nBAJO RIESGO DE PREECLAMPSIA SEVERA ANTES DE LAS 37 SEMANAS.",
    recommendations:
      "Se sugiere ecografía morfológica entre las 20 y 24 semanas.",
  },
  {
    id: "obs-2t-3t",
    label: "Obstétrica II–III Trimestre",
    ultrasoundType: "OBSTETRICA_2T_3T",
    indication: "Control de crecimiento fetal, biometría y bienestar fetal",
    findings: {
      gestationalSacsCount: 1,
      fetalStatic: "Longitudinal, cefálico a la derecha.",
      fetalSex: "Masculino",
      gestationalAgeByEcho: "32 semanas 6 días",
      fetalHeartRate: 153,
      fetalHeartFourChambers: "De cuatro cavidades, actividad cardíaca rítmica.",
      fetalAnatomySummary:
        "Feto morfológicamente normal en estructuras encefálicas, cervicales, faciales, torácicas, abdominales, pélvicas y extremidades, con movimientos activos.",
      fetalAbdominalWall:
        "Pared abdominal íntegra, presencia de líquido en cámara gástrica y vejiga.",
      fetalKidneys: "Riñones morfológicamente conservados sin dilataciones.",
      fetalSpine: "Columna vertebral sin soluciones de continuidad.",
      bpdMm: 89,
      hcMm: 302,
      acMm: 286,
      flMm: 60,
      estimatedFetalWeightGr: 1954,
      estimatedFetalWeightPercentile: "Percentil 49",
      bppBodyMovements: 2,
      bppBreathingMovements: 2,
      bppMuscleTone: 2,
      bppAmnioticFluid: 2,
      placentaLocation: "Fúndica posterior",
      placentaGrade: "Grado II/III",
      placentaHematomas: "No se visualizan hematomas ni zonas de desprendimiento.",
      umbilicalCord:
        "Con dos arterias y una vena, inserción excéntrica en placenta, sin circular de cordón.",
      amnioticFluidIlaMm: 159,
      amnioticFluidIndex: "Observado en los cuatro cuadrantes (ILA normal).",
      includeDoppler: false,
    },
    conclusion:
      "GESTACIÓN ÚNICA ACTIVA ACORDE A BIOMETRÍA FETAL.\nPONDERADO FETAL EN PERCENTIL ADECUADO.\nBIENESTAR FETAL ADECUADO (PBF 8/8).",
    recommendations: "Continuar controles prenatales según programación.",
  },
  {
    id: "obs-morfologica-doppler",
    label: "Morfológica / II–III T + Doppler",
    ultrasoundType: "OBSTETRICA_MORFOLOGICA",
    indication: "Evaluación morfológica fetal y flujometría Doppler materno-fetal",
    findings: {
      gestationalSacsCount: 1,
      fetalStatic: "Longitudinal, cefálico.",
      fetalSex: "Masculino",
      gestationalAgeByEcho: "22 semanas 4 días",
      fetalHeartRate: 148,
      fetalHeartFourChambers: "Cuatro cavidades y tractos de salida simétricos.",
      fetalAnatomySummary:
        "Estructuras encefálicas, perfil facial, tórax, abdomen, pelvis y extremidades de morfología normal.",
      fetalAbdominalWall: "Pared abdominal íntegra; cámara gástrica y vejiga visibles.",
      fetalKidneys: "Riñones bilaterales conservados sin hidronefrosis.",
      fetalSpine: "Columna vertebral íntegra en todos sus segmentos.",
      bpdMm: 54,
      hcMm: 201,
      acMm: 178,
      flMm: 39,
      estimatedFetalWeightGr: 515,
      estimatedFetalWeightPercentile: "Percentil 50",
      bppBodyMovements: 2,
      bppBreathingMovements: 2,
      bppMuscleTone: 2,
      bppAmnioticFluid: 2,
      placentaLocation: "Posterior",
      placentaGrade: "Grado I/III",
      placentaHematomas: "Sin hematomas ni zonas de desprendimiento.",
      umbilicalCord: "Tres vasos (2 arterias y 1 vena), inserción central.",
      amnioticFluidIlaMm: 138,
      amnioticFluidIndex: "Líquido amniótico en cantidad normal en los 4 cuadrantes.",
      includeDoppler: true,
      doppler: {
        umbilicalArtery: { status: "Normal" },
        middleCerebralArtery: { status: "Normal" },
        cerebroplacentalRatio: { status: "Normal" },
        rightUterineArtery: { status: "Normal" },
        leftUterineArtery: { status: "Normal" },
        meanUterineArteries: { status: "Normal" },
        ductusVenosus: { status: "Normal" },
      },
    },
    conclusion:
      "GESTACIÓN ÚNICA ACTIVA MORFOLÓGICAMENTE NORMAL.\nPONDERADO FETAL EN PERCENTIL ADECUADO.\nESTUDIO DOPPLER MATERNO-FETAL DENTRO DE PARÁMETROS NORMALES.",
    recommendations: "Control ecográfico obstétrico en III trimestre.",
  },
];

const clinicalImageSchema = z
  .object({
    storagePath: z.string().trim().min(10, "Ruta de imagen inválida.").max(300),
    caption: z.string().trim().max(180, "Epígrafe máximo de 180 caracteres."),
    timestamp: z.string().trim().max(24).optional(),
  })
  .strict();

export const ultrasoundBreastLesionSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    breastSide: z.enum(["Derecha", "Izquierda", "Bilateral"]),
    lesionType: z.string().trim().min(2).max(120),
    clockHour: z.string().trim().max(30).optional(),
    distanceFromNippleCm: z.string().trim().max(40).optional(),
    depthFromSkinMm: z.string().trim().max(40).optional(),
    dimensionsMm: z.string().trim().max(60).optional(),
    shape: z.string().trim().max(60).optional(),
    margins: z.string().trim().max(120).optional(),
    orientation: z.string().trim().max(60).optional(),
    echoPattern: z.string().trim().max(80).optional(),
    posteriorAcoustic: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(400).optional(),
  })
  .strict();

export const ultrasoundDopplerVesselSchema = z
  .object({
    pi: z.number().finite().min(0).max(20).optional(),
    percentile: z.string().trim().max(40).optional(),
    status: z.enum(DOPPLER_INTERPRETATIONS).optional(),
  })
  .strict();

export const ultrasoundDopplerSchema = z
  .object({
    umbilicalArtery: ultrasoundDopplerVesselSchema.optional(),
    middleCerebralArtery: ultrasoundDopplerVesselSchema.optional(),
    cerebroplacentalRatio: ultrasoundDopplerVesselSchema.optional(),
    rightUterineArtery: ultrasoundDopplerVesselSchema.optional(),
    leftUterineArtery: ultrasoundDopplerVesselSchema.optional(),
    meanUterineArteries: ultrasoundDopplerVesselSchema.optional(),
    ductusVenosus: ultrasoundDopplerVesselSchema.optional(),
  })
  .strict();

export const ultrasoundFindingsSchema = z
  .object({
    referringDoctor: z.string().trim().max(160).optional(),
    uterusPosition: z.enum(UTERUS_POSITIONS).optional(),
    uterusDimensions: z.string().trim().max(120).optional(),
    uterusVolumeCc: z.number().finite().min(0).max(5000).optional(),
    myometriumStatus: z.string().trim().max(600).optional(),
    endometriumThicknessMm: z.number().finite().min(0).max(80).optional(),
    endometriumPattern: z.enum(ENDOMETRIUM_PATTERNS).optional(),
    cervixLengthMm: z.number().finite().min(0).max(120).optional(),
    cervixStatus: z.string().trim().max(300).optional(),
    uterusEcopulsionPain: z.string().trim().max(240).optional(),
    rightOvaryDimensions: z.string().trim().max(240).optional(),
    rightOvaryVolumeCc: z.number().finite().min(0).max(2000).optional(),
    leftOvaryDimensions: z.string().trim().max(240).optional(),
    leftOvaryVolumeCc: z.number().finite().min(0).max(2000).optional(),
    ovaryEcopulsionPain: z.string().trim().max(240).optional(),
    periOvarianFluid: z.string().trim().max(240).optional(),
    ovariesNotes: z.string().trim().max(500).optional(),
    douglasPouch: z.string().trim().max(400).optional(),
    endometriosisFoci: z.string().trim().max(600).optional(),
    slidingSign: z.enum(SLIDING_SIGN_OPTIONS).optional(),
    uterosacralLigaments: z.string().trim().max(400).optional(),
    breastAcrType: z.enum(BREAST_ACR_TYPES).optional(),
    breastPattern: z.string().trim().max(500).optional(),
    rightBreastFindings: z.string().trim().max(800).optional(),
    leftBreastFindings: z.string().trim().max(800).optional(),
    breastLesions: z.array(ultrasoundBreastLesionSchema).max(12).optional(),
    breastComplement: z.string().trim().max(800).optional(),
    biradsCategory: z.enum(BIRADS_OPTIONS).optional(),
    gestationalSacsCount: z.number().int().min(0).max(8).optional(),
    gestationalSacMm: z.number().finite().min(0).max(200).optional(),
    yolkSacMm: z.number().finite().min(0).max(50).optional(),
    embryoCrownRumpLengthMm: z.number().finite().min(0).max(300).optional(),
    gestationalAgeByEcho: z.string().trim().max(100).optional(),
    fetalHeartRate: z.number().int().min(0).max(260).optional(),
    choriodecidualReaction: z.string().trim().max(400).optional(),
    nuchalTranslucencyMm: z.number().finite().min(0).max(30).optional(),
    nasalBone: z.enum(NASAL_BONE_OPTIONS).optional(),
    ductusVenosusWave: z.enum(DUCTUS_VENOSUS_WAVE_OPTIONS).optional(),
    ductusVenosusPi: z.number().finite().min(0).max(10).optional(),
    uterineArteriesMeanPi: z.number().finite().min(0).max(10).optional(),
    chromosomopathyRisk: z.enum(RISK_LEVEL_OPTIONS).optional(),
    preeclampsiaRisk: z.enum(RISK_LEVEL_OPTIONS).optional(),
    fetalStatic: z.string().trim().max(240).optional(),
    fetalSex: z.enum(FETAL_SEX_OPTIONS).optional(),
    fetalAnatomySummary: z.string().trim().max(1000).optional(),
    fetalHeartFourChambers: z.string().trim().max(300).optional(),
    fetalAbdominalWall: z.string().trim().max(300).optional(),
    fetalKidneys: z.string().trim().max(300).optional(),
    fetalSpine: z.string().trim().max(300).optional(),
    bpdMm: z.number().finite().min(0).max(200).optional(),
    hcMm: z.number().finite().min(0).max(500).optional(),
    acMm: z.number().finite().min(0).max(500).optional(),
    flMm: z.number().finite().min(0).max(150).optional(),
    estimatedFetalWeightGr: z.number().finite().min(0).max(8000).optional(),
    estimatedFetalWeightPercentile: z.string().trim().max(60).optional(),
    bppBodyMovements: z.number().int().min(0).max(2).optional(),
    bppBreathingMovements: z.number().int().min(0).max(2).optional(),
    bppMuscleTone: z.number().int().min(0).max(2).optional(),
    bppAmnioticFluid: z.number().int().min(0).max(2).optional(),
    placentaLocation: z.string().trim().max(400).optional(),
    placentaGrade: z.string().trim().max(60).optional(),
    placentaHematomas: z.string().trim().max(400).optional(),
    umbilicalCord: z.string().trim().max(400).optional(),
    amnioticFluidIndex: z.string().trim().max(300).optional(),
    amnioticFluidIlaMm: z.number().finite().min(0).max(600).optional(),
    includeDoppler: z.boolean().optional(),
    doppler: ultrasoundDopplerSchema.optional(),
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
