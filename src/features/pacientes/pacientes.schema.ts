import { z } from "zod";
import { pgUuidSchema } from "@/features/configuracion/configuracion.schema";

export const DOCUMENT_TYPES = ["DNI", "CE", "Pasaporte"] as const;

export interface PatientBackgroundItem {
  id: string;
  patientId: string;
  menarche: number | null;
  sexualDebutAge: number | null;
  sexualPartnersCount: number | null;
  catamenialRegimen: string;
  stiHistory: string;
  obstetricFormula: string;
  contraceptiveMethod: string;
  lastMenstrualPeriod: string;
  papHistory: string;
  vphTestHistory: string;
  hasDiabetes: string;
  hasHypertension: string;
  hasAsthma: string;
  medicalAllergies: string;
  surgeriesHistory: string;
  familyHistory: string;
  otherPathologies: string;
  notes: string;
  updatedAt: string;
}

export interface PatientDirectoryItem {
  id: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  birthDate: string;
  age: number;
  phone: string;
  email: string;
  address: string;
  district: string;
  civilStatus: string;
  occupation: string;
  educationLevel: string;
  birthPlace: string;
  religion: string;
  insuranceInfo: string;
  obstetricFormula: string;
  medicalAllergies: string;
  lastMenstrualPeriod: string;
  nextAppointmentDate: string | null;
  nextAppointmentTime: string | null;
  consultationsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PatientClinicalCounts {
  appointments: number;
  consultations: number;
  checkups: number;
  prescriptions: number;
  labOrders: number;
  quotes: number;
  colposcopies: number;
  ultrasounds: number;
  procedures: number;
  prenatalCards: number;
  documents: number;
}

export interface PatientDetailData {
  patient: PatientDirectoryItem;
  background: PatientBackgroundItem | null;
  counts: PatientClinicalCounts;
}

const optionalDateString = z
  .string()
  .trim()
  .refine((val) => val === "" || /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: "Formato de fecha inválido (debe ser YYYY-MM-DD).",
  });

const optionalNullableInt = (min: number, max: number, label: string) =>
  z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return null;
      const num = Number(val);
      return Number.isNaN(num) ? val : num;
    },
    z
      .number({ error: `${label} debe ser un número entero.` })
      .int(`${label} debe ser un número entero.`)
      .min(min, `${label} mínima: ${min}.`)
      .max(max, `${label} máxima: ${max}.`)
      .nullable()
  );

const patientBaseShape = {
  documentType: z.enum(DOCUMENT_TYPES, {
    error: "Seleccione un tipo de documento válido.",
  }),
  documentNumber: z
    .string()
    .trim()
    .min(6, "El número de documento debe tener al menos 6 caracteres.")
    .max(20, "El número de documento no debe exceder 20 caracteres.")
    .transform((val) => val.trim().toUpperCase()),
  firstName: z
    .string()
    .trim()
    .min(2, "Los nombres de la paciente son obligatorios (mínimo 2 letras).")
    .max(120)
    .transform((val) => val.trim().toUpperCase()),
  lastName: z
    .string()
    .trim()
    .min(2, "Los apellidos de la paciente son obligatorios (mínimo 2 letras).")
    .max(120)
    .transform((val) => val.trim().toUpperCase()),
  birthDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Seleccione una fecha de nacimiento válida (YYYY-MM-DD)."),
  phone: z
    .string()
    .trim()
    .min(6, "Ingrese un teléfono o celular válido (mínimo 6 dígitos).")
    .max(30),
  email: z
    .string()
    .trim()
    .max(150)
    .refine((val) => val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Ingrese un correo electrónico válido.",
    }),
  address: z.string().trim().max(250),
  district: z.string().trim().min(2, "Indique el distrito de residencia.").max(100),
  civilStatus: z.string().trim().min(2).max(60),
  occupation: z.string().trim().max(120),
  educationLevel: z.string().trim().min(2).max(120),
  birthPlace: z.string().trim().max(120),
  religion: z.string().trim().max(80),
  insuranceInfo: z.string().trim().min(2).max(120),
};

function validateDocumentFormat(
  data: { documentType: (typeof DOCUMENT_TYPES)[number]; documentNumber: string },
  ctx: z.RefinementCtx
) {
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
}

export const patientInputSchema = z
  .object(patientBaseShape)
  .strict()
  .superRefine(validateDocumentFormat);

export const updatePatientSchema = z
  .object({
    id: pgUuidSchema("ID de paciente inválido."),
    ...patientBaseShape,
  })
  .strict()
  .superRefine(validateDocumentFormat);

export const deletePatientSchema = z
  .object({
    id: pgUuidSchema("ID de paciente inválido."),
  })
  .strict();

export const patientBackgroundInputSchema = z
  .object({
    patientId: pgUuidSchema("ID de paciente inválido."),
    obstetricFormula: z
      .string()
      .trim()
      .min(2, "La fórmula obstétrica es requerida (ej. G0 P0000).")
      .max(30)
      .transform((val) => val.trim().toUpperCase()),
    menarche: optionalNullableInt(8, 22, "Edad de menarquia"),
    sexualDebutAge: optionalNullableInt(10, 45, "Edad de inicio sexual"),
    sexualPartnersCount: optionalNullableInt(0, 100, "Número de parejas sexuales"),
    catamenialRegimen: z.string().trim().max(40),
    stiHistory: z.string().trim().max(300),
    contraceptiveMethod: z.string().trim().min(1, "Seleccione el método anticonceptivo.").max(150),
    lastMenstrualPeriod: optionalDateString,
    papHistory: z.string().trim().max(300),
    vphTestHistory: z.string().trim().max(300),
    hasDiabetes: z.string().trim().max(120),
    hasHypertension: z.string().trim().max(120),
    hasAsthma: z.string().trim().max(120),
    medicalAllergies: z.string().trim().max(400),
    surgeriesHistory: z.string().trim().max(500),
    familyHistory: z.string().trim().max(500),
    otherPathologies: z.string().trim().max(500),
    notes: z.string().trim().max(1000),
  })
  .strict();

export type PatientInput = z.infer<typeof patientInputSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientBackgroundInput = z.infer<typeof patientBackgroundInputSchema>;
