import { z } from "zod";
import type {
  MinorProcedureDetailsRecord,
  ProcedurePathologyStatus,
} from "@/db/schema/specialty";
import { pgUuidSchema } from "@/features/configuracion/configuracion.schema";

export const PROCEDURE_TYPES = [
  "BIOPSIA_CERVICAL",
  "BIOPSIA_ENDOMETRIAL",
  "CONO_LEEP",
  "POLIPECTOMIA",
  "INSERCION_DIU",
  "RETIRO_DIU",
  "INSERCION_IMPLANTE",
  "RETIRO_IMPLANTE",
  "OTRO",
] as const;

export type ProcedureType = (typeof PROCEDURE_TYPES)[number];

export const PROCEDURE_TYPE_LABELS: Record<ProcedureType, string> = {
  BIOPSIA_CERVICAL: "Biopsia Cervical Dirigida por Colposcopía",
  BIOPSIA_ENDOMETRIAL: "Biopsia Endometrial Aspirativa (Cánula de Pipelle)",
  CONO_LEEP: "Cono LEEP con Asa Diatérmica (Escisión Cervical)",
  POLIPECTOMIA: "Polipectomía Cervical / Endocervical",
  INSERCION_DIU: "Inserción de DIU / SIU (Mirena / Kyleena / T de Cobre)",
  RETIRO_DIU: "Retiro de DIU / SIU",
  INSERCION_IMPLANTE: "Inserción de Implante Subdérmico (Nexplanon / Jadelle)",
  RETIRO_IMPLANTE: "Retiro de Implante Subdérmico",
  OTRO: "Otro Procedimiento Menor Ginecológico",
};

export const PROCEDURE_TYPE_SHORT_LABELS: Record<ProcedureType, string> = {
  BIOPSIA_CERVICAL: "Biopsia Cervical",
  BIOPSIA_ENDOMETRIAL: "Biopsia Pipelle",
  CONO_LEEP: "Cono LEEP",
  POLIPECTOMIA: "Polipectomía",
  INSERCION_DIU: "Inserción DIU/SIU",
  RETIRO_DIU: "Retiro DIU/SIU",
  INSERCION_IMPLANTE: "Inserción Implante",
  RETIRO_IMPLANTE: "Retiro Implante",
  OTRO: "Otro Procedimiento",
};

export const ANESTHESIA_OPTIONS = [
  "Local (Lidocaína 2%)",
  "Infiltración Paracervical (Lidocaína 2%)",
  "Tópica (Spray / Gel Lidocaína 10%)",
  "Sedación",
  "Sin Anestesia",
] as const;

export const BLEEDING_OPTIONS = [
  "Mínimo (< 10 ml)",
  "Escaso (10 - 30 ml)",
  "Moderado",
] as const;

export const HEMOSTASIS_OPTIONS = [
  "Solución de Monsel",
  "Electrocoagulación",
  "Electrocoagulación + Solución de Monsel",
  "Compresión",
  "Sutura",
] as const;

export const PATHOLOGY_STATUS_OPTIONS = [
  "NO_APLICA",
  "PENDIENTE",
  "RECIBIDO",
] as const;

export const PATHOLOGY_STATUS_LABELS: Record<ProcedurePathologyStatus, string> =
  {
    NO_APLICA: "No requiere patología",
    PENDIENTE: "Pendiente de resultado (En estudio)",
    RECIBIDO: "Resultado recibido y evaluado",
  };

export function isContraceptiveDeviceProcedure(type: ProcedureType): boolean {
  return (
    type === "INSERCION_DIU" ||
    type === "RETIRO_DIU" ||
    type === "INSERCION_IMPLANTE" ||
    type === "RETIRO_IMPLANTE"
  );
}

export function resolveSuggestedMacFromProcedure(
  type: ProcedureType,
  deviceInfo?: string
): string | null {
  if (type === "INSERCION_DIU") {
    const upper = (deviceInfo ?? "").toUpperCase();
    if (upper.includes("MIRENA") || upper.includes("KYLEENA") || upper.includes("SIU")) {
      return "SIU Hormonal (Mirena / Kyleena)";
    }
    return "DIU";
  }
  if (type === "INSERCION_IMPLANTE") {
    return "Implante subdérmico";
  }
  if (type === "RETIRO_DIU" || type === "RETIRO_IMPLANTE") {
    return "Ninguno";
  }
  return null;
}

