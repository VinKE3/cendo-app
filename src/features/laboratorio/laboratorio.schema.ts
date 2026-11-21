import { z } from "zod";
import type {
  LabOrderItemRecord,
  LabSpecimenDetailsRecord,
} from "@/db/schema/clinical";

export const LAB_URGENCIES = ["Rutina", "Prioritario", "Urgente"] as const;
export type LabUrgency = (typeof LAB_URGENCIES)[number];

export const LAB_TEMPLATE_TYPES = [
  "GENERAL",
  "PAP",
  "BIOPSIA",
  "TRUCUT",
  "ITS",
  "PERITONEAL",
  "CUSTOM",
] as const;
export type LabTemplateType = (typeof LAB_TEMPLATE_TYPES)[number];

export const PATHOLOGY_SAMPLE_SUGGESTIONS = [
  "Citología de Cérvix",
  "Biopsia de Cérvix",
  "Biopsia de Endometrio",
  "Cono Cervical LEEP",
  "Biopsia Core de Mama",
  "Pólipo Cervical / Endocervical",
  "Líquido Peritoneal",
] as const;

/**
 * Construye el nombre de archivo PDF diferenciando solicitudes de Anatomía Patológica de órdenes generales.
 */
export function buildLabOrderPdfTitle(
  order: { templateType: string; orderDate: string },
  patientFullName: string
): string {
  const safePatientName = patientFullName
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ");
  const prefix =
    order.templateType !== "GENERAL" ? "Anatomia_Patologica" : "OrdenLab";
  return `${prefix}_${safePatientName}_${order.orderDate}`;
}

export const LAB_CATEGORIES = [
  "Ginecología & Marcadores",
  "Perfil Hormonal & Ovárico",
  "Hematología & Bioquímica",
  "Perfil Prenatal / Gestacional",
  "Orina & Función Renal",
  "Anatomía Patológica & Biopsias",
] as const;
export type LabCategory = (typeof LAB_CATEGORIES)[number];

export interface LabCatalogTest {
  id: string;
  name: string;
  category: LabCategory;
  sampleType: string;
  notes?: string;
}

