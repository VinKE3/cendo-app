import { z } from "zod";
import type { PrescriptionItemRecord } from "@/db/schema/clinical";
import type { ConsultationVademecumOption } from "@/features/consultas/consultas.schema";

export interface MedicalPrescriptionItem {
  id: string;
  patientId: string;
  consultationId: string | null;
  doctorId: string | null;
  doctorName: string;
  doctorCmp: string;
  doctorRne: string;
  prescriptionDate: string;
  diagnosis: string;
  cie10Code: string;
  items: PrescriptionItemRecord[];
  generalIndications: string;
  nextAppointmentDate: string;
  createdAt: string;
  updatedAt: string;
}

export const PRESCRIPTION_ROUTES = [
  "Vía Oral",
  "Vía Vaginal",
  "Vía Tópica",
  "Vía Intramuscular",
  "Vía Intravenosa",
  "Vía Subcutánea",
  "Vía Sublingual",
  "Vía Rectal",
] as const;

export type PrescriptionRoute = (typeof PRESCRIPTION_ROUTES)[number];

export interface ClinicalDosagePreset {
  id: string;
  label: string;
  badge: string;
  route: PrescriptionRoute;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: string;
}

export const CLINICAL_DOSAGE_PRESETS: ClinicalDosagePreset[] = [
  {
    id: "ovulo-7d",
    label: "Óvulo Vaginal x 7 Noches",
    badge: "Vía Vaginal",
    route: "Vía Vaginal",
    dosage: "1 óvulo",
    frequency: "Cada 24 horas por las noches antes de dormir",
    duration: "Por 7 días continuos",
    instructions:
      "Introducir profundamente al acostarse. Abstinencia sexual durante el tratamiento.",
    quantity: "1 caja x 7 óvulos",
  },
  {
    id: "ovulo-10d",
    label: "Óvulo Vaginal x 10 Noches",
    badge: "Vía Vaginal",
    route: "Vía Vaginal",
    dosage: "1 óvulo",
    frequency: "Cada 24 horas por las noches antes de dormir",
    duration: "Por 10 días continuos",
    instructions:
      "Introducir profundamente. Evitar bebidas alcohólicas y duchas vaginales.",
    quantity: "1 caja x 10 óvulos",
  },
  {
    id: "dienogest-endo",
    label: "Dienogest 2mg continuo (Endometriosis)",
    badge: "Vía Oral",
    route: "Vía Oral",
    dosage: "1 comprimido (2 mg)",
    frequency: "Cada 24 horas en horario fijo",
    duration: "Tratamiento continuo x 3 meses (reevaluación)",
    instructions:
      "Tomar todos los días a la misma hora sin interrupción entre envases.",
    quantity: "3 cajas x 28 comprimidos",
  },
  {
    id: "antibiotico-12h-7d",
    label: "Antibiótico Oral c/12h x 7 días",
    badge: "Vía Oral",
    route: "Vía Oral",
    dosage: "1 tableta / cápsula",
    frequency: "Cada 12 horas después de los alimentos",
    duration: "Por 7 días continuos sin suspender",
    instructions:
      "Tomar con abundante agua después de las comidas. Completar el esquema.",
    quantity: "14 tabletas / cápsulas",
  },
  {
    id: "doxiciclina-14d",
    label: "Doxiciclina c/12h x 14 días (EPI / Cervicitis)",
    badge: "Vía Oral",
    route: "Vía Oral",
    dosage: "1 cápsula (100 mg)",
    frequency: "Cada 12 horas con las comidas",
    duration: "Por 14 días continuos",
    instructions:
      "Ingerir con un vaso lleno de agua en posición erguida para evitar irritación esofágica.",
    quantity: "28 cápsulas",
  },
  {
    id: "aine-8h-prn",
    label: "Analgésico / AINE c/8h condicional al dolor",
    badge: "Vía Oral",
    route: "Vía Oral",
    dosage: "1 tableta",
    frequency: "Cada 8 horas después de los alimentos",
    duration: "Por 3 a 5 días condicional al dolor",
    instructions:
      "Tomar siempre con alimentos. Suspender cuando ceda el dolor pélvico o dismenorrea.",
    quantity: "10 tabletas",
  },
  {
    id: "fluconazol-du",
    label: "Antimicótico Dosis Única (Fluconazol 150mg)",
    badge: "Vía Oral",
    route: "Vía Oral",
    dosage: "1 cápsula (150 mg)",
    frequency: "Dosis única vía oral",
    duration: "Dosis única (repetir a las 72h si persiste)",
    instructions: "Tomar con o sin alimentos según indicación médica.",
    quantity: "1 o 2 cápsulas",
  },
  {
    id: "unguento-topico",
    label: "Ungüento / Crema Vulvar c/8h x 7 días",
    badge: "Vía Tópica",
    route: "Vía Tópica",
    dosage: "Aplicar capa delgada",
    frequency: "Cada 8 horas sobre zona afectada",
    duration: "Por 7 días continuos",
    instructions:
      "Aplicar tras higiene con jabón neutro y secado suave sin fricción.",
    quantity: "1 tubo",
  },
  {
    id: "suplemento-prenatal",
    label: "Suplementación Prenatal (Hierro + Ácido Fólico)",
    badge: "Vía Oral",
    route: "Vía Oral",
    dosage: "1 tableta / cápsula",
    frequency: "Cada 24 horas en ayunas o media mañana",
    duration: "Uso continuo durante control prenatal",
    instructions:
      "Acompañar preferentemente con bebida cítrica; alejar de lácteos o antiácidos.",
    quantity: "30 tabletas",
  },
];