export interface MinorProcedureItem {
  id: string;
  patientId: string;
  consultationId: string | null;
  doctorId: string | null;
  doctorName: string;
  doctorCmp: string;
  doctorRne: string;
  procedureDate: string;
  procedureType: ProcedureType;
  preOpDiagnosis: string;
  postOpDiagnosis: string;
  cie10Code: string;
  anesthesiaType: string;
  procedureDetails: MinorProcedureDetailsRecord;
  postOpIndications: string;
  medicationsPrescribed: string;
  nextControlDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface MinorProcedurePreset {
  id: string;
  label: string;
  procedureType: ProcedureType;
  preOpDiagnosis: string;
  postOpDiagnosis: string;
  cie10Code: string;
  anesthesiaType: string;
  procedureDetails: MinorProcedureDetailsRecord;
  postOpIndications: string;
  medicationsPrescribed: string;
}

export const PROCEDURE_PRESETS: MinorProcedurePreset[] = [
  {
    id: "proc-biopsia-cervical",
    label: "1. Biopsia Cervical",
    procedureType: "BIOPSIA_CERVICAL",
    preOpDiagnosis: "Lesión cervical acetoblanca en evaluación colposcópica IFCPC",
    postOpDiagnosis:
      "Biopsia cervical dirigida tomada con pinza sacabocados de Tischler-Morgan",
    cie10Code: "N87.0",
    anesthesiaType: "Local (Lidocaína 2%)",
    procedureDetails: {
      asepsisTechnique:
        "Asepsia y antisepsia vulvovaginal con solución acuosa de clorhexidina / yodopovidona. Colocación de espéculo estéril y visualización colposcópica.",
      biopsySites: "Cérvix uterino en labio anterior (H12) y posterior (H6).",
      specimenSentToPathology: true,
      specimenDescription:
        "Fragmentos tisulares de cérvix fijados en formol tamponado al 10%, rotulados para Anatomía Patológica (BIOLAQ).",
      bleedingAmount: "Mínimo (< 10 ml)",
      hemostasisMethod: "Solución de Monsel",
      complications:
        "Ninguna. Procedimiento ambulatorio tolerado satisfactoriamente.",
      informedConsentConfirmed: true,
      deviceInfo: "",
      pathologyStatus: "PENDIENTE",
      pathologyResultNotes: "",
    },
    postOpIndications: `1. No realizar esfuerzos físicos intensos ni levantar peso por 72 horas.
2. Abstinencia sexual estricta por 7 a 10 días.
3. No utilizar tampones, copas menstruales ni duchas vaginales.
4. Es normal observar un flujo oscuro o grumos color café (efecto hemostático de la solución de Monsel).
5. Acudir de inmediato ante sangrado rojo vivo mayor a una menstruación o fiebre > 38 °C.`,
    medicationsPrescribed:
      "Paracetamol 500 mg vía oral cada 8 horas por 48 horas condicional a dolor pélvico.",
  },
  {
    id: "proc-biopsia-pipelle",
    label: "2. Biopsia Pipelle",
    procedureType: "BIOPSIA_ENDOMETRIAL",
    preOpDiagnosis: "Sangrado uterino anormal / Engrosamiento endometrial en estudio",
    postOpDiagnosis:
      "Biopsia endometrial aspirativa realizada con cánula de Pipelle de Cornier",
    cie10Code: "N93.9",
    anesthesiaType: "Tópica (Spray / Gel Lidocaína 10%)",
    procedureDetails: {
      asepsisTechnique:
        "Antisepsia cérvico-vaginal con solución antiséptica. Histerometría previa e introducción atraumática de cánula flexible de Pipelle.",
      biopsySites:
        "Cavidad endometrial (muestreo aspirativo en 4 cuadrantes de fondo a istmo).",
      specimenSentToPathology: true,
      specimenDescription:
        "Cilindros de tejido endometrial en frasco con formol tamponado al 10% rotulado Biopsia Endometrial CENDO.",
      bleedingAmount: "Mínimo (< 10 ml)",
      hemostasisMethod: "Compresión",
      complications:
        "Ninguna. Leve cólico uterino transitorio que cede espontáneamente.",
      informedConsentConfirmed: true,
      deviceInfo: "",
      pathologyStatus: "PENDIENTE",
      pathologyResultNotes: "",
    },
    postOpIndications: `1. Reposo relativo en domicilio por 24 horas.
2. Abstinencia sexual por 5 a 7 días.
3. Un cólico leve tipo menstrual y manchado escaso son esperables durante las primeras 48 horas.
4. Acudir a control con resultado de Anatomía Patológica.
5. Signos de alarma: fiebre, flujo maloliente o sangrado abundante con coágulos.`,
    medicationsPrescribed:
      "Naproxeno sódico 550 mg vía oral cada 12 horas por 2 días con alimentos.",
  },
  {
    id: "proc-cono-leep",
    label: "3. Cono LEEP",
    procedureType: "CONO_LEEP",
    preOpDiagnosis:
      "Lesión intraepitelial escamosa de alto grado (LIE-AG / NIC II - NIC III)",
    postOpDiagnosis:
      "Conización cervical electroquirúrgica con asa diatérmica (Cono LEEP)",
    cie10Code: "N87.1",
    anesthesiaType: "Infiltración Paracervical (Lidocaína 2%)",
    procedureDetails: {
      asepsisTechnique:
        "Antisepsia vulvovaginal rigurosa, colocación de espéculo aislado con extractor de humo, delimitación con Lugol e infiltración cervical en H3, H6, H9 y H12.",
      biopsySites:
        "Zona de transformación cervical completa (exéresis en pieza única con asa diatérmica).",
      specimenSentToPathology: true,
      specimenDescription:
        "Pieza de cono cervical en formol al 10% con reparo anatómico en hora 12:00 para estudio de márgenes quirúrgicos.",
      bleedingAmount: "Escaso (10 - 30 ml)",
      hemostasisMethod: "Electrocoagulación + Solución de Monsel",
      complications:
        "Ninguna. Lecho quirúrgico cervical hemostático al término del procedimiento.",
      informedConsentConfirmed: true,
      deviceInfo: "",
      pathologyStatus: "PENDIENTE",
      pathologyResultNotes: "",
    },
    postOpIndications: `1. Reposo relativo en domicilio por 48 a 72 horas (evitar esfuerzos físicos, ejercicios y cargar peso por 3 semanas).
2. Abstinencia sexual absoluta por 4 semanas (hasta cicatrización completa del cérvix).
3. No usar tampones ni sumergirse en tinas, piscinas o mar durante 4 semanas.
4. Es normal presentar flujo serosanguinolento o marrón oscuro los primeros 10 a 14 días.
5. Acudir por urgencia si presenta sangrado rojo rutilante abundante, coágulos o fiebre.`,
    medicationsPrescribed:
      "Ketorolaco 10 mg VO c/8h por 3 días + Óvulos cicatrizantes / regeneradores epiteliales según indicación en control.",
  },
  {
    id: "proc-polipectomia",
    label: "4. Polipectomía",
    procedureType: "POLIPECTOMIA",
    preOpDiagnosis: "Pólipo cervical / endocervical sintomático",
    postOpDiagnosis:
      "Polipectomía cervical por torsión de pedículo y hemostasia de base",
    cie10Code: "N84.1",
    anesthesiaType: "Tópica (Spray / Gel Lidocaína 10%)",
    procedureDetails: {
      asepsisTechnique:
        "Antisepsia cérvico-vaginal con solución antiséptica, identificación de base pediculada con pinza Foerster y exéresis completa por torsión.",
      biopsySites: "Canal endocervical / Orificio cervical externo.",
      specimenSentToPathology: true,
      specimenDescription:
        "Formación polipoide cervical íntegra fijada en formol al 10% remitida a Anatomía Patológica.",
      bleedingAmount: "Mínimo (< 10 ml)",
      hemostasisMethod: "Solución de Monsel",
      complications:
        "Ninguna. Base de implantación sin sangrado activo.",
      informedConsentConfirmed: true,
      deviceInfo: "",
      pathologyStatus: "PENDIENTE",
      pathologyResultNotes: "",
    },
    postOpIndications: `1. Reposo relativo por 24 horas.
2. Abstinencia sexual por 7 días.
3. Manchado oscuro escaso por 2 a 4 días es normal.
4. Control en consultorio con resultado histopatológico.`,
    medicationsPrescribed:
      "Ibuprofeno 400 mg vía oral cada 8 horas por 48 horas condicional a molestia pélvica.",
  },
  {
    id: "proc-insercion-diu",
    label: "5. Inserción DIU / SIU",
    procedureType: "INSERCION_DIU",
    preOpDiagnosis: "Consejería y solicitud de anticoncepción intrauterina de larga duración",
    postOpDiagnosis:
      "Inserción normotópica de Dispositivo Intrauterino (DIU / SIU) sin complicaciones",
    cie10Code: "Z30.1",
    anesthesiaType: "Tópica (Spray / Gel Lidocaína 10%)",
    procedureDetails: {
      asepsisTechnique:
        "Antisepsia cérvico-vaginal, pinzamiento suave de labio anterior con Pozzi, histerometría previa e inserción fúndica con técnica estéril.",
      biopsySites: "Cavidad uterina (Histerometría: 7.0 cm • Hilos recortados a 2 cm de OCE).",
      specimenSentToPathology: false,
      specimenDescription: "",
      bleedingAmount: "Mínimo (< 10 ml)",
      hemostasisMethod: "Compresión",
      complications:
        "Ninguna. Dispositivo correctamente posicionado en cavidad uterina.",
      informedConsentConfirmed: true,
      deviceInfo: "SIU Levonorgestrel 52 mg (Mirena) / T de Cobre 380A • Vigencia: 5 años",
      pathologyStatus: "NO_APLICA",
      pathologyResultNotes: "",
    },
    postOpIndications: `1. Abstinencia sexual y no usar tampones durante las primeras 48 horas.
2. Es esperable presentar cólicos leves y manchado intermitente (spotting) durante las primeras semanas.
3. Acudir a control ecográfico transvaginal en 4 semanas para confirmar ubicación fúndica del dispositivo.
4. Consultar ante fiebre, dolor pélvico intenso o expulsión parcial.`,
    medicationsPrescribed:
      "Naproxeno sódico 550 mg vía oral cada 12 horas por 2 a 3 días si presenta cólico uterino.",
  },
  {
    id: "proc-retiro-diu",
    label: "6. Retiro DIU / SIU",
    procedureType: "RETIRO_DIU",
    preOpDiagnosis: "Portadora de DIU / SIU que acude para retiro electivo o recambio",
    postOpDiagnosis:
      "Extracción completa e íntegra de Dispositivo Intrauterino (DIU / SIU)",
    cie10Code: "Z30.5",
    anesthesiaType: "Sin Anestesia",
    procedureDetails: {
      asepsisTechnique:
        "Especuloscopía estéril, antisepsia cervical, visualización de hilos guías y tracción suave continua con pinza Bozeman.",
      biopsySites: "Cavidad uterina / Canal endocervical.",
      specimenSentToPathology: false,
      specimenDescription: "",
      bleedingAmount: "Mínimo (< 10 ml)",
      hemostasisMethod: "Compresión",
      complications:
        "Ninguna. Se verifica integridad completa del dispositivo extraído.",
      informedConsentConfirmed: true,
      deviceInfo: "DIU / SIU extraído íntegro",
      pathologyStatus: "NO_APLICA",
      pathologyResultNotes: "",
    },
    postOpIndications: `1. Actividad habitual sin restricciones.
2. La fertilidad se recupera de inmediato; iniciar método anticonceptivo alternativo si no desea gestación.
3. Manchado leve por 24 horas es normal.`,
    medicationsPrescribed: "No requiere medicación analgésica de rutina.",
  },
  {
    id: "proc-insercion-implante",
    label: "7. Inserción Implante",
    procedureType: "INSERCION_IMPLANTE",
    preOpDiagnosis: "Solicitud de anticoncepción subdérmica hormonal de larga duración",
    postOpDiagnosis:
      "Inserción subdérmica de implante anticonceptivo de Etonogestrel (Nexplanon 68 mg)",
    cie10Code: "Z30.0",
    anesthesiaType: "Local (Lidocaína 2%)",
    procedureDetails: {
      asepsisTechnique:
        "Antisepsia de cara interna de brazo no dominante con clorhexidina al 2%, infiltración subdérmica de 2 ml de lidocaína al 2% e inserción con aplicador estéril.",
      biopsySites:
        "Cara interna de brazo izquierdo (8-10 cm por encima del epicóndilo medial, sobre el surco bicipital).",
      specimenSentToPathology: false,
      specimenDescription: "",
      bleedingAmount: "Mínimo (< 10 ml)",
      hemostasisMethod: "Compresión",
      complications:
        "Ninguna. Se comprueba presencia subdérmica del implante por palpación por el médico y la paciente.",
      informedConsentConfirmed: true,
      deviceInfo: "Implante Etonogestrel 68 mg (Nexplanon) • Vigencia: 3 años",
      pathologyStatus: "NO_APLICA",
      pathologyResultNotes: "",
    },
    postOpIndications: `1. Mantener el vendaje compresivo seco durante 24 horas y las tiras adhesivas por 3 a 5 días.
2. Evitar golpes o levantar peso excesivo con ese brazo durante 48 horas.
3. Un pequeño hematoma o equimosis local es normal y desaparece en 7 a 10 días.
4. Usar método de barrera (preservativo) por 7 días si se colocó fuera de los primeros 5 días del ciclo.`,
    medicationsPrescribed:
      "Paracetamol 500 mg vía oral cada 8 horas por 24 a 48 horas si presenta dolor local en brazo.",
  },
  {
    id: "proc-retiro-implante",
    label: "8. Retiro Implante",
    procedureType: "RETIRO_IMPLANTE",
    preOpDiagnosis:
      "Portadora de implante subdérmico que acude por cumplimiento de vigencia o deseo reproductivo",
    postOpDiagnosis:
      "Retiro quirúrgico ambulatorio de implante anticonceptivo subdérmico íntegro",
    cie10Code: "Z30.4",
    anesthesiaType: "Local (Lidocaína 2%)",
    procedureDetails: {
      asepsisTechnique:
        "Localización por palpación del extremo distal, antisepsia con clorhexidina 2%, infiltración de 1 ml de lidocaína 2% bajo el extremo inferior, microincisión de 2 mm y extracción con pinza mosquito.",
      biopsySites: "Cara interna de brazo no dominante.",
      specimenSentToPathology: false,
      specimenDescription: "",
      bleedingAmount: "Mínimo (< 10 ml)",
      hemostasisMethod: "Compresión",
      complications:
        "Ninguna. Implante extraído completo (4 cm). Afrontamiento con tiras estériles y vendaje compresivo.",
      informedConsentConfirmed: true,
      deviceInfo: "Implante subdérmico extraído íntegro",
      pathologyStatus: "NO_APLICA",
      pathologyResultNotes: "",
    },
    postOpIndications: `1. Mantener vendaje compresivo por 24 horas y curita limpia y seca por 3 a 5 días.
2. La fertilidad se reanuda de forma inmediata tras el retiro.
3. Acudir ante enrojecimiento o dolor persistente en la zona de microincisión.`,
    medicationsPrescribed:
      "Paracetamol 500 mg vía oral cada 8 horas condicional a dolor local.",
  },
  {
    id: "proc-otro",
    label: "9. Otro Procedimiento",
    procedureType: "OTRO",
    preOpDiagnosis: "Patología ginecológica benigna de resolución ambulatoria",
    postOpDiagnosis:
      "Procedimiento menor ginecológico realizado en consultorio sin complicaciones",
    cie10Code: "N89.8",
    anesthesiaType: "Local (Lidocaína 2%)",
    procedureDetails: {
      asepsisTechnique:
        "Asepsia y antisepsia local con solución antiséptica y campos estériles.",
      biopsySites: "Región vulvovaginal / perineal / cervical.",
      specimenSentToPathology: false,
      specimenDescription: "",
      bleedingAmount: "Mínimo (< 10 ml)",
      hemostasisMethod: "Compresión",
      complications:
        "Ninguna. Paciente egresa estable y sin dolor agudo.",
      informedConsentConfirmed: true,
      deviceInfo: "",
      pathologyStatus: "NO_APLICA",
      pathologyResultNotes: "",
    },
    postOpIndications: `1. Reposo relativo por 24 a 48 horas.
2. Mantener la zona limpia y seca según indicación.
3. Acudir a control programado en consultorio.`,
    medicationsPrescribed:
      "Analgésico / antiinflamatorio oral según prescripción médica.",
  },
];

export const procedureDetailsSchema = z
  .object({
    asepsisTechnique: z
      .string()
      .trim()
      .min(3, "Describa la técnica de asepsia y procedimiento.")
      .max(1500),
    biopsySites: z.string().trim().max(500).optional().or(z.literal("")),
    specimenSentToPathology: z.boolean(),
    specimenDescription: z.string().trim().max(800).optional().or(z.literal("")),
    bleedingAmount: z.string().trim().min(2).max(80),
    hemostasisMethod: z.string().trim().min(2).max(100),
    complications: z.string().trim().min(2).max(800),
    informedConsentConfirmed: z.boolean().optional(),
    deviceInfo: z.string().trim().max(300).optional().or(z.literal("")),
    pathologyStatus: z.enum(PATHOLOGY_STATUS_OPTIONS).optional(),
    pathologyResultNotes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .strict();

const baseMinorProcedureSchema = z.object({
  patientId: pgUuidSchema("ID de paciente inválido."),
  consultationId: pgUuidSchema("ID de consulta inválido.")
    .optional()
    .or(z.literal("")),
  procedureDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)."),
  procedureType: z.enum(PROCEDURE_TYPES, {
    error: "Seleccione el tipo de procedimiento menor.",
  }),
  preOpDiagnosis: z
    .string()
    .trim()
    .min(3, "El diagnóstico pre-operatorio es obligatorio.")
    .max(500),
  postOpDiagnosis: z
    .string()
    .trim()
    .min(3, "El diagnóstico post-operatorio es obligatorio.")
    .max(500),
  cie10Code: z.string().trim().max(15).optional().or(z.literal("")),
  anesthesiaType: z
    .string()
    .trim()
    .min(2, "Seleccione el tipo de anestesia.")
    .max(100),
  procedureDetails: procedureDetailsSchema,
  postOpIndications: z
    .string()
    .trim()
    .min(3, "Las indicaciones post-operatorias son obligatorias.")
    .max(2500),
  medicationsPrescribed: z.string().trim().max(1000).optional().or(z.literal("")),
  nextControlDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de control inválida (YYYY-MM-DD).")
    .optional()
    .or(z.literal("")),
  syncPatientMac: z.boolean().optional(),
});

export const createMinorProcedureSchema = baseMinorProcedureSchema.strict();

export const updateMinorProcedureSchema = baseMinorProcedureSchema
  .extend({
    id: pgUuidSchema("ID de procedimiento inválido."),
  })
  .strict();

export const deleteMinorProcedureSchema = z
  .object({
    id: pgUuidSchema("ID de procedimiento inválido."),
  })
  .strict();

export const listMinorProceduresSchema = z
  .object({
    patientId: pgUuidSchema("ID de paciente inválido."),
  })
  .strict();

export type CreateMinorProcedureInput = z.infer<
  typeof createMinorProcedureSchema
>;
export type UpdateMinorProcedureInput = z.infer<
  typeof updateMinorProcedureSchema
>;