export const LAB_TESTS_CATALOG: LabCatalogTest[] = [
  // Ginecología & Marcadores
  {
    id: "cat-ca125",
    name: "CA-125 (Marcador Ovárico / Endometriosis)",
    category: "Ginecología & Marcadores",
    sampleType: "Sangre venosa",
    notes: "Ayuno de 8 horas",
  },
  {
    id: "cat-pap",
    name: "Papanicolaou en Base Líquida (ThinPrep)",
    category: "Ginecología & Marcadores",
    sampleType: "Muestra cervical",
    notes: "Abstinencia sexual 48h previas",
  },
  {
    id: "cat-vph",
    name: "Panel Tipificación VPH 23 Genotipos (PCR)",
    category: "Ginecología & Marcadores",
    sampleType: "Muestra endocervical",
    notes: "Sin óvulos 48h previas",
  },
  {
    id: "cat-he4",
    name: "HE-4 + Índice ROMA (Riesgo Ovárico)",
    category: "Ginecología & Marcadores",
    sampleType: "Sangre venosa",
    notes: "Ayuno 8 horas",
  },
  {
    id: "cat-ca199",
    name: "CA 19-9 (Marcador Gastrointestinal / Ovárico)",
    category: "Ginecología & Marcadores",
    sampleType: "Sangre venosa",
  },
  {
    id: "cat-cea",
    name: "Antígeno Carcinoembrionario (CEA)",
    category: "Ginecología & Marcadores",
    sampleType: "Sangre venosa",
  },
  {
    id: "cat-cult-vag",
    name: "Cultivo de Secreción Vaginal + Antibiograma",
    category: "Ginecología & Marcadores",
    sampleType: "Hisopado vaginal",
    notes: "Sin aseo profundo matutino",
  },
  {
    id: "cat-frotis",
    name: "Frotis en Fresco / Tinción Gram Vaginal",
    category: "Ginecología & Marcadores",
    sampleType: "Hisopado vaginal",
  },
  {
    id: "cat-chlamydia",
    name: "Chlamydia trachomatis por PCR en tiempo real",
    category: "Ginecología & Marcadores",
    sampleType: "Muestra endocervical",
  },
  {
    id: "cat-mycoplasma",
    name: "Cultivo Mycoplasma hominis / Ureaplasma",
    category: "Ginecología & Marcadores",
    sampleType: "Hisopado vaginal",
  },
  // Anatomía Patológica
  {
    id: "cat-biopsia-cervix",
    name: "Biopsia de Cérvix / Endocérvix (Estudio Histopatológico)",
    category: "Anatomía Patológica & Biopsias",
    sampleType: "Tejido en formol al 10%",
    notes: "Indicar hora y cuadrante de toma",
  },
  {
    id: "cat-biopsia-endometrio",
    name: "Biopsia de Endometrio / Legrado Biópsico",
    category: "Anatomía Patológica & Biopsias",
    sampleType: "Tejido en formol al 10%",
  },
  {
    id: "cat-cono-leep",
    name: "Cono Cervical LEEP (Bordes Quirúrgicos y Lecho)",
    category: "Anatomía Patológica & Biopsias",
    sampleType: "Tejido en formol al 10%",
  },
  {
    id: "cat-biopsia-mama",
    name: "Biopsia Core (Tru-Cut) Mamaria con Inmunohistoquímica",
    category: "Anatomía Patológica & Biopsias",
    sampleType: "Cilindros de tejido en formol 10%",
  },
  // Perfil Hormonal & Ovárico
  {
    id: "cat-amh",
    name: "Hormona Antimülleriana (AMH - Reserva Ovárica)",
    category: "Perfil Hormonal & Ovárico",
    sampleType: "Sangre venosa",
  },
  {
    id: "cat-fsh",
    name: "FSH (Hormona Folículo Estimulante)",
    category: "Perfil Hormonal & Ovárico",
    sampleType: "Sangre venosa",
    notes: "Día 2-4 del ciclo menstrual",
  },
  {
    id: "cat-lh",
    name: "LH (Hormona Luteinizante)",
    category: "Perfil Hormonal & Ovárico",
    sampleType: "Sangre venosa",
    notes: "Día 2-4 del ciclo menstrual",
  },
  {
    id: "cat-e2",
    name: "Estradiol Sérico (E2)",
    category: "Perfil Hormonal & Ovárico",
    sampleType: "Sangre venosa",
    notes: "Día 2-4 del ciclo menstrual",
  },
  {
    id: "cat-prl",
    name: "Prolactina Sérica",
    category: "Perfil Hormonal & Ovárico",
    sampleType: "Sangre venosa",
    notes: "Reposo de 30 min previo",
  },
  {
    id: "cat-prog",
    name: "Progesterona Sérica",
    category: "Perfil Hormonal & Ovárico",
    sampleType: "Sangre venosa",
    notes: "Día 21 del ciclo (fase lútea)",
  },
  {
    id: "cat-testo",
    name: "Testosterona Total y Libre (Perfil SOP)",
    category: "Perfil Hormonal & Ovárico",
    sampleType: "Sangre venosa",
  },
  {
    id: "cat-dheas",
    name: "DHEA-Sulfato (DHEA-S)",
    category: "Perfil Hormonal & Ovárico",
    sampleType: "Sangre venosa",
  },
  {
    id: "cat-tsh",
    name: "Perfil Tiroideo Completo (TSH, T4 libre, T3 libre)",
    category: "Perfil Hormonal & Ovárico",
    sampleType: "Sangre venosa",
    notes: "Ayuno matutino",
  },
  {
    id: "cat-insulina",
    name: "Insulina Basal + HOMA-IR (Resistencia a la Insulina)",
    category: "Perfil Hormonal & Ovárico",
    sampleType: "Sangre venosa",
    notes: "Ayuno estricto de 10-12 horas",
  },
  // Hematología & Bioquímica
  {
    id: "cat-hemo",
    name: "Hemograma Completo Automatizado + Plaquetas + VSG",
    category: "Hematología & Bioquímica",
    sampleType: "Sangre con EDTA",
    notes: "Ayuno de 8 horas",
  },
  {
    id: "cat-glu",
    name: "Glucosa en Ayunas",
    category: "Hematología & Bioquímica",
    sampleType: "Sangre venosa",
    notes: "Ayuno de 8 a 10 horas",
  },
  {
    id: "cat-lipid",
    name: "Perfil Lipídico Completo (Colesterol, HDL, LDL, TG)",
    category: "Hematología & Bioquímica",
    sampleType: "Sangre venosa",
    notes: "Ayuno estricto 12 horas",
  },
  {
    id: "cat-crea",
    name: "Creatinina y Úrea Sérica",
    category: "Hematología & Bioquímica",
    sampleType: "Sangre venosa",
  },
  {
    id: "cat-hep",
    name: "Perfil Hepático (TGO, TGP, Bilirrubinas, FA)",
    category: "Hematología & Bioquímica",
    sampleType: "Sangre venosa",
  },
  {
    id: "cat-coag",
    name: "Perfil de Coagulación (TP, TTPA, Fibrinógeno, INR)",
    category: "Hematología & Bioquímica",
    sampleType: "Sangre con Citrato",
    notes: "Pre-quirúrgico",
  },
  {
    id: "cat-grupo",
    name: "Grupo Sanguíneo y Factor Rh",
    category: "Hematología & Bioquímica",
    sampleType: "Sangre venosa",
  },
  {
    id: "cat-ferri",
    name: "Ferritina Sérica y Hierro Sérico",
    category: "Hematología & Bioquímica",
    sampleType: "Sangre venosa",
  },
  {
    id: "cat-vitd",
    name: "Vitamina D (25-Hidroxivitamina D)",
    category: "Hematología & Bioquímica",
    sampleType: "Sangre venosa",
  },
  {
    id: "cat-pcr",
    name: "Proteína C Reactiva Ultrasensible (PCR-us)",
    category: "Hematología & Bioquímica",
    sampleType: "Sangre venosa",
  },
  // Perfil Prenatal / Gestacional
  {
    id: "cat-bhcg-cuant",
    name: "Subunidad Beta hCG Cuantitativa",
    category: "Perfil Prenatal / Gestacional",
    sampleType: "Sangre venosa",
  },
  {
    id: "cat-vdrl",
    name: "Serología Sífilis (VDRL / RPR Cuantitativo)",
    category: "Perfil Prenatal / Gestacional",
    sampleType: "Sangre venosa",
  },
  {
    id: "cat-vih",
    name: "Tamizaje VIH 1/2 (4ta Generación)",
    category: "Perfil Prenatal / Gestacional",
    sampleType: "Sangre venosa",
  },
  {
    id: "cat-hbsag",
    name: "Tamizaje Hepatitis B (HBsAg)",
    category: "Perfil Prenatal / Gestacional",
    sampleType: "Sangre venosa",
  },
  {
    id: "cat-torch",
    name: "Perfil TORCH (Toxoplasma, Rubeola, CMV, Herpes IgG/IgM)",
    category: "Perfil Prenatal / Gestacional",
    sampleType: "Sangre venosa",
  },
  {
    id: "cat-ttg",
    name: "Test de Tolerancia Oral a la Glucosa 75g (24-28 sem)",
    category: "Perfil Prenatal / Gestacional",
    sampleType: "Sangre venosa",
    notes: "Ayuno 8 horas",
  },
  // Orina & Función Renal
  {
    id: "cat-ego",
    name: "Examen Completo de Orina (EGO) Automatizado",
    category: "Orina & Función Renal",
    sampleType: "Orina matutina",
    notes: "Higiene genital previa",
  },
  {
    id: "cat-uro",
    name: "Urocultivo con Antibiograma Automatizado",
    category: "Orina & Función Renal",
    sampleType: "Orina chorro medio",
    notes: "Frasco estéril matutino",
  },
];

