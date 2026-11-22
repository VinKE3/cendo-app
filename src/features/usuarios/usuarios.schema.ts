import { z } from "zod";
import { pgUuidSchema } from "@/features/configuracion/configuracion.schema";
import type { UserRole } from "@/lib/security/action-guard";

export const DOCTOR_TITLES = ["Dr.", "Dra.", "Lic."] as const;
export const CLINICAL_ROLES = ["director", "doctor", "assistant"] as const;

export type DoctorTitle = (typeof DOCTOR_TITLES)[number];
export type ClinicalRole = (typeof CLINICAL_ROLES)[number];

export const COMMON_SPECIALTIES = [
  "Ginecología y Obstetricia - Endometriosis y Colposcopía",
  "Ginecología Oncológica y Patología Cervical",
  "Cirugía Ginecológica Mínimamente Invasiva y Fertilidad",
  "Ecografía Doppler Ginecológica y Obstétrica",
  "Medicina Materno Fetal y Alto Riesgo Obstétrico",
  "Urología Ginecológica y Piso Pélvico",
  "Endocrinología Ginecológica y Reproducción Asistida",
];

export interface DoctorListItem {
  id: string;
  email: string;
  fullName: string;
  doctorTitle: string;
  specialty: string;
  cmp: string;
  rne: string;
  role: UserRole;
  clinicalRole: ClinicalRole;
  phone: string;
  clinicAddress: string;
  isActive: boolean;
  createdAt: string;
}

export function mapClinicalRoleToSecurityRole(clinicalRole: ClinicalRole): UserRole {
  if (clinicalRole === "director") return "admin";
  if (clinicalRole === "doctor") return "moderator";
  return "user";
}

export const createDoctorSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, "El nombre completo es requerido (mínimo 3 caracteres).")
      .max(150),
    doctorTitle: z.enum(DOCTOR_TITLES, {
      error: "Seleccione un título profesional válido.",
    }),
    specialty: z.string().trim().min(3, "La especialidad es requerida.").max(180),
    cmp: z
      .string()
      .trim()
      .min(4, "El CMP debe tener al menos 4 dígitos.")
      .max(20)
      .regex(/^\d+$/, "El CMP debe contener solo dígitos numéricos."),
    rne: z
      .string()
      .trim()
      .max(20)
      .regex(/^\d*$/, "El RNE debe contener solo dígitos numéricos."),
    clinicalRole: z.enum(CLINICAL_ROLES, {
      error: "Seleccione un cargo institucional válido.",
    }),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Ingrese un correo electrónico válido."),
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres.")
      .max(128),
    phone: z.string().trim().min(6, "El teléfono es requerido.").max(30),
    clinicAddress: z
      .string()
      .trim()
      .min(5, "La dirección de sede es requerida.")
      .max(200),
    isActive: z.boolean(),
  })
  .strict();

export const updateDoctorSchema = z
  .object({
    id: pgUuidSchema("ID de especialista inválido."),
    fullName: z.string().trim().min(3).max(150),
    doctorTitle: z.enum(DOCTOR_TITLES),
    specialty: z.string().trim().min(3).max(180),
    cmp: z
      .string()
      .trim()
      .min(4)
      .max(20)
      .regex(/^\d+$/, "El CMP debe contener solo dígitos numéricos."),
    rne: z
      .string()
      .trim()
      .max(20)
      .regex(/^\d*$/, "El RNE debe contener solo dígitos numéricos."),
    clinicalRole: z.enum(CLINICAL_ROLES),
    email: z.string().trim().toLowerCase().email(),
    newPassword: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || v.length >= 6, {
        message: "La nueva contraseña debe tener al menos 6 caracteres.",
      }),
    phone: z.string().trim().min(6).max(30),
    clinicAddress: z.string().trim().min(5).max(200),
    isActive: z.boolean(),
  })
  .strict();

export const deleteDoctorSchema = z
  .object({
    id: pgUuidSchema("ID de especialista inválido."),
  })
  .strict();

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