export const QUICK_GENERAL_INDICATIONS = [
  "Aseo de zona íntima con agua tibia y limpiador pH neutro/ácido suave.",
  "Abstinencia sexual estricta durante el tratamiento con óvulos vaginales.",
  "No consumir bebidas alcohólicas mientras dure el tratamiento farmacológico.",
  "Usar ropa interior de algodón holgada y evitar prendas sintéticas ajustadas.",
  "Evitar duchas vaginales, desodorantes íntimos o protectores perfumados.",
  "Completar el tratamiento indicado aun cuando los síntomas disminuyan antes.",
  "Acudir a control ginecológico post-tratamiento en la fecha programada.",
] as const;

export function normalizeMedicationKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function hasDuplicateMedication(
  items: PrescriptionItemRecord[],
  candidateName: string,
  excludeIndex?: number
): boolean {
  const key = normalizeMedicationKey(candidateName);
  if (!key) return false;
  return items.some(
    (item, idx) => idx !== excludeIndex && normalizeMedicationKey(item.medicationName) === key
  );
}

export function inferDosagePresetForMedication(
  genericName: string
): ClinicalDosagePreset | null {
  const lower = genericName.toLowerCase();
  if (lower.includes("dienogest") || lower.includes("visanne")) {
    return CLINICAL_DOSAGE_PRESETS.find((p) => p.id === "dienogest-endo") ?? null;
  }
  if (lower.includes("metronidazol") || lower.includes("clindamicina") || lower.includes("óvulo") || lower.includes("ovulo")) {
    return CLINICAL_DOSAGE_PRESETS.find((p) => p.id === "ovulo-7d") ?? null;
  }
  if (lower.includes("doxiciclina")) {
    return CLINICAL_DOSAGE_PRESETS.find((p) => p.id === "doxiciclina-14d") ?? null;
  }
  if (lower.includes("naproxeno") || lower.includes("ibuprofeno") || lower.includes("ketoprofeno") || lower.includes("dexketoprofeno")) {
    return CLINICAL_DOSAGE_PRESETS.find((p) => p.id === "aine-8h-prn") ?? null;
  }
  if (lower.includes("fluconazol")) {
    return CLINICAL_DOSAGE_PRESETS.find((p) => p.id === "fluconazol-du") ?? null;
  }
  if (lower.includes("mupirocina") || lower.includes("clotrimazol") || lower.includes("crema") || lower.includes("ungüento")) {
    return CLINICAL_DOSAGE_PRESETS.find((p) => p.id === "unguento-topico") ?? null;
  }
  if (lower.includes("ácido fólico") || lower.includes("acido folico") || lower.includes("hierro") || lower.includes("ferroso")) {
    return CLINICAL_DOSAGE_PRESETS.find((p) => p.id === "suplemento-prenatal") ?? null;
  }
  return null;
}