export interface LabPresetPack {
  id: string;
  name: string;
  description: string;
  testIds: string[];
  diagnosis: string;
  cie10Code: string;
}

export const LAB_PRESET_PACKS: LabPresetPack[] = [
  {
    id: "pack-endometriosis",
    name: "Descarte Endometriosis",
    description: "CA-125 + CA 19-9 + Hemograma + PCR-us + Ferritina",
    testIds: ["cat-ca125", "cat-ca199", "cat-hemo", "cat-pcr", "cat-ferri"],
    diagnosis: "Dolor pélvico crónico y sospecha de endometriosis",
    cie10Code: "N80.9",
  },
  {
    id: "pack-chequeo-cendo",
    name: "Chequeo Ginecológico CENDO",
    description: "PAP ThinPrep + VPH PCR + CA-125 + Hemograma + Urocultivo",
    testIds: ["cat-ca125", "cat-pap", "cat-vph", "cat-hemo", "cat-uro"],
    diagnosis: "Examen ginecológico preventivo y despistaje oncológico",
    cie10Code: "Z01.4",
  },
  {
    id: "pack-prenatal-1",
    name: "Control Prenatal 1er Trimestre",
    description: "Hemograma + Grupo/Rh + Glucosa + VDRL + VIH + HBsAg + TORCH + Urocultivo",
    testIds: [
      "cat-hemo",
      "cat-grupo",
      "cat-glu",
      "cat-vdrl",
      "cat-vih",
      "cat-hbsag",
      "cat-torch",
      "cat-uro",
    ],
    diagnosis: "Supervisión de embarazo normal - Primer trimestre (MINSA)",
    cie10Code: "Z34.8",
  },
  {
    id: "pack-fertilidad",
    name: "Fertilidad & Reserva Ovárica",
    description: "AMH + FSH + LH + Estradiol + Prolactina + Perfil Tiroideo",
    testIds: ["cat-amh", "cat-fsh", "cat-lh", "cat-e2", "cat-prl", "cat-tsh"],
    diagnosis: "Evaluación de reserva ovárica y estudio endocrino-reproductivo",
    cie10Code: "N97.9",
  },
  {
    id: "pack-preqx",
    name: "Pre-Quirúrgico Ginecológico",
    description: "Hemograma + Coagulación + Glucosa + Úrea/Creatinina + Grupo/Rh + EGO",
    testIds: ["cat-hemo", "cat-coag", "cat-glu", "cat-crea", "cat-grupo", "cat-ego"],
    diagnosis: "Evaluación pre-quirúrgica para procedimiento ginecológico",
    cie10Code: "Z01.8",
  },
  {
    id: "pack-sop",
    name: "Perfil SOP / Hiperandrogenismo",
    description: "Testosterona Total/Libre + DHEA-S + Insulina/HOMA-IR + FSH/LH + TSH",
    testIds: ["cat-testo", "cat-dheas", "cat-insulina", "cat-fsh", "cat-lh", "cat-tsh"],
    diagnosis: "Síndrome de ovario poliquístico / estudio metabólico",
    cie10Code: "E28.2",
  },
];

