import { z } from "zod";
import { DOCUMENT_TYPES } from "@/features/pacientes/pacientes.schema";

export const APPOINTMENT_STATUSES = [
  "PENDIENTE",
  "CONFIRMADA",
  "EN_ESPERA",
  "ATENDIDA",
  "CANCELADA",
  "NO_ASISTIO",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_TYPES = [
  "CONSULTA_PRIMERA_VEZ",
  "CONTROL_GINECOLOGICO",
  "CHEQUEO_INTEGRAL",
  "CONTROL_PRENATAL",
  "COLPOSCOPIA",
  "ECOGRAFIA",
  "PROCEDIMIENTO_MENOR",
] as const;

export type AppointmentType = string;

export const LEGACY_APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  CONSULTA_PRIMERA_VEZ: "Consulta Ginecológica (Primera Vez)",
  CONTROL_GINECOLOGICO: "Control Ginecológico Periódico",
  CHEQUEO_INTEGRAL: "Chequeo Preventivo Integral CENDO",
  CONTROL_PRENATAL: "Control Prenatal Oficial (MINSA/CLAP)",
  COLPOSCOPIA: "Colposcopía Especializada & IFCPC",
  ECOGRAFIA: "Ecografía Especializada (TV / Mama / Obstétrica)",
  PROCEDIMIENTO_MENOR: "Procedimiento Menor (Biopsia / LEEP / DIU)",
};

export const APPOINTMENT_TYPE_LABELS = LEGACY_APPOINTMENT_TYPE_LABELS;

export function resolveAppointmentTypeLabel(raw: string): string {
  const clean = raw.trim();
  if (!clean) return "Control Ginecológico Periódico";
  return LEGACY_APPOINTMENT_TYPE_LABELS[clean.toUpperCase()] ?? clean;
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADA: "Confirmada",
  EN_ESPERA: "En Sala de Espera",
  ATENDIDA: "Atendida",
  CANCELADA: "Cancelada",
  NO_ASISTIO: "No Asistió",
};

export interface AgendaDoctorOption {
  id: string;
  fullName: string;
  doctorTitle: string;
  specialty: string;
  phone: string;
  clinicAddress: string;
}

export interface AgendaPatientOption {
  id: string;
  fullName: string;
  documentType: string;
  documentNumber: string;
  phone: string;
  insuranceInfo: string;
  medicalAllergies: string;
}

export interface AgendaAppointmentItem {
  id: string;
  patientId: string;
  patientName: string;
  patientDocumentType: string;
  patientDocumentNumber: string;
  patientPhone: string;
  patientInsurance: string;
  patientAllergies: string;
  doctorId: string | null;
  doctorName: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
  durationMinutes: number;
  appointmentType: AppointmentType;
  reason: string;
  status: AppointmentStatus;
  notes: string;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export function isValidTimeHHmm(timeStr: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr.trim());
}

export function parseTimeToMinutes(timeStr: string): number {
  const clean = timeStr.trim().slice(0, 5);
  const [hours, minutes] = clean.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function formatMinutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, totalMinutes));
  const hh = Math.floor(clamped / 60);
  const mm = clamped % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export const quickNewPatientSchema = z
  .object({
    documentType: z.enum(DOCUMENT_TYPES, {
      error: "Seleccione un tipo de documento válido.",
    }),
    documentNumber: z
      .string()
      .trim()
      .min(6, "El documento debe tener al menos 6 caracteres.")
      .max(20, "El documento no debe exceder 20 caracteres.")
      .transform((val) => val.trim().toUpperCase()),
    firstName: z
      .string()
      .trim()
      .min(2, "Los nombres son obligatorios (mínimo 2 letras).")
      .max(120)
      .transform((val) => val.trim().toUpperCase()),
    lastName: z
      .string()
      .trim()
      .min(2, "Los apellidos son obligatorios (mínimo 2 letras).")
      .max(120)
      .transform((val) => val.trim().toUpperCase()),
    birthDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Seleccione fecha de nacimiento válida (YYYY-MM-DD)."),
    phone: z
      .string()
      .trim()
      .min(6, "Ingrese un teléfono o celular válido (mínimo 6 dígitos).")
      .max(30),
    insuranceInfo: z.string().trim().min(2).max(120).default("Particular"),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.documentType === "DNI") {
      if (!/^\d{8}$/.test(data.documentNumber)) {
        ctx.addIssue({
          code: "custom",
          path: ["documentNumber"],
          message: "El DNI peruano debe tener exactamente 8 dígitos numéricos.",
        });
      }
      return;
    }

    if (!/^[A-Z0-9]{6,12}$/.test(data.documentNumber)) {
      ctx.addIssue({
        code: "custom",
        path: ["documentNumber"],
        message: "El Carné de Extranjería / Pasaporte debe tener 6 a 12 caracteres alfanuméricos.",
      });
    }
  });

