import { z } from "zod";

export const MAX_SIGNATURE_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

export const DOCTOR_TITLE_OPTIONS = [
  "Dr.",
  "Dra.",
  "Lic.",
  "Obs.",
  "Adm.",
] as const;

export const pgUuidSchema = (message = "Identificador UUID inválido.") =>
  z
    .string()
    .trim()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      message
    );

export interface DoctorSignatureEntry {
  doctorId: string;
  fullName: string;
  doctorTitle: string;
  specialty: string;
  cmp: string;
  rne: string;
  hasSignature: boolean;
  signatureVersion: string;
  showSignatureByDefault: boolean;
}

export interface DoctorConfigProfile {
  id: string;
  email: string;
  fullName: string;
  doctorTitle: string;
  specialty: string;
  cmp: string;
  rne: string;
  role: string;
  clinicalRole: string;
  clinicName: string;
  clinicAddress: string;
  phone: string;
  contactEmail: string;
  hasSignature: boolean;
  signatureVersion: string;
  showSignatureByDefault: boolean;
  canManageSignature: boolean;
}

/**
 * Inspecciona los magic bytes reales del binario recibido para aceptar
 * únicamente imágenes PNG, JPEG o WebP (rechaza SVG o archivos alterados).
 */
export function detectVerifiedImageType(bytes: Uint8Array): {
  ext: "png" | "jpg" | "webp";
  contentType: string;
} | null {
  if (bytes.byteLength < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { ext: "png", contentType: "image/png" };
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", contentType: "image/jpeg" };
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
    return { ext: "webp", contentType: "image/webp" };
  }

  return null;
}

export const updateDoctorConfigSchema = z
  .object({
    doctorTitle: z.enum(DOCTOR_TITLE_OPTIONS, {
      error: "Seleccione un título profesional válido.",
    }),
    fullName: z
      .string()
      .trim()
      .min(3, "El nombre completo debe tener al menos 3 caracteres.")
      .max(120, "Nombre demasiado largo."),
    specialty: z.string().trim().max(160, "Especialidad demasiado larga."),
    cmp: z
      .string()
      .trim()
      .max(20, "CMP máximo de 20 dígitos.")
      .regex(/^\d*$/, "El CMP debe contener solo dígitos numéricos."),
    rne: z
      .string()
      .trim()
      .max(20, "RNE máximo de 20 dígitos.")
      .regex(/^\d*$/, "El RNE debe contener solo dígitos numéricos."),
    phone: z.string().trim().max(30, "Teléfono demasiado largo."),
    clinicAddress: z
      .string()
      .trim()
      .max(240, "Dirección de sede demasiado larga."),
    showSignatureByDefault: z.boolean(),
  })
  .strict();

export type UpdateDoctorConfigInput = z.infer<typeof updateDoctorConfigSchema>;

export const signatureDoctorQuerySchema = z
  .object({
    doctorId: pgUuidSchema("ID de médico inválido.").optional(),
  })
  .strict();
