import { z } from "zod";
import type {
  CheckupDossierConfigRecord,
  CheckupDossierItemKind,
  CheckupDossierItemRecord,
} from "@/db/schema/clinical";
import { pgUuidSchema } from "@/features/configuracion/configuracion.schema";
import type { PatientDocumentItem } from "@/features/documentos/documentos.schema";
import type { UltrasoundReportItem } from "@/features/ecografias/ecografias.schema";

export const CHECKUP_STATUSES = ["EN_PROCESO", "COMPLETO"] as const;
export type CheckupStatus = (typeof CHECKUP_STATUSES)[number];

export const CHECKUP_STATUS_LABELS: Record<CheckupStatus, string> = {
  EN_PROCESO: "En Proceso (Esperando Resultados)",
  COMPLETO: "Completo (Listo para Entrega)",
};

export const DOSSIER_ITEM_KINDS = [
  "ULTRASOUND",
  "COLPOSCOPY",
  "DOCUMENT",
] as const;

export const CHECKUP_BIRADS_OPTIONS = [
  "BI-RADS 1 (Normal)",
  "BI-RADS 2 (Hallazgo Benigno)",
  "BI-RADS 3 (Control 6 meses)",
  "BI-RADS 4A",
  "BI-RADS 4B",
  "BI-RADS 4C",
  "BI-RADS 5",
  "No realizado en este chequeo",
] as const;

export const DEFAULT_DOSSIER_CONFIG: CheckupDossierConfigRecord = {
  coverTitle: "CHEQUEO GINECOLÓGICO",
  includeCoverPage: true,
  includeSummarySheet: false,
  showDigitalSignature: true,
  items: [],
};

export function normalizeDossierConfig(
  raw?: Partial<CheckupDossierConfigRecord> | null
): CheckupDossierConfigRecord {
  const seen = new Set<string>();
  const cleanItems: CheckupDossierItemRecord[] = [];
  for (const item of raw?.items ?? []) {
    const key = `${item.kind}:${item.refId}`;
    if (!seen.has(key)) {
      seen.add(key);
      cleanItems.push({
        kind: item.kind,
        refId: item.refId,
        label: item.label?.trim() || undefined,
      });
    }
  }

  return {
    coverTitle: raw?.coverTitle?.trim() || "CHEQUEO GINECOLÓGICO",
    includeCoverPage: raw?.includeCoverPage ?? true,
    includeSummarySheet: raw?.includeSummarySheet ?? false,
    showDigitalSignature: raw?.showDigitalSignature ?? true,
    items: cleanItems,
  };
}

/**
 * Ordena los estudios y PDFs externos siguiendo la secuencia oficial CENDO de informe.pdf:
 * 1. Eco Mama -> 2. Placas Eco Mama -> 3. Eco TV/Pélvica/Doppler -> 4. Placas Eco TV
 * -> 5. Colposcopía -> 6. PDF PAP -> 7. PDF VPH -> 8. Otros PDFs externos.
 */
export function autoOrderDossierItems(
  items: CheckupDossierItemRecord[],
  ultrasounds: UltrasoundReportItem[],
  documents: PatientDocumentItem[]
): CheckupDossierItemRecord[] {
  const ecoMap = new Map(ultrasounds.map((u) => [u.id, u]));
  const docMap = new Map(documents.map((d) => [d.id, d]));

  const getWeight = (item: CheckupDossierItemRecord): number => {
    if (item.kind === "ULTRASOUND") {
      const eco = ecoMap.get(item.refId);
      if (eco?.ultrasoundType === "MAMA_BILATERAL") return 10;
      return 30;
    }
    if (item.kind === "COLPOSCOPY") {
      return 50;
    }
    const doc = docMap.get(item.refId);
    switch (doc?.documentType) {
      case "PLACAS_ECO_MAMA":
        return 20;
      case "PLACAS_ECO_TV":
      case "PLACAS_ECO_OTRA":
        return 40;
      case "LABORATORIO_PAP":
        return 60;
      case "LABORATORIO_VPH":
        return 70;
      default:
        return 80;
    }
  };

  return items
    .map((item, idx) => ({ item, idx, weight: getWeight(item) }))
    .sort((a, b) => (a.weight !== b.weight ? a.weight - b.weight : a.idx - b.idx))
    .map((entry) => entry.item);
}