export const LAB_INSTRUCTION_PRESETS = [
  "Ayuno de 8 a 10 horas antes de la toma de muestra sanguínea.",
  "Abstinencia sexual estricta de 48 horas previas.",
  "No aplicar óvulos, cremas ni duchas vaginales 48 horas antes.",
  "Entregar la primera orina de la mañana en frasco estéril (chorro medio).",
  "Realizar la toma entre los días 2 y 4 del ciclo menstrual.",
] as const;

export interface LabOrderItem {
  id: string;
  patientId: string;
  consultationId: string | null;
  doctorId: string | null;
  doctorName: string;
  doctorCmp: string;
  doctorRne: string;
  orderDate: string;
  diagnosis: string;
  cie10Code: string;
  urgency: LabUrgency;
  items: LabOrderItemRecord[];
  customTests: string;
  patientInstructions: string;
  templateType: LabTemplateType;
  templateTitle: string;
  specimenDetails: LabSpecimenDetailsRecord | null;
  createdAt: string;
  updatedAt: string;
}

export interface LabOrderTemplateItem {
  id: string;
  code: string;
  title: string;
  category: string;
  templateType: LabTemplateType;
  sampleType: string;
  fixativeTransport: string;
  suggestedDiagnosis: string;
  cie10Code: string;
  defaultTests: string[];
  clinicalNotes: string;
  isOfficial: boolean;
  createdAt: string;
  updatedAt: string;
}

export function normalizeLabTestKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function hasDuplicateLabTest(
  items: LabOrderItemRecord[],
  candidateName: string,
  excludeIndex?: number
): boolean {
  const key = normalizeLabTestKey(candidateName);
  if (!key) return false;
  return items.some(
    (it, idx) => idx !== excludeIndex && normalizeLabTestKey(it.testName) === key
  );
}

