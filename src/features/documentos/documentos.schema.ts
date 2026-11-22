import { z } from "zod";
import { pgUuidSchema } from "@/features/configuracion/configuracion.schema";
import type { UltrasoundFindingsRecord } from "@/db/schema/specialty";
import {
  ULTRASOUND_TYPES,
  type UltrasoundType,
} from "@/features/ecografias/ecografias.schema";
import type {
  ParsedWordBackground,
  ParsedWordConsultation,
  WordDocKind,
} from "@/lib/word-parser";

export const MAX_WORD_IMPORT_BATCH_FILES = 20;

export const PATIENT_DOCUMENT_TYPES = [
  "PLACAS_ECO_MAMA",
  "PLACAS_ECO_TV",
  "PLACAS_ECO_OTRA",
  "LABORATORIO_PAP",
  "LABORATORIO_VPH",
  "LABORATORIO_OTRO",
  "IMAGEN_RESONANCIA",
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
  IMAGEN_RESONANCIA: "Resonancia / Tomografía / Imagen Externa",
  EXTERNO: "Otro Informe / Examen Externo",
};

export const PATIENT_DOCUMENT_SHORT_LABELS: Record<PatientDocumentType, string> = {
  PLACAS_ECO_MAMA: "Placas Eco Mama",
  PLACAS_ECO_TV: "Placas Eco TV",
  PLACAS_ECO_OTRA: "Placas Ecógrafo",
  LABORATORIO_PAP: "PAP (Lab)",
  LABORATORIO_VPH: "VPH (Lab)",
  LABORATORIO_OTRO: "Lab / Biopsia",
  IMAGEN_RESONANCIA: "Imagen / RMN",
  EXTERNO: "PDF Externo",
};

export const MAX_PATIENT_PDF_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_PATIENT_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_WORD_DOCX_BYTES = 10 * 1024 * 1024; // 10 MB

export type SupportedExternalDocumentMime =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/webp";

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

/**
 * Detecta por magic bytes si el buffer corresponde a un PDF o a una imagen clínica soportada.
 */