export interface ClinicalCheckupItem {
  id: string;
  patientId: string;
  consultationId: string | null;
  doctorId: string | null;
  doctorName: string;
  doctorCmp: string;
  doctorRne: string;
  checkupDate: string;
  reasonForConsultation: string;
  breastUltrasoundFindings: string;
  breastUltrasoundBirads: string;
  breastLesionMeasurements: string;
  transvaginalUltrasoundFindings: string;
  uterusMeasurements: string;
  endometriumThicknessMm: number | null;
  ovariesFindings: string;
  colposcopyFindings: string;
  colposcopyResult: string;
  papResult: string;
  vphResult: string;
  conclusions: string;
  cie10Code: string;
  medicalPrescription: string;
  status: CheckupStatus;
  dossierConfig: CheckupDossierConfigRecord;
  createdAt: string;
  updatedAt: string;
}

export const dossierItemSchema = z
  .object({
    kind: z.enum(DOSSIER_ITEM_KINDS),
    refId: pgUuidSchema("Identificador de estudio inválido en Dossier."),
    label: z.string().trim().max(160).optional(),
  })
  .strict();

export const dossierConfigSchema = z
  .object({
    coverTitle: z
      .string()
      .trim()
      .min(3, "Título de carátula mínimo 3 caracteres.")
      .max(120),
    includeCoverPage: z.boolean(),
    includeSummarySheet: z.boolean(),
    showDigitalSignature: z.boolean(),
    items: z
      .array(dossierItemSchema)
      .max(20, "Máximo 20 piezas por Dossier unificado."),
  })
  .strict();

const baseCheckupSchema = z.object({
  patientId: pgUuidSchema("ID de paciente inválido."),
  consultationId: pgUuidSchema("ID de consulta inválido.")
    .optional()
    .or(z.literal("")),
  checkupDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)."),
  status: z.enum(CHECKUP_STATUSES),
  reasonForConsultation: z
    .string()
    .trim()
    .min(3, "El motivo del chequeo es obligatorio.")
    .max(500),
  breastUltrasoundFindings: z.string().trim().max(1500).optional().or(z.literal("")),
  breastUltrasoundBirads: z.string().trim().max(80).optional().or(z.literal("")),
  breastLesionMeasurements: z.string().trim().max(400).optional().or(z.literal("")),
  transvaginalUltrasoundFindings: z
    .string()
    .trim()
    .max(1500)
    .optional()
    .or(z.literal("")),
  uterusMeasurements: z.string().trim().max(300).optional().or(z.literal("")),
  endometriumThicknessMm: z
    .number({ error: "El grosor endometrial debe ser numérico." })
    .finite()
    .min(0, "Mínimo 0 mm.")
    .max(60, "Máximo 60 mm.")
    .optional()
    .nullable(),
  ovariesFindings: z.string().trim().max(800).optional().or(z.literal("")),
  colposcopyFindings: z.string().trim().max(1500).optional().or(z.literal("")),
  colposcopyResult: z.string().trim().max(400).optional().or(z.literal("")),
  papResult: z.string().trim().max(400).optional().or(z.literal("")),
  vphResult: z.string().trim().max(400).optional().or(z.literal("")),
  conclusions: z
    .string()
    .trim()
    .min(3, "Las conclusiones del chequeo son obligatorias.")
    .max(2500),
  cie10Code: z.string().trim().max(15).optional().or(z.literal("")),
  medicalPrescription: z.string().trim().max(2000).optional().or(z.literal("")),
  dossierConfig: dossierConfigSchema,
});

export const createCheckupSchema = baseCheckupSchema.strict();

export const updateCheckupSchema = baseCheckupSchema
  .extend({
    id: pgUuidSchema("ID de chequeo inválido."),
  })
  .strict();

export const deleteCheckupSchema = z
  .object({
    id: pgUuidSchema("ID de chequeo inválido."),
  })
  .strict();

export const listCheckupsSchema = z
  .object({
    patientId: pgUuidSchema("ID de paciente inválido."),
  })
  .strict();

export type CreateCheckupInput = z.infer<typeof createCheckupSchema>;
export type UpdateCheckupInput = z.infer<typeof updateCheckupSchema>;
export type DossierItemKind = CheckupDossierItemKind;