export function getDefaultInstructionsForTemplateType(
  templateType: string
): string {
  if (templateType === "GENERAL") {
    return "Acudir en ayuno de 8 a 10 horas si incluye perfil metabólico o cumplir las indicaciones específicas de cada análisis.";
  }
  return "Muestra remitida desde consultorio CENDO para estudio de Anatomía Patológica.";
}

export function inferLabSampleAndCategory(testName: string): {
  category: string;
  sampleType: string;
} {
  const lower = testName.toLowerCase();
  if (lower.includes("pap") || lower.includes("vph") || lower.includes("citolog")) {
    return { category: "Ginecología & Marcadores", sampleType: "Muestra cervical" };
  }
  if (
    lower.includes("biopsia") ||
    lower.includes("legrado") ||
    lower.includes("cono") ||
    lower.includes("anatomía patológica") ||
    lower.includes("histopatol")
  ) {
    return {
      category: "Anatomía Patológica & Biopsias",
      sampleType: "Tejido en formol al 10%",
    };
  }
  if (
    lower.includes("urocultivo") ||
    lower.includes("orina") ||
    lower.includes("ego")
  ) {
    return { category: "Orina & Función Renal", sampleType: "Orina matutina" };
  }
  if (
    lower.includes("secreción") ||
    lower.includes("frotis") ||
    lower.includes("hisopado") ||
    lower.includes("chlamydia") ||
    lower.includes("mycoplasma")
  ) {
    return { category: "Ginecología & Marcadores", sampleType: "Hisopado vaginal" };
  }
  if (lower.includes("líquido peritoneal")) {
    return {
      category: "Anatomía Patológica & Biopsias",
      sampleType: "Líquido peritoneal estéril",
    };
  }
  return { category: "Ginecología & Exámenes Auxiliares", sampleType: "Sangre venosa" };
}

export function parseConsultationAuxExamsToLabItems(
  raw: string
): LabOrderItemRecord[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^[•\-*]\s*/, "").trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const items: LabOrderItemRecord[] = [];

  lines.forEach((testName, idx) => {
    const key = normalizeLabTestKey(testName);
    if (!key || seen.has(key)) return;
    seen.add(key);

    const matchedCatalog = LAB_TESTS_CATALOG.find(
      (c) =>
        normalizeLabTestKey(c.name) === key ||
        key.includes(normalizeLabTestKey(c.name))
    );
    const inferred = matchedCatalog ?? inferLabSampleAndCategory(testName);

    items.push({
      id: `lab-draft-${Date.now()}-${idx}`,
      category: inferred.category,
      testName,
      sampleType: inferred.sampleType,
      notes: matchedCatalog?.notes,
    });
  });

  return items;
}

export function slugifyTemplateCode(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug ? `tmpl-${slug}` : `tmpl-${Date.now()}`;
}

const pgUuidSchema = (message: string) =>
  z
    .string()
    .trim()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      message
    );

export const labOrderItemInputSchema = z
  .object({
    id: z.string().trim().min(1, "ID de análisis requerido.").max(80),
    category: z.string().trim().min(2, "Categoría requerida.").max(120),
    testName: z.string().trim().min(2, "Nombre de análisis requerido.").max(260),
    sampleType: z.string().trim().max(160).optional(),
    notes: z.string().trim().max(400).optional(),
  })
  .strict();

export const labSpecimenDetailsInputSchema = z
  .object({
    anatomicalSite: z.string().trim().max(240).optional(),
    sampleMethod: z.string().trim().max(240).optional(),
    fixative: z.string().trim().max(200).optional(),
    containerCount: z.coerce.number().int().min(1).max(30).optional(),
    cervixAspect: z.string().trim().max(240).optional(),
    furDate: z.string().trim().max(30).optional(),
    obstetricParity: z.string().trim().max(80).optional(),
    contraceptiveMethod: z.string().trim().max(160).optional(),
    clinicalFindings: z.string().trim().max(1000).optional(),
    sampleObtainedAt: z.string().trim().max(30).optional(),
    procedureOrigin: z.string().trim().max(200).optional(),
    requestingDoctor: z.string().trim().max(160).optional(),
  })
  .strict();