export function detectSupportedDocumentMime(
  bytes: Uint8Array
): SupportedExternalDocumentMime | null {
  if (isPdfMagicBytes(bytes)) return "application/pdf";
  if (bytes.byteLength < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  // WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Verifica la cabecera PK\x03\x04 de un contenedor OOXML (.docx).
 */
export function isDocxZipMagicBytes(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 4) return false;
  return (
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

export function getExtensionForDocumentMime(
  mime: SupportedExternalDocumentMime
): string {
  switch (mime) {
    case "application/pdf":
      return "pdf";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
  }
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

export interface WordHistoryDocumentItem {
  id: string;
  patientId: string;
  fileName: string;
  fileSize: number;
  extractedText: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const createPatientDocumentMetaSchema = z
  .object({
    patientId: pgUuidSchema("ID de paciente inválido."),
    documentType: z.enum(PATIENT_DOCUMENT_TYPES, {
      error: "Seleccione el tipo de documento.",
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

export const listWordHistoriesSchema = z
  .object({
    patientId: pgUuidSchema("ID de paciente inválido."),
  })
  .strict();

export const viewWordHistorySchema = z
  .object({
    id: pgUuidSchema("ID de historia Word inválido."),
  })
  .strict();

export const deleteWordHistorySchema = z
  .object({
    id: pgUuidSchema("ID de historia Word inválido."),
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

export function buildWordHistoryViewUrl(
  id: string,
  download = false
): string {
  const qs = `id=${encodeURIComponent(id)}${download ? "&download=1" : ""}`;
  return `/api/word-histories?${qs}`;
}

export interface WordImportPreviewItem {
  fileKey: string;
  fileName: string;
  fileSize: number;
  kind: WordDocKind;
  included: boolean;
  styleLabel?: string;
  warnings: string[];
  extractedText: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  birthDate: string;
  ageFromDoc: number | null;
  phone: string;
  civilStatus: string;
  educationLevel: string;
  occupation: string;
  birthPlace: string;
  address: string;
  religion: string;
  existingPatientId: string | null;
  existingPatientName: string | null;
  batchMatchedDni: boolean;
  background?: ParsedWordBackground;
  consultations: ParsedWordConsultation[];
  ultrasoundType?: UltrasoundType;
  reportDate?: string;
  indication?: string;
  findings?: UltrasoundFindingsRecord;
  conclusion?: string;
  recommendations?: string;
}

const parsedConsultationCommitSchema = z.object({
  consultationDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de consulta inválida (YYYY-MM-DD)."),
  inferredYear: z.boolean().optional(),
  isControl: z.boolean(),
  reasonForVisit: z.string().trim().min(1).max(250),
  symptoms: z.string().trim().max(5000),
  generalExam: z.string().trim().max(3000),
  speculoscopy: z.string().trim().max(2000),
  bimanualPalpation: z.string().trim().max(2000),
  externalGenitalia: z.string().trim().max(2000),
  abdomenExam: z.string().trim().max(2000),
  bloodPressure: z.string().trim().max(20),
  weightKg: z.number().nullable(),
  heightCm: z.number().nullable(),
  auxiliaryExams: z.string().trim().max(3000),
  diagnosis: z.string().trim().min(1).max(2000),
  cie10Code: z.string().trim().max(15),
  treatmentPlan: z.string().trim().max(4000),
  prescriptionNotes: z.string().trim().max(3000),
});

const parsedBackgroundCommitSchema = z.object({
  obstetricFormula: z.string().trim().max(30),
  catamenialRegimen: z.string().trim().max(40),
  contraceptiveMethod: z.string().trim().max(150),
  lastMenstrualPeriod: z.string().trim().max(20),
  papHistory: z.string().trim().max(300),
  vphTestHistory: z.string().trim().max(300),
  hasDiabetes: z.string().trim().max(120),
  hasHypertension: z.string().trim().max(120),
  hasAsthma: z.string().trim().max(120),
  medicalAllergies: z.string().trim().max(400),
  surgeriesHistory: z.string().trim().max(500),
  familyHistory: z.string().trim().max(500),
  otherPathologies: z.string().trim().max(500),
  stiHistory: z.string().trim().max(300),
  notes: z.string().trim().max(1000),
  menarche: z.number().nullable(),
  sexualDebutAge: z.number().nullable(),
  sexualPartnersCount: z.number().nullable(),
});

export const wordImportCommitItemSchema = z.object({
  fileKey: z.string().trim().min(1),
  fileName: z.string().trim().min(1).max(200),
  kind: z.enum(["HISTORIA_CLINICA", "ECOGRAFIA"]),
  included: z.boolean(),
  documentNumber: z.string().trim().max(20),
  firstName: z.string().trim().max(120),
  lastName: z.string().trim().max(120),
  birthDate: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: "Fecha de nacimiento inválida.",
    }),
  phone: z.string().trim().max(30),
  civilStatus: z.string().trim().max(60),
  educationLevel: z.string().trim().max(120),
  occupation: z.string().trim().max(120),
  birthPlace: z.string().trim().max(120),
  address: z.string().trim().max(250),
  religion: z.string().trim().max(80),
  existingPatientId: z.string().uuid().nullable().optional(),
  extractedText: z.string().max(65000),
  background: parsedBackgroundCommitSchema.optional(),
  consultations: z.array(parsedConsultationCommitSchema).max(30),
  ultrasoundType: z.enum(ULTRASOUND_TYPES).optional(),
  reportDate: z
    .string()
    .trim()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), {
      message: "Fecha de ecografía inválida.",
    })
    .optional(),
  indication: z.string().trim().max(300).optional(),
  findings: z.record(z.string(), z.unknown()).optional(),
  conclusion: z.string().trim().max(4000).optional(),
  recommendations: z.string().trim().max(2000).optional(),
});

export type WordImportCommitItem = z.infer<typeof wordImportCommitItemSchema>;

export interface WordImportCommitSummary {
  patientsCreated: number;
  patientsLinked: number;
  backgroundsCreated: number;
  consultationsCreated: number;
  ultrasoundsCreated: number;
  wordDocsArchived: number;
  skippedItems: Array<{ fileName: string; reason: string }>;
  affectedPatients: Array<{ id: string; fullName: string; documentNumber: string }>;
}
