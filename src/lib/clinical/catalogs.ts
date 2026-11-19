import { getPeruDateString } from "@/lib/utils";

export interface ClinicalCatalogItem<TId extends string = string> {
  id: TId;
  label: string;
  shortLabel?: string;
  aliases: string[];
  alert?: boolean;
}

export const DOCUMENT_TYPE_OPTIONS = [
  { value: "DNI", label: "DNI (8 dígitos)" },
  { value: "CE", label: "Carné de Extranjería" },
  { value: "Pasaporte", label: "Pasaporte" },
] as const;

export type DocumentType = (typeof DOCUMENT_TYPE_OPTIONS)[number]["value"];

export const LIMA_DISTRICTS = [
  "Miraflores",
  "San Isidro",
  "Santiago de Surco",
  "San Borja",
  "Barranco",
  "Surquillo",
  "Magdalena del Mar",
  "Jesús María",
  "Lince",
  "La Molina",
  "Pueblo Libre",
  "San Miguel",
  "Chorrillos",
  "Lima Cercado",
  "Otro",
] as const;

export type EducationLevelId =
  | "POSTGRADO"
  | "SUPERIOR_UNIV_COMP"
  | "SUPERIOR_UNIV_INCOMP"
  | "SUPERIOR_TEC_COMP"
  | "SUPERIOR_TEC_INCOMP"
  | "SECUNDARIA_COMP"
  | "SECUNDARIA_INCOMP"
  | "PRIMARIA_COMP"
  | "PRIMARIA_INCOMP"
  | "SIN_INSTRUCCION";

export const EDUCATION_LEVEL_CATALOG: ClinicalCatalogItem<EducationLevelId>[] = [
  {
    id: "SUPERIOR_UNIV_COMP",
    label: "Superior Universitaria Completa",
    shortLabel: "Superior Univ.",
    aliases: [
      "superior universitaria completa",
      "superior universitaria",
      "superior univ",
      "universitaria completa",
      "universitaria",
      "universidad",
      "licenciatura",
      "superior",
    ],
  },
  {
    id: "SUPERIOR_UNIV_INCOMP",
    label: "Superior Universitaria Incompleta",
    shortLabel: "Univ. Incompleta",
    aliases: ["superior universitaria incompleta", "universitaria incompleta", "univ incompleta"],
  },
  {
    id: "SUPERIOR_TEC_COMP",
    label: "Superior Técnica Completa",
    shortLabel: "Superior Técnica",
    aliases: [
      "superior técnica completa",
      "superior tecnica completa",
      "superior técnica",
      "superior tecnica",
      "superior no univ",
      "técnica completa",
      "tecnica completa",
      "instituto",
    ],
  },
  {
    id: "SUPERIOR_TEC_INCOMP",
    label: "Superior Técnica Incompleta",
    shortLabel: "Técnica Incompleta",
    aliases: [
      "superior técnica incompleta",
      "superior tecnica incompleta",
      "técnica incompleta",
      "tecnica incompleta",
    ],
  },
  {
    id: "POSTGRADO",
    label: "Posgrado / Maestría",
    shortLabel: "Posgrado",
    aliases: ["posgrado / maestría", "posgrado", "postgrado", "maestria", "maestría", "doctorado", "phd"],
  },
  {
    id: "SECUNDARIA_COMP",
    label: "Secundaria Completa",
    shortLabel: "Secundaria Comp.",
    aliases: ["secundaria completa", "secundaria"],
  },
  {
    id: "SECUNDARIA_INCOMP",
    label: "Secundaria Incompleta",
    shortLabel: "Secundaria Incomp.",
    aliases: ["secundaria incompleta"],
  },
  {
    id: "PRIMARIA_COMP",
    label: "Primaria Completa",
    shortLabel: "Primaria Comp.",
    aliases: ["primaria completa", "primaria"],
  },
  {
    id: "PRIMARIA_INCOMP",
    label: "Primaria Incompleta",
    shortLabel: "Primaria Incomp.",
    aliases: ["primaria incompleta"],
  },
  {
    id: "SIN_INSTRUCCION",
    label: "Sin Instrucción",
    shortLabel: "Sin Instrucción",
    aliases: ["sin instrucción", "sin instruccion", "analfabeta", "ninguna", "ninguno"],
    alert: true,
  },
];

export type CivilStatusId = "SOLTERA" | "CASADA" | "CONVIVIENTE" | "DIVORCIADA" | "VIUDA" | "OTRO";

export const CIVIL_STATUS_CATALOG: ClinicalCatalogItem<CivilStatusId>[] = [
  { id: "SOLTERA", label: "Soltera", aliases: ["soltera", "soltero", "single"], alert: true },
  { id: "CASADA", label: "Casada", aliases: ["casada", "casado", "married"] },
  {
    id: "CONVIVIENTE",
    label: "Conviviente",
    aliases: ["conviviente", "union libre", "unión libre", "cohabitante"],
  },
  { id: "DIVORCIADA", label: "Divorciada", aliases: ["divorciada", "divorciado", "separada", "separado"] },
  { id: "VIUDA", label: "Viuda", aliases: ["viuda", "viudo", "widow"] },
  { id: "OTRO", label: "Otro", aliases: ["otro", "otra", "no especifica"] },
];