const labOrderCoreShape = {
  patientId: pgUuidSchema("ID de paciente inválido."),
  consultationId: pgUuidSchema("ID de consulta inválido.").nullable().optional(),
  orderDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Seleccione fecha válida (YYYY-MM-DD)."),
  diagnosis: z
    .string()
    .trim()
    .min(3, "El diagnóstico presuntivo es obligatorio.")
    .max(500),
  cie10Code: z
    .string()
    .trim()
    .max(15)
    .transform((val) => val.trim().toUpperCase()),
  urgency: z.enum(LAB_URGENCIES).default("Rutina"),
  items: z.array(labOrderItemInputSchema).max(40, "Máximo 40 análisis por orden."),
  customTests: z.string().trim().max(2000),
  patientInstructions: z.string().trim().max(2000),
  templateType: z.enum(LAB_TEMPLATE_TYPES).default("GENERAL"),
  templateTitle: z.string().trim().max(220),
  specimenDetails: labSpecimenDetailsInputSchema.nullable().optional(),
};

function validateLabOrderPayload(
  data: {
    items: LabOrderItemRecord[];
    customTests: string;
    templateType?: LabTemplateType;
    specimenDetails?: LabSpecimenDetailsRecord | null;
  },
  ctx: z.RefinementCtx
) {
  const hasPathologySample =
    data.templateType &&
    data.templateType !== "GENERAL" &&
    (data.specimenDetails?.anatomicalSite?.trim().length ?? 0) >= 2;

  if (
    data.items.length === 0 &&
    data.customTests.trim().length < 3 &&
    !hasPathologySample
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["items"],
      message:
        "Seleccione al menos un análisis del catálogo o detalle un examen adicional.",
    });
  }

  const seen = new Set<string>();
  data.items.forEach((item, index) => {
    const key = normalizeLabTestKey(item.testName);
    if (seen.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["items", index, "testName"],
        message: `Examen duplicado en la orden: "${item.testName}".`,
      });
    }
    seen.add(key);
  });
}

export const createLabOrderSchema = z
  .object({
    ...labOrderCoreShape,
  })
  .strict()
  .superRefine(validateLabOrderPayload);

export const updateLabOrderSchema = z
  .object({
    id: pgUuidSchema("ID de orden inválido."),
    ...labOrderCoreShape,
  })
  .strict()
  .superRefine(validateLabOrderPayload);

export const deleteLabOrderSchema = z
  .object({
    id: pgUuidSchema("ID de orden inválido."),
  })
  .strict();

const labTemplateCoreShape = {
  code: z
    .string()
    .trim()
    .max(64)
    .optional(),
  title: z
    .string()
    .trim()
    .min(3, "El título de la plantilla es obligatorio (mín. 3 caracteres).")
    .max(220),
  category: z.string().trim().min(2, "Categoría requerida.").max(120),
  templateType: z.enum(LAB_TEMPLATE_TYPES).default("CUSTOM"),
  sampleType: z.string().trim().max(400),
  fixativeTransport: z.string().trim().max(400),
  suggestedDiagnosis: z.string().trim().max(400),
  cie10Code: z
    .string()
    .trim()
    .max(15)
    .transform((val) => val.trim().toUpperCase()),
  defaultTests: z
    .array(z.string().trim().min(2).max(260))
    .min(1, "Debe incluir al menos 1 examen sugerido.")
    .max(25, "Máximo 25 exámenes por plantilla."),
  clinicalNotes: z.string().trim().max(1500),
};

export const createLabTemplateSchema = z
  .object({
    ...labTemplateCoreShape,
  })
  .strict();

export const updateLabTemplateSchema = z
  .object({
    id: pgUuidSchema("ID de plantilla inválido."),
    ...labTemplateCoreShape,
  })
  .strict();

export const deleteLabTemplateSchema = z
  .object({
    id: pgUuidSchema("ID de plantilla inválido."),
  })
  .strict();

export type CreateLabOrderInput = z.infer<typeof createLabOrderSchema>;
export type UpdateLabOrderInput = z.infer<typeof updateLabOrderSchema>;
export type DeleteLabOrderInput = z.infer<typeof deleteLabOrderSchema>;
export type CreateLabTemplateInput = z.infer<typeof createLabTemplateSchema>;
export type UpdateLabTemplateInput = z.infer<typeof updateLabTemplateSchema>;
export type DeleteLabTemplateInput = z.infer<typeof deleteLabTemplateSchema>;
