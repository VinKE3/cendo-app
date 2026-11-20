"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { CatalogCategoryItem } from "@/features/catalog-categories/catalog-categories.schema";
import { useCatalogCategories } from "@/features/catalog-categories/hooks/use-catalog-categories";
import type { LabOrderItem } from "@/features/laboratorio/laboratorio.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import type { MedicalPrescriptionItem } from "@/features/recetas/recetas.schema";
import { usePagination } from "@/hooks/use-pagination";
import { getPeruDateString } from "@/lib/utils";
import {
  calculateBmi,
  classifyBmi,
  getVitalSignAlerts,
  NORMAL_PHYSICAL_EXAM_PRESET,
  parseBloodPressure,
  type ConsultationFormContext,
  type DraftLabOrderForConsultation,
  type DraftPrescriptionForConsultation,
  type MedicalConsultationItem,
} from "../consultas.schema";
import {
  createConsultationAction,
  deleteConsultationAction,
  updateConsultationAction,
} from "../actions/consultas.actions";

const pgUuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function addOffsetToIsoDate(
  baseIso: string,
  offset: { days?: number; months?: number }
): string {
  const clean = /^\d{4}-\d{2}-\d{2}$/.test(baseIso) ? baseIso : getPeruDateString();
  const [y, m, d] = clean.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (offset.days) {
    dt.setUTCDate(dt.getUTCDate() + offset.days);
  }
  if (offset.months) {
    const targetMonth = dt.getUTCMonth() + offset.months;
    const origDay = dt.getUTCDate();
    dt.setUTCDate(1);
    dt.setUTCMonth(targetMonth);
    const lastDayOfMonth = new Date(
      Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)
    ).getUTCDate();
    dt.setUTCDate(Math.min(origDay, lastDayOfMonth));
  }
  return dt.toISOString().slice(0, 10);
}

function toOptionalPositiveNumber(raw: string): number | undefined {
  const clean = raw.trim();
  if (!clean) return undefined;
  const num = Number(clean);
  return Number.isFinite(num) ? num : undefined;
}