export type InsuranceId =
  | "PARTICULAR"
  | "EPS_RIMAC"
  | "EPS_PACIFICO"
  | "EPS_MAPFRE"
  | "EPS_SANITAS"
  | "EPS_LA_POSITIVA"
  | "ESSALUD"
  | "SIS"
  | "NO_APLICA";

export const INSURANCE_CATALOG: ClinicalCatalogItem<InsuranceId>[] = [
  {
    id: "PARTICULAR",
    label: "Particular",
    shortLabel: "Particular",
    aliases: ["particular", "particular / privado", "privado", "cuenta propia", "privada"],
  },
  {
    id: "EPS_RIMAC",
    label: "Rímac Seguros / EPS",
    shortLabel: "Rímac EPS",
    aliases: ["rimac", "rímac", "rimac eps", "rímac eps", "rimac seguros"],
  },
  {
    id: "EPS_PACIFICO",
    label: "Pacífico Seguros / EPS",
    shortLabel: "Pacífico EPS",
    aliases: ["pacifico", "pacífico", "pacifico eps", "pacífico eps", "pacifico seguros"],
  },
  {
    id: "EPS_MAPFRE",
    label: "Mapfre EPS",
    shortLabel: "Mapfre",
    aliases: ["mapfre", "mapfre eps", "mapfre seguros"],
  },
  {
    id: "EPS_SANITAS",
    label: "Sanitas EPS",
    shortLabel: "Sanitas",
    aliases: ["sanitas", "sanitas eps"],
  },
  {
    id: "EPS_LA_POSITIVA",
    label: "La Positiva EPS",
    shortLabel: "La Positiva",
    aliases: ["la positiva", "la positiva eps", "positiva"],
  },
  {
    id: "ESSALUD",
    label: "EsSalud (Seguro Social)",
    shortLabel: "EsSalud",
    aliases: ["essalud", "es salud", "seguro social"],
  },
  {
    id: "SIS",
    label: "SIS (Seguro Integral de Salud)",
    shortLabel: "SIS",
    aliases: ["sis", "seguro integral"],
  },
  {
    id: "NO_APLICA",
    label: "No Aplica / Sin Seguro",
    shortLabel: "Sin Seguro",
    aliases: ["no aplica", "ninguno", "sin seguro"],
  },
];

export type ContraceptiveId =
  | "NINGUNO"
  | "NINGUNO_EMBARAZO"
  | "NINGUNO_INACTIVA"
  | "PRESERVATIVO"
  | "ACO_COMBINADOS"
  | "ACO_PROGESTAGENO"
  | "INYECTABLE_MENSUAL"
  | "INYECTABLE_TRIMESTRAL"
  | "IMPLANTE_SUBDERMICO"
  | "DIU_COBRE"
  | "DIU_HORMONAL"
  | "PARCHE"
  | "ANILLO"
  | "LIGADURA"
  | "VASECTOMIA"
  | "RITMO"
  | "MELA"
  | "AOE"
  | "OTRO";