const pgUuidSchema = (message: string) =>
  z
    .string()
    .trim()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      message
    );

const appointmentBaseFields = {
  doctorId: pgUuidSchema("Seleccione un especialista válido."),
  appointmentDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Seleccione una fecha válida (YYYY-MM-DD)."),
  appointmentTime: z
    .string()
    .trim()
    .refine(isValidTimeHHmm, "Ingrese una hora válida en formato 24h (HH:mm)."),
  durationMinutes: z.coerce
    .number({ error: "Seleccione una duración válida." })
    .int("La duración debe ser un número entero en minutos.")
    .min(10, "La duración mínima es de 10 minutos.")
    .max(240, "La duración máxima es de 240 minutos."),
  appointmentType: z
    .string()
    .trim()
    .min(2, "Seleccione un tipo de atención válido.")
    .max(120, "El tipo de atención no debe exceder 120 caracteres."),
  reason: z.string().trim().max(300, "El motivo no debe exceder 300 caracteres."),
  status: z.enum(APPOINTMENT_STATUSES, {
    error: "Seleccione un estado válido.",
  }),
  notes: z.string().trim().max(1000, "Las notas no deben exceder 1000 caracteres."),
};

function validateScheduleBounds(
  data: { appointmentTime: string; durationMinutes: number },
  ctx: z.RefinementCtx
) {
  const start = parseTimeToMinutes(data.appointmentTime);
  if (start + data.durationMinutes > 24 * 60) {
    ctx.addIssue({
      code: "custom",
      path: ["durationMinutes"],
      message: "La cita no puede exceder las 24:00 del mismo día.",
    });
  }
}

export const createAppointmentSchema = z
  .object({
    patientId: pgUuidSchema("ID de paciente inválido.").optional(),
    quickPatient: quickNewPatientSchema.optional(),
    ...appointmentBaseFields,
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasPatientId = Boolean(data.patientId);
    const hasQuickPatient = Boolean(data.quickPatient);

    if (hasPatientId === hasQuickPatient) {
      ctx.addIssue({
        code: "custom",
        path: ["patientId"],
        message:
          "Debe seleccionar una paciente registrada o enviar datos de nueva paciente (no ambos).",
      });
    }

    validateScheduleBounds(data, ctx);
  });

export const updateAppointmentSchema = z
  .object({
    id: pgUuidSchema("ID de cita inválido."),
    patientId: pgUuidSchema("ID de paciente inválido."),
    ...appointmentBaseFields,
    reminderSent: z.boolean().optional(),
  })
  .strict()
  .superRefine(validateScheduleBounds);

export const quickPatchAppointmentSchema = z
  .object({
    id: pgUuidSchema("ID de cita inválido."),
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    reminderSent: z.boolean().optional(),
  })
  .strict()
  .refine(
    (v) => v.status !== undefined || v.reminderSent !== undefined,
    "Debe indicar estado o recordatorio a actualizar."
  );

export const deleteAppointmentSchema = z
  .object({
    id: pgUuidSchema("ID de cita inválido."),
  })
  .strict();

export type QuickNewPatientInput = z.infer<typeof quickNewPatientSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type QuickPatchAppointmentInput = z.infer<typeof quickPatchAppointmentSchema>;