export function parseConsultationRxNotesToDraftItems(
  notes: string,
  vademecumOptions: ConsultationVademecumOption[]
): PrescriptionItemRecord[] {
  const lines = notes
    .split(/\r?\n/)
    .map((line) => line.replace(/^[•\-*]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const seen = new Set<string>();
  const items: PrescriptionItemRecord[] = [];

  lines.forEach((line, idx) => {
    const colonIdx = line.indexOf(":");
    const rawName = colonIdx > 2 && colonIdx < 80 ? line.slice(0, colonIdx).trim() : line;
    const rawDetail = colonIdx > 2 && colonIdx < 80 ? line.slice(colonIdx + 1).trim() : "";

    const key = normalizeMedicationKey(rawName);
    if (!key || seen.has(key)) return;
    seen.add(key);

    const matchedMed = vademecumOptions.find(
      (m) =>
        key.includes(m.genericName.toLowerCase()) ||
        m.genericName.toLowerCase().includes(key) ||
        m.commercialBrands.some((b) => key.includes(b.brandName.toLowerCase()))
    );

    const preset = inferDosagePresetForMedication(
      matchedMed ? matchedMed.genericName : rawName
    );
    const lowerLine = line.toLowerCase();

    const inferredRoute: PrescriptionRoute = preset
      ? preset.route
      : lowerLine.includes("óvulo") || lowerLine.includes("ovulo") || lowerLine.includes("vaginal")
        ? "Vía Vaginal"
        : lowerLine.includes("crema") || lowerLine.includes("ungüento") || lowerLine.includes("tópic")
          ? "Vía Tópica"
          : lowerLine.includes("ampolla") || lowerLine.includes("im ")
            ? "Vía Intramuscular"
            : "Vía Oral";

    const presentation =
      matchedMed?.commercialBrands[0]?.presentation ||
      (inferredRoute === "Vía Vaginal"
        ? "Óvulos vaginales"
        : inferredRoute === "Vía Tópica"
          ? "Tubo tópico"
          : "Tabletas / Cápsulas");

    items.push({
      id: `rx-draft-${Date.now()}-${idx}`,
      medicationName: rawName,
      presentation,
      route: inferredRoute,
      dosage: preset?.dosage ?? "Según pauta médica",
      frequency: preset?.frequency ?? "Indicada en consulta",
      duration: preset?.duration ?? "Tratamiento completo",
      instructions: rawDetail || preset?.instructions || "",
      quantity: preset?.quantity ?? "1 envase",
    });
  });

  return items;
}

const pgUuidSchema = (message: string) =>
  z
    .string()
    .trim()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      message
    );

const optionalDateSchema = z
  .string()
  .trim()
  .refine((val) => val === "" || /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: "Formato de fecha inválido (YYYY-MM-DD).",
  });

export const prescriptionItemInputSchema = z
  .object({
    id: z.string().trim().min(1, "ID de medicamento requerido.").max(80),
    medicationName: z
      .string()
      .trim()
      .min(2, "Nombre del medicamento requerido.")
      .max(220),
    presentation: z
      .string()
      .trim()
      .min(2, "Presentación requerida.")
      .max(160),
    route: z.string().trim().min(2, "Vía de administración requerida.").max(80),
    dosage: z.string().trim().min(1, "Dosis requerida.").max(160),
    frequency: z.string().trim().min(2, "Frecuencia requerida.").max(200),
    duration: z.string().trim().min(2, "Duración requerida.").max(200),
    instructions: z.string().trim().max(500).optional(),
    quantity: z.string().trim().max(120).optional(),
  })
  .strict();

const prescriptionCoreShape = {
  patientId: pgUuidSchema("ID de paciente inválido."),
  consultationId: pgUuidSchema("ID de consulta inválido.").nullable().optional(),
  prescriptionDate: z
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
  items: z
    .array(prescriptionItemInputSchema)
    .min(1, "Debe agregar al menos un medicamento a la receta.")
    .max(25, "Máximo 25 medicamentos por receta."),
  generalIndications: z.string().trim().max(2000),
  nextAppointmentDate: optionalDateSchema,
};

function validateNoDuplicateItems(
  data: { items: PrescriptionItemRecord[] },
  ctx: z.RefinementCtx
) {
  const seen = new Set<string>();
  data.items.forEach((item, index) => {
    const key = normalizeMedicationKey(item.medicationName);
    if (seen.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["items", index, "medicationName"],
        message: `Medicamento duplicado en receta: "${item.medicationName}".`,
      });
    }
    seen.add(key);
  });
}

export const createPrescriptionSchema = z
  .object({
    ...prescriptionCoreShape,
  })
  .strict()
  .superRefine(validateNoDuplicateItems);

export const updatePrescriptionSchema = z
  .object({
    id: pgUuidSchema("ID de receta inválido."),
    ...prescriptionCoreShape,
  })
  .strict()
  .superRefine(validateNoDuplicateItems);

export const deletePrescriptionSchema = z
  .object({
    id: pgUuidSchema("ID de receta inválido."),
  })
  .strict();

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;
export type DeletePrescriptionInput = z.infer<typeof deletePrescriptionSchema>;