export const CONTRACEPTIVE_CATALOG: ClinicalCatalogItem<ContraceptiveId>[] = [
  { id: "NINGUNO", label: "Ninguno", aliases: ["ninguno", "ninguna", "no usa", "niega uso", "sin mac"] },
  {
    id: "NINGUNO_EMBARAZO",
    label: "Ninguno (Embarazo deseado y planificado)",
    aliases: ["embarazo deseado", "deseo gestacional", "buscando embarazo", "embarazo planificado"],
  },
  {
    id: "NINGUNO_INACTIVA",
    label: "Ninguno (Sin vida sexual activa)",
    aliases: ["sin vida sexual", "inactiva", "abstinencia", "no activa"],
  },
  {
    id: "PRESERVATIVO",
    label: "Preservativo / Condón masculino",
    aliases: ["preservativo", "condon", "condón", "preservativo de barrera", "barrera"],
  },
  {
    id: "ACO_COMBINADOS",
    label: "Anticonceptivos orales combinados",
    aliases: ["aco", "orales combinados", "pastillas", "pildoras", "anticonceptivos orales"],
  },
  {
    id: "ACO_PROGESTAGENO",
    label: "Anticonceptivos de progestágeno solo (Minipíldora)",
    aliases: ["minipíldora", "minipildora", "progestageno", "desogestrel"],
  },
  {
    id: "INYECTABLE_MENSUAL",
    label: "Inyectable mensual",
    aliases: ["inyectable mensual", "ampolla mensual", "mesigyna", "novafem"],
  },
  {
    id: "INYECTABLE_TRIMESTRAL",
    label: "Inyectable trimestral (Depo-Provera)",
    aliases: ["inyectable trimestral", "depo-provera", "depoprovera", "medroxiprogesterona"],
  },
  {
    id: "IMPLANTE_SUBDERMICO",
    label: "Implante subdérmico (Jadelle / Implanon)",
    aliases: ["implante", "implante subdérmico", "implante subdermico", "jadelle", "implanon", "nexplanon"],
  },
  {
    id: "DIU_COBRE",
    label: "DIU T de Cobre (TCu 380A)",
    aliases: ["diu", "t de cobre", "diu cobre", "tcu 380a", "diu de cobre"],
  },
  {
    id: "DIU_HORMONAL",
    label: "DIU Hormonal (Mirena / Kyleena)",
    aliases: ["diu hormonal", "mirena", "kyleena", "siu", "levonorgestrel diu"],
  },
  { id: "PARCHE", label: "Parche transdérmico", aliases: ["parche", "parche transdérmico", "evra"] },
  { id: "ANILLO", label: "Anillo vaginal", aliases: ["anillo", "anillo vaginal", "nuvaring"] },
  {
    id: "LIGADURA",
    label: "Ligadura de trompas",
    aliases: ["ligadura", "ligadura de trompas", "salpingoclasia", "btb"],
  },
  { id: "VASECTOMIA", label: "Vasectomía (pareja)", aliases: ["vasectomía", "vasectomia"] },
  {
    id: "RITMO",
    label: "Método del ritmo / Abstinencia periódica",
    aliases: ["ritmo", "ogino-knaus", "calendario", "abstinencia periodica"],
  },
  { id: "MELA", label: "Método de lactancia y amenorrea (MELA)", aliases: ["mela", "lactancia"] },
  {
    id: "AOE",
    label: "Anticoncepción oral de emergencia (AOE)",
    aliases: ["aoe", "pastilla del día siguiente", "emergencia"],
  },
  { id: "OTRO", label: "Otro método", aliases: ["otro", "otro método", "otros"] },
];

function resolveFromCatalog<TId extends string>(
  catalog: ClinicalCatalogItem<TId>[],
  input?: string | null
): ClinicalCatalogItem<TId> {
  if (!input) return catalog[0];
  const clean = input.trim().toLowerCase();
  if (!clean) return catalog[0];

  const byId = catalog.find((item) => item.id.toLowerCase() === clean);
  if (byId) return byId;

  const byLabel = catalog.find((item) => item.label.toLowerCase() === clean);
  if (byLabel) return byLabel;

  const byAlias = catalog.find((item) =>
    item.aliases.some((alias) => alias === clean || clean.includes(alias))
  );
  if (byAlias) return byAlias;

  return catalog[0];
}

export function resolveEducationLevel(input?: string | null) {
  return resolveFromCatalog(EDUCATION_LEVEL_CATALOG, input);
}

export function resolveCivilStatus(input?: string | null) {
  return resolveFromCatalog(CIVIL_STATUS_CATALOG, input);
}

export function resolveInsurance(input?: string | null) {
  return resolveFromCatalog(INSURANCE_CATALOG, input);
}

export function resolveContraceptive(input?: string | null): ClinicalCatalogItem<ContraceptiveId> {
  if (!input) return CONTRACEPTIVE_CATALOG[0];
  const resolved = resolveFromCatalog(CONTRACEPTIVE_CATALOG, input);
  if (
    resolved.id === CONTRACEPTIVE_CATALOG[0].id &&
    !CONTRACEPTIVE_CATALOG[0].aliases.some((a) => input.trim().toLowerCase().includes(a))
  ) {
    const custom = CONTRACEPTIVE_CATALOG.find((m) => m.id === "OTRO")!;
    return { ...custom, label: input.trim() };
  }
  return resolved;
}

export interface FurCalculationResult {
  days: number;
  weeks: number;
  remainingDays: number;
  text: string;
  error?: string;
}

/**
 * Calcula semanas y días de amenorrea obstétrica a partir de la FUR (YYYY-MM-DD)
 * usando exclusivamente la fecha oficial de Perú (America/Lima) sin desfase horario.
 */
export function calculateGestationalAgeFromFur(furString?: string | null): FurCalculationResult | null {
  if (!furString) return null;
  const trimmed = furString.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, fy, fm, fd] = match.map(Number);
  const [ty, tm, td] = getPeruDateString().split("-").map(Number);

  const furUtc = Date.UTC(fy, fm - 1, fd);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  if (!Number.isFinite(furUtc) || !Number.isFinite(todayUtc)) return null;

  const diffDays = Math.floor((todayUtc - furUtc) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return {
      days: 0,
      weeks: 0,
      remainingDays: 0,
      text: "",
      error: "La FUR no puede ser una fecha futura",
    };
  }

  const weeks = Math.floor(diffDays / 7);
  const remainingDays = diffDays % 7;

  return {
    days: diffDays,
    weeks,
    remainingDays,
    text: `${weeks} sem ${remainingDays} d (${diffDays} días de amenorrea)`,
  };
}