const consultationModalFormSchema = z
  .object({
    appointmentId: z.string().trim(),
    markAppointmentAttended: z.boolean(),
    consultationDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Seleccione una fecha válida."),
    reasonForVisit: z
      .string()
      .trim()
      .min(3, "El motivo de consulta es obligatorio (mínimo 3 caracteres).")
      .max(300),
    illnessTime: z.string().trim().max(120),
    symptoms: z.string().trim().max(2000),
    bloodPressure: z.string().trim().max(15),
    heartRate: z.string().trim(),
    respiratoryRate: z.string().trim(),
    temperature: z.string().trim(),
    oxygenSaturation: z.string().trim(),
    weightKg: z.string().trim(),
    heightCm: z.string().trim(),
    generalExam: z.string().trim().max(1000),
    breastsExam: z.string().trim().max(1000),
    externalGenitalia: z.string().trim().max(1000),
    speculoscopy: z.string().trim().max(1000),
    bimanualPalpation: z.string().trim().max(1000),
    diagnosis: z
      .string()
      .trim()
      .min(3, "El diagnóstico clínico es obligatorio.")
      .max(500),
    cie10Code: z.string().trim().max(15),
    treatmentPlan: z
      .string()
      .trim()
      .min(3, "El plan terapéutico es obligatorio.")
      .max(3000),
    auxiliaryExams: z.string().trim().max(2000),
    prescriptionNotes: z.string().trim().max(2000),
    nextAppointmentDate: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), {
        message: "Fecha inválida.",
      }),
    scheduleNextAppointment: z.boolean(),
    nextAppointmentTime: z.string().trim(),
    nextAppointmentDuration: z.coerce.number().int().min(10).max(240),
    nextAppointmentType: z.string().trim().max(80),
    nextAppointmentReason: z.string().trim().max(300),
    generatePrescription: z.boolean(),
    generateLabOrder: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.bloodPressure !== "") {
      if (!/^\d{2,3}\/\d{2,3}$/.test(data.bloodPressure)) {
        ctx.addIssue({
          code: "custom",
          path: ["bloodPressure"],
          message: "Presión arterial inválida (ej. 110/70).",
        });
      } else {
        const parsedBp = parseBloodPressure(data.bloodPressure);
        if (
          parsedBp &&
          (parsedBp.systolic < 60 ||
            parsedBp.systolic > 260 ||
            parsedBp.diastolic < 30 ||
            parsedBp.diastolic > 160 ||
            parsedBp.systolic <= parsedBp.diastolic)
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["bloodPressure"],
            message: "Sistólica (60-260) debe ser mayor que diastólica (30-160).",
          });
        }
      }
    }

    const validateNumRange = (
      raw: string,
      path:
        | "heartRate"
        | "respiratoryRate"
        | "temperature"
        | "oxygenSaturation"
        | "weightKg"
        | "heightCm",
      min: number,
      max: number,
      isInt: boolean,
      label: string
    ) => {
      if (raw === "") return;
      const num = Number(raw);
      if (!Number.isFinite(num) || (isInt && !Number.isInteger(num))) {
        ctx.addIssue({
          code: "custom",
          path: [path],
          message: `${label} inválida.`,
        });
        return;
      }
      if (num < min || num > max) {
        ctx.addIssue({
          code: "custom",
          path: [path],
          message: `${label}: rango válido ${min}–${max}.`,
        });
      }
    };

    validateNumRange(data.heartRate, "heartRate", 30, 220, true, "F.C.");
    validateNumRange(data.respiratoryRate, "respiratoryRate", 8, 60, true, "F.R.");
    validateNumRange(data.temperature, "temperature", 34, 43, false, "Temperatura");
    validateNumRange(data.oxygenSaturation, "oxygenSaturation", 50, 100, true, "SatO2");
    validateNumRange(data.weightKg, "weightKg", 20, 300, false, "Peso");
    validateNumRange(data.heightCm, "heightCm", 80, 240, false, "Talla");

    if (data.scheduleNextAppointment) {
      if (!data.nextAppointmentDate.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["nextAppointmentDate"],
          message: "Seleccione la fecha de próxima cita para agendar en Agenda.",
        });
      }
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.nextAppointmentTime)) {
        ctx.addIssue({
          code: "custom",
          path: ["nextAppointmentTime"],
          message: "Hora inválida (HH:mm).",
        });
      }
      if (data.nextAppointmentReason.trim().length < 3) {
        ctx.addIssue({
          code: "custom",
          path: ["nextAppointmentReason"],
          message: "Indique el motivo de la cita de control (mínimo 3 caracteres).",
        });
      }
    }
  });

export type ConsultationModalFormValues = z.infer<
  typeof consultationModalFormSchema
>;

export interface ConsultationCountsDelta {
  consultationsDelta?: number;
  prescriptionsDelta?: number;
  labOrdersDelta?: number;
}

export interface UseConsultasParams {
  patient: PatientDirectoryItem;
  initialConsultations: MedicalConsultationItem[];
  initialReasons: CatalogCategoryItem[];
  formContext: ConsultationFormContext;
  onCountsChange?: (delta: ConsultationCountsDelta) => void;
  onConsultationsChange?: (items: MedicalConsultationItem[]) => void;
  onConsultationUpdated?: (consultation: MedicalConsultationItem) => void;
  onPrescriptionCreated?: (prescription: MedicalPrescriptionItem) => void;
  onLabOrderCreated?: (labOrder: LabOrderItem) => void;
  onPrescriptionsCreated?: (prescriptions: MedicalPrescriptionItem[]) => void;
  onLabOrdersCreated?: (labOrders: LabOrderItem[]) => void;
}

