import { z } from "zod";
import type {
  ConsultationPhysicalExamRecord,
  ConsultationVitalSignsRecord,
} from "@/db/schema/clinical";
import type { CommercialBrandRecord } from "@/db/schema/catalogs";

export interface MedicalConsultationItem {
  id: string;
  patientId: string;
  appointmentId: string | null;
  doctorId: string | null;
  doctorName: string;
  doctorCmp: string;
  doctorRne: string;
  consultationDate: string;
  reasonForVisit: string;
  illnessTime: string;
  symptoms: string;
  vitalSigns: ConsultationVitalSignsRecord;
  physicalExam: ConsultationPhysicalExamRecord;
  diagnosis: string;
  cie10Code: string;
  treatmentPlan: string;
  auxiliaryExams: string;
  prescriptionNotes: string;
  nextAppointmentDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationActiveAppointment {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  reason: string;
  status: string;
  doctorName: string;
}

export interface ConsultationVademecumOption {
  id: string;
  genericName: string;
  therapeuticGroup: string;
  indications: string;
  commercialBrands: CommercialBrandRecord[];
}

export interface ConsultationLabTemplateOption {
  id: string;
  title: string;
  category: string;
  defaultTests: string[];
}

export interface ConsultationFormContext {
  activeAppointments: ConsultationActiveAppointment[];
  vademecumOptions: ConsultationVademecumOption[];
  labTemplates: ConsultationLabTemplateOption[];
}

export const NORMAL_PHYSICAL_EXAM_PRESET: ConsultationPhysicalExamRecord = {
  generalExam:
    "Paciente en buen estado general, lúcida, orientada en tiempo, espacio y persona, hidratada y afebril.",
  breastsExam:
    "Mamas simétricas, sin nódulos palpables, sin retracciones cutáneas ni secreción por pezón; axilas libres.",
  externalGenitalia:
    "Genitales externos con distribución pilosa ginecoide habitual, sin lesiones ni flogosis.",
  speculoscopy:
    "Vagina elástica de paredes normotróficas. Cérvix central, cerrado, epitelio liso sin sangrado activo.",
  bimanualPalpation:
    "Útero de tamaño y consistencia conservados, móvil, no doloroso a la movilización cervical. Anexos no palpables.",
};

export function calculateBmi(weightKg: number, heightCm: number): number {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm)) return 0;
  if (weightKg <= 0 || heightCm <= 0) return 0;
  const heightMeters = heightCm / 100;
  return Number((weightKg / (heightMeters * heightMeters)).toFixed(2));
}

export function classifyBmi(bmi: number): {
  label: string;
  tone: "normal" | "warning" | "destructive";
} {
  if (bmi < 18.5) return { label: "Bajo peso", tone: "warning" };
  if (bmi < 25) return { label: "Peso normal", tone: "normal" };
  if (bmi < 30) return { label: "Sobrepeso", tone: "warning" };
  if (bmi < 35) return { label: "Obesidad Grado I", tone: "destructive" };
  if (bmi < 40) return { label: "Obesidad Grado II", tone: "destructive" };
  return { label: "Obesidad Grado III", tone: "destructive" };
}

export function parseBloodPressure(
  bp: string
): { systolic: number; diastolic: number } | null {
  const match = bp.trim().match(/^(\d{2,3})\/(\d{2,3})$/);
  if (!match) return null;
  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2]),
  };
}

export function getVitalSignAlerts(
  vitals: ConsultationVitalSignsRecord
): Array<{ label: string; tone: "warning" | "destructive" }> {
  const alerts: Array<{ label: string; tone: "warning" | "destructive" }> = [];
  const parsedBp = parseBloodPressure(vitals.bloodPressure);
  if (parsedBp) {
    if (parsedBp.systolic >= 140 || parsedBp.diastolic >= 90) {
      alerts.push({ label: `PA elevada (${vitals.bloodPressure})`, tone: "destructive" });
    } else if (parsedBp.systolic < 90 || parsedBp.diastolic < 60) {
      alerts.push({ label: `PA baja (${vitals.bloodPressure})`, tone: "warning" });
    }
  }

  if (vitals.temperature >= 38.0) {
    alerts.push({ label: `Fiebre (${vitals.temperature} °C)`, tone: "destructive" });
  }
  if (
    typeof vitals.oxygenSaturation === "number" &&
    vitals.oxygenSaturation < 95
  ) {
    alerts.push({
      label: `SatO2 baja (${vitals.oxygenSaturation}%)`,
      tone: "destructive",
    });
  }
  if (vitals.heartRate > 100 || vitals.heartRate < 55) {
    alerts.push({
      label: `FC alterada (${vitals.heartRate} lpm)`,
      tone: "warning",
    });
  }

  return alerts;
}

const pgUuidSchema = (message: string) =>
  z
    .string()
    .trim()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      message
    );

