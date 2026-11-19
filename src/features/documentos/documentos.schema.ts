import { z } from "zod";
import { pgUuidSchema } from "@/features/configuracion/configuracion.schema";

export const PATIENT_DOCUMENT_TYPES = [
  "PLACAS_ECO_MAMA",
  "PLACAS_ECO_TV",
  "PLACAS_ECO_OTRA",
  "LABORATORIO_PAP",
  "LABORATORIO_VPH",
  "LABORATORIO_OTRO",
  "EXTERNO",
] as const;

export type PatientDocumentType = (typeof PATIENT_DOCUMENT_TYPES)[number];

export const PATIENT_DOCUMENT_TYPE_LABELS: Record<PatientDocumentType, string> = {
  PLACAS_ECO_MAMA: "Placas Ecografía Mamaria (VINNO / Ecógrafo)",
  PLACAS_ECO_TV: "Placas Ecografía Transvaginal (VINNO / Ecógrafo)",
  PLACAS_ECO_OTRA: "Placas Ecografía Pélvica / Obstétrica",
  LABORATORIO_PAP: "Resultado Papanicolaou / Citología (Lab Externo)",
  LABORATORIO_VPH: "Resultado Test Molecular VPH (Lab Externo)",
  LABORATORIO_OTRO: "Resultado Laboratorio / Anatomía Patológica",
  EXTERNO: "Otro Informe / Examen Externo",
};

export const PATIENT_DOCUMENT_SHORT_LABELS: Record<PatientDocumentType, string> = {
  PLACAS_ECO_MAMA: "Placas Eco Mama",
  PLACAS_ECO_TV: "Placas Eco TV",
  PLACAS_ECO_OTRA: "Placas Ecógrafo",
  LABORATORIO_PAP: "PAP (Lab)",
  LABORATORIO_VPH: "VPH (Lab)",
  LABORATORIO_OTRO: "Lab / Biopsia",
  EXTERNO: "PDF Externo",
};

export const MAX_PATIENT_PDF_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Verifica la cabecera mágica binaria %PDF- (0x25 0x50 0x44 0x46 0x2D).
 */
export function isPdfMagicBytes(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 5) return false;
  return (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export interface PatientDocumentItem {
  id: string;
  patientId: string;
  documentType: PatientDocumentType;
  title: string;
  documentDate: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const createPatientDocumentMetaSchema = z
  .object({
    patientId: pgUuidSchema("ID de paciente inválido."),
    documentType: z.enum(PATIENT_DOCUMENT_TYPES, {
      error: "Seleccione el tipo de documento PDF.",
    }),
    title: z
      .string()
      .trim()
      .min(2, "El título del documento es obligatorio (mín. 2 caracteres).")
      .max(160, "Título máximo de 160 caracteres."),
    documentDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD).")
      .optional()
      .or(z.literal("")),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .strict();

export const listPatientDocumentsSchema = z
  .object({
    patientId: pgUuidSchema("ID de paciente inválido."),
  })
  .strict();

export const deletePatientDocumentSchema = z
  .object({
    id: pgUuidSchema("ID de documento inválido."),
  })
  .strict();

export const viewPatientDocumentSchema = z
  .object({
    id: pgUuidSchema("ID de documento inválido."),
  })
  .strict();

export type CreatePatientDocumentMetaInput = z.infer<
  typeof createPatientDocumentMetaSchema
>;

export function buildPatientDocumentViewUrl(
  id: string,
  download = false
): string {
  const qs = `id=${encodeURIComponent(id)}${download ? "&download=1" : ""}`;
  return `/api/patient-documents?${qs}`;
}