export function useConsultas({
  patient,
  initialConsultations,
  initialReasons,
  formContext,
  onCountsChange,
  onConsultationsChange,
  onConsultationUpdated,
  onPrescriptionCreated,
  onLabOrderCreated,
  onPrescriptionsCreated,
  onLabOrdersCreated,
}: UseConsultasParams) {
  const searchParams = useSearchParams();
  const todayStr = useMemo(() => getPeruDateString(), []);

  const queryAppointmentId = searchParams.get("appointmentId") ?? "";
  const matchedQueryAppointment = formContext.activeAppointments.find(
    (a) => a.id === queryAppointmentId
  );
  const initialShouldOpenModal = searchParams.get("newConsultation") === "1";

  const [items, setItems] =
    useState<MedicalConsultationItem[]>(initialConsultations);
  const [activeAppointments, setActiveAppointments] = useState(
    formContext.activeAppointments
  );
  const [search, setSearchState] = useState("");
  const [dialogOpen, setDialogOpen] = useState<boolean>(initialShouldOpenModal);
  const [editingItem, setEditingItem] =
    useState<MedicalConsultationItem | null>(null);
  const [saveAndPrintIntent, setSaveAndPrintIntent] = useState(false);
  const [draftLabOrders, setDraftLabOrders] = useState<
    DraftLabOrderForConsultation[]
  >([]);
  const [draftPrescriptions, setDraftPrescriptions] = useState<
    DraftPrescriptionForConsultation[]
  >([]);

  const [printingItem, setPrintingItem] =
    useState<MedicalConsultationItem | null>(null);
  const [showCoverPage, setShowCoverPage] = useState(true);

  const [deleteTarget, setDeleteTarget] =
    useState<MedicalConsultationItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const buildDefaults = (
    item?: MedicalConsultationItem | null,
    preselectedApptId?: string
  ): ConsultationModalFormValues => {
    if (item) {
      return {
        appointmentId: item.appointmentId ?? "",
        markAppointmentAttended: false,
        consultationDate: item.consultationDate,
        reasonForVisit: item.reasonForVisit,
        illnessTime: item.illnessTime,
        symptoms: item.symptoms,
        bloodPressure: item.vitalSigns.bloodPressure ?? "",
        heartRate:
          item.vitalSigns.heartRate !== undefined
            ? String(item.vitalSigns.heartRate)
            : "",
        respiratoryRate:
          item.vitalSigns.respiratoryRate !== undefined
            ? String(item.vitalSigns.respiratoryRate)
            : "",
        temperature:
          item.vitalSigns.temperature !== undefined
            ? String(item.vitalSigns.temperature)
            : "",
        oxygenSaturation:
          item.vitalSigns.oxygenSaturation !== undefined
            ? String(item.vitalSigns.oxygenSaturation)
            : "",
        weightKg:
          item.vitalSigns.weightKg !== undefined
            ? String(item.vitalSigns.weightKg)
            : "",
        heightCm:
          item.vitalSigns.heightCm !== undefined
            ? String(item.vitalSigns.heightCm)
            : "",
        generalExam: item.physicalExam.generalExam || "",
        breastsExam: item.physicalExam.breastsExam || "",
        externalGenitalia: item.physicalExam.externalGenitalia || "",
        speculoscopy: item.physicalExam.speculoscopy || "",
        bimanualPalpation: item.physicalExam.bimanualPalpation || "",
        diagnosis: item.diagnosis,
        cie10Code: item.cie10Code,
        treatmentPlan: item.treatmentPlan,
        auxiliaryExams: item.auxiliaryExams,
        prescriptionNotes: item.prescriptionNotes,
        nextAppointmentDate: item.nextAppointmentDate,
        scheduleNextAppointment: false,
        nextAppointmentTime: "09:00",
        nextAppointmentDuration: 30,
        nextAppointmentType: "CONTROL_GINECOLOGICO",
        nextAppointmentReason: "",
        generatePrescription: false,
        generateLabOrder: false,
      };
    }

    const linkedAppt = preselectedApptId
      ? activeAppointments.find((a) => a.id === preselectedApptId)
      : activeAppointments.find((a) => a.appointmentDate === todayStr);

    return {
      appointmentId: linkedAppt?.id ?? "",
      markAppointmentAttended: Boolean(linkedAppt),
      consultationDate: todayStr,
      reasonForVisit: linkedAppt?.reason ?? "",
      illnessTime: "",
      symptoms: "",
      bloodPressure: "",
      heartRate: "",
      respiratoryRate: "",
      temperature: "",
      oxygenSaturation: "",
      weightKg: "",
      heightCm: "",
      generalExam: "",
      breastsExam: "",
      externalGenitalia: "",
      speculoscopy: "",
      bimanualPalpation: "",
      diagnosis: "",
      cie10Code: "",
      treatmentPlan: "",
      auxiliaryExams: "",
      prescriptionNotes: "",
      nextAppointmentDate: "",
      scheduleNextAppointment: false,
      nextAppointmentTime: "09:00",
      nextAppointmentDuration: 30,
      nextAppointmentType: "CONTROL_GINECOLOGICO",
      nextAppointmentReason: "",
      generatePrescription: false,
      generateLabOrder: false,
    };
  };

  const form = useForm<ConsultationModalFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(consultationModalFormSchema) as any,
    defaultValues: buildDefaults(
      null,
      initialShouldOpenModal ? matchedQueryAppointment?.id : undefined
    ),
  });

  const reasonManager = useCatalogCategories({
    scope: "consultation_reason",
    initialCategories: initialReasons,
    onRenameSuccess: (oldName, newName) => {
      const oldClean = oldName.trim().toLowerCase();
      setItems((prev) =>
        prev.map((row) =>
          row.reasonForVisit.trim().toLowerCase() === oldClean
            ? { ...row, reasonForVisit: newName }
            : row
        )
      );
      const currentFormReason = form.getValues("reasonForVisit");
      if (currentFormReason.trim().toLowerCase() === oldClean) {
        form.setValue("reasonForVisit", newName, { shouldValidate: true });
      }
    },
  });

  const watchedWeight = useWatch({ control: form.control, name: "weightKg" });
  const watchedHeight = useWatch({ control: form.control, name: "heightCm" });
  const watchedBp = useWatch({ control: form.control, name: "bloodPressure" });
  const watchedHr = useWatch({ control: form.control, name: "heartRate" });
  const watchedTemp = useWatch({ control: form.control, name: "temperature" });
  const watchedSpo2 = useWatch({
    control: form.control,
    name: "oxygenSaturation",
  });
  const watchedDiagnosis = useWatch({ control: form.control, name: "diagnosis" });
  const watchedCie10 = useWatch({ control: form.control, name: "cie10Code" });
  const watchedAppointmentId = useWatch({
    control: form.control,
    name: "appointmentId",
  });
  const watchedAuxExams = useWatch({
    control: form.control,
    name: "auxiliaryExams",
  });
  const watchedRxNotes = useWatch({
    control: form.control,
    name: "prescriptionNotes",
  });
  const watchedNextDate = useWatch({
    control: form.control,
    name: "nextAppointmentDate",
  });
  const watchedScheduleNext = useWatch({
    control: form.control,
    name: "scheduleNextAppointment",
  });

  const liveBmi = useMemo(
    () => calculateBmi(Number(watchedWeight) || 0, Number(watchedHeight) || 0),
    [watchedWeight, watchedHeight]
  );

  const bmiMeta = useMemo(() => classifyBmi(liveBmi), [liveBmi]);

  const vitalAlerts = useMemo(
    () =>
      getVitalSignAlerts({
        bloodPressure: watchedBp.trim() || undefined,
        heartRate: Number(watchedHr) || undefined,
        temperature: Number(watchedTemp) || undefined,
        oxygenSaturation: Number(watchedSpo2) || undefined,
        weightKg: Number(watchedWeight) || undefined,
        heightCm: Number(watchedHeight) || undefined,
        bmi: liveBmi > 0 ? liveBmi : undefined,
      }),
    [watchedBp, watchedHr, watchedTemp, watchedSpo2, watchedWeight, watchedHeight, liveBmi]
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.diagnosis.toLowerCase().includes(q) ||
        item.cie10Code.toLowerCase().includes(q) ||
        item.reasonForVisit.toLowerCase().includes(q) ||
        item.treatmentPlan.toLowerCase().includes(q) ||
        item.doctorName.toLowerCase().includes(q)
    );
  }, [items, search]);

  const pagination = usePagination(filteredItems);

  const setSearch = (value: string) => {
    setSearchState(value);
    pagination.resetPage();
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setSaveAndPrintIntent(false);
    setDraftLabOrders([]);
    setDraftPrescriptions([]);
    form.reset(buildDefaults());
    setDialogOpen(true);
  };

  const openEditModal = (item: MedicalConsultationItem) => {
    setEditingItem(item);
    setSaveAndPrintIntent(false);
    setDraftLabOrders([]);
    setDraftPrescriptions([]);
    form.reset(buildDefaults(item));
    setDialogOpen(true);
  };

  const upsertDraftLabOrder = (
    draft: DraftLabOrderForConsultation,
    editingIdx: number | null
  ) => {
    setDraftLabOrders((prev) =>
      editingIdx !== null
        ? prev.map((d, idx) => (idx === editingIdx ? draft : d))
        : [...prev, draft]
    );
    if (!form.getValues("diagnosis").trim() && draft.diagnosis.trim()) {
      form.setValue("diagnosis", draft.diagnosis.trim(), { shouldValidate: true });
      form.setValue("cie10Code", draft.cie10Code.trim(), { shouldValidate: true });
    }
  };

  const removeDraftLabOrder = (index: number) => {
    setDraftLabOrders((prev) => prev.filter((_, idx) => idx !== index));
  };

  const upsertDraftPrescription = (
    draft: DraftPrescriptionForConsultation,
    editingIdx: number | null
  ) => {
    setDraftPrescriptions((prev) =>
      editingIdx !== null
        ? prev.map((d, idx) => (idx === editingIdx ? draft : d))
        : [...prev, draft]
    );
    if (!form.getValues("diagnosis").trim() && draft.diagnosis.trim()) {
      form.setValue("diagnosis", draft.diagnosis.trim(), { shouldValidate: true });
      form.setValue("cie10Code", draft.cie10Code.trim(), { shouldValidate: true });
    }
    if (
      !form.getValues("nextAppointmentDate").trim() &&
      draft.nextAppointmentDate.trim()
    ) {
      form.setValue("nextAppointmentDate", draft.nextAppointmentDate.trim(), {
        shouldValidate: true,
      });
    }
  };

  const removeDraftPrescription = (index: number) => {
    setDraftPrescriptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const applyQuickNextDate = (
    offset: { days?: number; months?: number } | null
  ) => {
    if (!offset) {
      form.setValue("nextAppointmentDate", "", { shouldValidate: true });
      form.setValue("scheduleNextAppointment", false);
      return;
    }
    const baseDate = form.getValues("consultationDate") || todayStr;
    const computed = addOffsetToIsoDate(baseDate, offset);
    form.setValue("nextAppointmentDate", computed, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const toggleScheduleNextAppointment = (checked: boolean) => {
    form.setValue("scheduleNextAppointment", checked, { shouldValidate: true });
    if (checked && !form.getValues("nextAppointmentReason").trim()) {
      const diag = form.getValues("diagnosis").trim();
      const reason = form.getValues("reasonForVisit").trim();
      const suggestion = diag
        ? `Control: ${diag}`
        : reason
          ? `Control: ${reason}`
          : "Control ginecológico";
      form.setValue("nextAppointmentReason", suggestion.slice(0, 300), {
        shouldValidate: true,
      });
    }
  };

  const fillNormalPhysicalExam = () => {
    form.setValue("generalExam", NORMAL_PHYSICAL_EXAM_PRESET.generalExam);
    form.setValue("breastsExam", NORMAL_PHYSICAL_EXAM_PRESET.breastsExam);
    form.setValue(
      "externalGenitalia",
      NORMAL_PHYSICAL_EXAM_PRESET.externalGenitalia
    );
    form.setValue("speculoscopy", NORMAL_PHYSICAL_EXAM_PRESET.speculoscopy);
    form.setValue(
      "bimanualPalpation",
      NORMAL_PHYSICAL_EXAM_PRESET.bimanualPalpation
    );
    toast.success("Examen físico normal aplicado.");
  };

  const selectReasonPreset = (reasonName: string) => {
    form.setValue("reasonForVisit", reasonName, { shouldValidate: true });
  };

  const appendLabTemplate = (templateId: string) => {
    const tmpl = formContext.labTemplates.find((t) => t.id === templateId);
    if (!tmpl) return;
    const block =
      tmpl.defaultTests.length > 0
        ? tmpl.defaultTests.map((t) => `• ${t}`).join("\n")
        : `• ${tmpl.title}`;
    const current = form.getValues("auxiliaryExams").trim();
    form.setValue("auxiliaryExams", current ? `${current}\n${block}` : block);
    form.setValue("generateLabOrder", true);
  };

  const appendVademecumMedication = (medId: string) => {
    const med = formContext.vademecumOptions.find((m) => m.id === medId);
    if (!med) return;
    const brandHint = med.commercialBrands[0]?.brandName
      ? ` (${med.commercialBrands[0].brandName})`
      : "";
    const line = `• ${med.genericName}${brandHint}: indicar dosis y duración según pauta clínica.`;
    const current = form.getValues("prescriptionNotes").trim();
    form.setValue("prescriptionNotes", current ? `${current}\n${line}` : line);
    form.setValue("generatePrescription", true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const validApptId =
      values.appointmentId && pgUuidRegex.test(values.appointmentId)
        ? values.appointmentId
        : null;

    const commonPayload = {
      patientId: patient.id,
      appointmentId: validApptId,
      consultationDate: values.consultationDate,
      reasonForVisit: values.reasonForVisit,
      illnessTime: values.illnessTime,
      symptoms: values.symptoms,
      vitalSigns: {
        bloodPressure: values.bloodPressure.trim() || undefined,
        heartRate: toOptionalPositiveNumber(values.heartRate),
        respiratoryRate: toOptionalPositiveNumber(values.respiratoryRate),
        temperature: toOptionalPositiveNumber(values.temperature),
        oxygenSaturation: toOptionalPositiveNumber(values.oxygenSaturation),
        weightKg: toOptionalPositiveNumber(values.weightKg),
        heightCm: toOptionalPositiveNumber(values.heightCm),
      },
      physicalExam: {
        generalExam: values.generalExam,
        breastsExam: values.breastsExam,
        externalGenitalia: values.externalGenitalia,
        speculoscopy: values.speculoscopy,
        bimanualPalpation: values.bimanualPalpation,
      },
      diagnosis: values.diagnosis,
      cie10Code: values.cie10Code,
      treatmentPlan: values.treatmentPlan,
      auxiliaryExams: values.auxiliaryExams,
      prescriptionNotes: values.prescriptionNotes,
      nextAppointmentDate: values.nextAppointmentDate,
    };

    const nextAppointmentSchedule =
      values.scheduleNextAppointment && values.nextAppointmentDate.trim()
        ? {
            appointmentTime: values.nextAppointmentTime,
            durationMinutes: Number(values.nextAppointmentDuration) || 30,
            appointmentType:
              values.nextAppointmentType.trim() || "CONTROL_GINECOLOGICO",
            reason: values.nextAppointmentReason.trim(),
          }
        : null;

    if (editingItem) {
      const res = await updateConsultationAction({
        id: editingItem.id,
        ...commonPayload,
        nextAppointmentSchedule,
      });
      if (!res.success || !res.data) {
        toast.error(res.error || "No se pudo actualizar la consulta médica.");
        return;
      }

      const { consultation: saved, scheduledNextAppointment } = res.data;
      const nextItems = items.map((row) => (row.id === saved.id ? saved : row));
      setItems(nextItems);
      onConsultationsChange?.(nextItems);
      onConsultationUpdated?.(saved);
      reasonManager.syncUsageCounts(nextItems.map((i) => i.reasonForVisit));
      if (scheduledNextAppointment) {
        setActiveAppointments((prev) => [...prev, scheduledNextAppointment]);
      }
      setDialogOpen(false);
      setEditingItem(null);
      toast.success(
        scheduledNextAppointment
          ? "Consulta actualizada y próxima cita agendada en Agenda Médica."
          : "Consulta médica actualizada."
      );
      if (saveAndPrintIntent) {
        setPrintingItem(saved);
      }
      return;
    }

    const res = await createConsultationAction({
      ...commonPayload,
      markAppointmentAttended: Boolean(validApptId && values.markAppointmentAttended),
      generatePrescription: Boolean(
        draftPrescriptions.length === 0 &&
          values.generatePrescription &&
          values.prescriptionNotes.trim()
      ),
      generateLabOrder: Boolean(
        draftLabOrders.length === 0 &&
          values.generateLabOrder &&
          values.auxiliaryExams.trim()
      ),
      draftLabOrders,
      draftPrescriptions,
      nextAppointmentSchedule,
    });

    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo registrar la consulta médica.");
      return;
    }

    const {
      consultation,
      createdPrescriptionId,
      createdPrescriptions,
      createdLabOrderId,
      createdLabOrders,
      attendedAppointmentId,
      scheduledNextAppointment,
    } = res.data;

    const nextItems = [consultation, ...items];
    setItems(nextItems);
    onConsultationsChange?.(nextItems);
    if (createdPrescriptions.length > 0) {
      if (onPrescriptionsCreated) {
        onPrescriptionsCreated(createdPrescriptions);
      } else {
        createdPrescriptions.forEach((rx) => onPrescriptionCreated?.(rx));
      }
    }
    if (createdLabOrders.length > 0) {
      if (onLabOrdersCreated) {
        onLabOrdersCreated(createdLabOrders);
      } else {
        createdLabOrders.forEach((ord) => onLabOrderCreated?.(ord));
      }
    }
    reasonManager.syncUsageCounts(nextItems.map((i) => i.reasonForVisit));

    if (attendedAppointmentId || scheduledNextAppointment) {
      setActiveAppointments((prev) => {
        const updated = attendedAppointmentId
          ? prev.map((a) =>
              a.id === attendedAppointmentId ? { ...a, status: "ATENDIDA" } : a
            )
          : prev;
        return scheduledNextAppointment
          ? [...updated, scheduledNextAppointment]
          : updated;
      });
    }

    const rxDelta =
      createdPrescriptions.length > 0
        ? createdPrescriptions.length
        : createdPrescriptionId
          ? 1
          : 0;
    const labDelta =
      createdLabOrders.length > 0
        ? createdLabOrders.length
        : createdLabOrderId
          ? 1
          : 0;

    onCountsChange?.({
      consultationsDelta: 1,
      prescriptionsDelta: rxDelta,
      labOrdersDelta: labDelta,
    });

    const extras: string[] = [];
    if (attendedAppointmentId) extras.push("cita marcada como ATENDIDA");
    if (rxDelta > 0) extras.push(`${rxDelta} receta(s) emitida(s)`);
    if (labDelta > 0) extras.push(`${labDelta} orden(es) de laboratorio`);
    if (scheduledNextAppointment) extras.push("próxima cita agendada");

    toast.success(
      extras.length > 0
        ? `Consulta registrada (${extras.join(", ")}).`
        : "Consulta médica registrada."
    );

    setDraftLabOrders([]);
    setDraftPrescriptions([]);
    setDialogOpen(false);
    if (saveAndPrintIntent) {
      setPrintingItem(consultation);
    }
  });

  const requestDelete = (item: MedicalConsultationItem) => {
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeletingId(target.id);
    const res = await deleteConsultationAction({ id: target.id });
    setDeletingId(null);

    if (!res.success) {
      toast.error(res.error || "No se pudo archivar la consulta médica.");
      return;
    }

    const nextItems = items.filter((row) => row.id !== target.id);
    setItems(nextItems);
    onConsultationsChange?.(nextItems);
    reasonManager.syncUsageCounts(nextItems.map((i) => i.reasonForVisit));
    onCountsChange?.({ consultationsDelta: -1 });
    setDeleteTarget(null);
    toast.success("Consulta médica archivada.");
  };

  return {
    items: pagination.paginatedItems,
    allConsultations: items,
    totalCount: items.length,
    filteredCount: filteredItems.length,
    lastConsultation: items[0] ?? null,
    pagination,
    search,
    setSearch,
    // Catálogo dinámico de motivos
    consultationReasons: reasonManager.categoryNames,
    reasonManager,
    // Modal & Form
    dialogOpen,
    setDialogOpen,
    editingItem,
    form,
    isSubmitting: form.formState.isSubmitting,
    activeAppointments,
    vademecumOptions: formContext.vademecumOptions,
    labTemplates: formContext.labTemplates,
    liveBmi,
    bmiMeta,
    vitalAlerts,
    watchedDiagnosis,
    watchedCie10,
    watchedAppointmentId,
    watchedAuxExams,
    watchedRxNotes,
    watchedNextDate,
    watchedScheduleNext,
    draftLabOrders,
    draftPrescriptions,
    setSaveAndPrintIntent,
    openCreateModal,
    openEditModal,
    fillNormalPhysicalExam,
    selectReasonPreset,
    appendLabTemplate,
    appendVademecumMedication,
    upsertDraftLabOrder,
    removeDraftLabOrder,
    upsertDraftPrescription,
    removeDraftPrescription,
    applyQuickNextDate,
    toggleScheduleNextAppointment,
    onSubmit,
    // Impresión & Borrado
    printingItem,
    setPrintingItem,
    showCoverPage,
    setShowCoverPage,
    deleteTarget,
    setDeleteTarget,
    deletingId,
    requestDelete,
    confirmDelete,
  };
}