export const vitalSignsInputSchema = z
  .object({
    bloodPressure: z
      .string()
      .trim()
      .regex(/^\d{2,3}\/\d{2,3}$/, "Presión arterial inválida (ej. 110/70)."),
    heartRate: z.coerce
      .number({ error: "Ingrese la frecuencia cardíaca." })
      .int("F.C. debe ser un número entero.")
      .min(30, "F.C. mínima: 30 lpm.")
      .max(220, "F.C. máxima: 220 lpm."),
    respiratoryRate: z.coerce
      .number({ error: "F.R. inválida." })
      .int("F.R. debe ser un número entero.")
      .min(8, "F.R. mínima: 8 rpm.")
      .max(60, "F.R. máxima: 60 rpm.")
      .optional(),
    temperature: z.coerce
      .number({ error: "Ingrese la temperatura." })
      .min(34, "Temperatura mínima: 34 °C.")
      .max(43, "Temperatura máxima: 43 °C."),
    oxygenSaturation: z.coerce
      .number({ error: "SatO2 inválida." })
      .int("SatO2 debe ser entero.")
      .min(50, "SatO2 mínima: 50%.")
      .max(100, "SatO2 máxima: 100%.")
      .optional(),
    weightKg: z.coerce
      .number({ error: "Ingrese el peso en kg." })
      .min(20, "Peso mínimo: 20 kg.")
      .max(300, "Peso máximo: 300 kg."),
    heightCm: z.coerce
      .number({ error: "Ingrese la talla en cm." })
      .min(80, "Talla mínima: 80 cm.")
      .max(240, "Talla máxima: 240 cm."),
    bmi: z.coerce.number().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const parsed = parseBloodPressure(data.bloodPressure);
    if (!parsed) return;

    if (parsed.systolic < 60 || parsed.systolic > 260) {
      ctx.addIssue({
        code: "custom",
        path: ["bloodPressure"],
        message: "La presión sistólica debe estar entre 60 y 260 mmHg.",
      });
    }
    if (parsed.diastolic < 30 || parsed.diastolic > 160) {
      ctx.addIssue({
        code: "custom",
        path: ["bloodPressure"],
        message: "La presión diastólica debe estar entre 30 y 160 mmHg.",
      });
    }
    if (parsed.systolic <= parsed.diastolic) {
      ctx.addIssue({
        code: "custom",
        path: ["bloodPressure"],
        message: "La presión sistólica debe ser mayor a la diastólica.",
      });
    }
  });

export const physicalExamInputSchema = z
  .object({
    generalExam: z.string().trim().max(1000),
    breastsExam: z.string().trim().max(1000),
    externalGenitalia: z.string().trim().max(1000),
    speculoscopy: z.string().trim().max(1000),
    bimanualPalpation: z.string().trim().max(1000),
  })
  .strict();

const optionalDateSchema = z
  .string()
  .trim()
  .refine((val) => val === "" || /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: "Formato de fecha inválido (YYYY-MM-DD).",
  });

const consultationCoreShape = {
  patientId: pgUuidSchema("ID de paciente inválido."),
  appointmentId: pgUuidSchema("ID de cita inválido.").nullable().optional(),
  consultationDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Seleccione fecha válida (YYYY-MM-DD)."),
  reasonForVisit: z
    .string()
    .trim()
    .min(3, "El motivo de consulta es obligatorio (mínimo 3 caracteres).")
    .max(300),
  illnessTime: z.string().trim().max(120),
  symptoms: z.string().trim().max(2000),
  vitalSigns: vitalSignsInputSchema,
  physicalExam: physicalExamInputSchema,
  diagnosis: z
    .string()
    .trim()
    .min(3, "El diagnóstico clínico es obligatorio.")
    .max(500),
  cie10Code: z
    .string()
    .trim()
    .max(15)
    .transform((val) => val.trim().toUpperCase()),
  treatmentPlan: z
    .string()
    .trim()
    .min(3, "El plan terapéutico es obligatorio.")
    .max(3000),
  auxiliaryExams: z.string().trim().max(2000),
  prescriptionNotes: z.string().trim().max(2000),
  nextAppointmentDate: optionalDateSchema,
};

export const createConsultationSchema = z
  .object({
    ...consultationCoreShape,
    markAppointmentAttended: z.boolean().default(false),
    generatePrescription: z.boolean().default(false),
    generateLabOrder: z.boolean().default(false),
  })
  .strict();

export const updateConsultationSchema = z
  .object({
    id: pgUuidSchema("ID de consulta inválido."),
    ...consultationCoreShape,
  })
  .strict();

export const deleteConsultationSchema = z
  .object({
    id: pgUuidSchema("ID de consulta inválido."),
  })
  .strict();

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;
export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>;
export type DeleteConsultationInput = z.infer<typeof deleteConsultationSchema>;
