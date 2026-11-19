"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { CatalogCategoryItem } from "@/features/catalog-categories/catalog-categories.schema";
import { useCatalogCategories } from "@/features/catalog-categories/hooks/use-catalog-categories";
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
  type MedicalConsultationItem,
} from "../consultas.schema";
import {
  createConsultationAction,
  deleteConsultationAction,
  updateConsultationAction,
} from "../actions/consultas.actions";

const pgUuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    bloodPressure: z
      .string()
      .trim()
      .regex(/^\d{2,3}\/\d{2,3}$/, "Presión arterial inválida (ej. 110/70)."),
    heartRate: z.coerce
      .number({ error: "F.C. inválida." })
      .int()
      .min(30, "F.C. mínima: 30.")
      .max(220, "F.C. máxima: 220."),
    respiratoryRate: z.coerce
      .number({ error: "F.R. inválida." })
      .int()
      .min(8, "F.R. mínima: 8.")
      .max(60, "F.R. máxima: 60."),
    temperature: z.coerce
      .number({ error: "Temp. inválida." })
      .min(34, "Mínimo 34 °C.")
      .max(43, "Máximo 43 °C."),
    oxygenSaturation: z.coerce
      .number({ error: "SatO2 inválida." })
      .int()
      .min(50, "Mínimo 50%.")
      .max(100, "Máximo 100%."),
    weightKg: z.coerce
      .number({ error: "Peso inválido." })
      .min(20, "Mínimo 20 kg.")
      .max(300, "Máximo 300 kg."),
    heightCm: z.coerce
      .number({ error: "Talla inválida." })
      .min(80, "Mínimo 80 cm.")
      .max(240, "Máximo 240 cm."),
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
    generatePrescription: z.boolean(),
    generateLabOrder: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const parsedBp = parseBloodPressure(data.bloodPressure);
    if (!parsedBp) return;
    if (
      parsedBp.systolic < 60 ||
      parsedBp.systolic > 260 ||
      parsedBp.diastolic < 30 ||
      parsedBp.diastolic > 160 ||
      parsedBp.systolic <= parsedBp.diastolic
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["bloodPressure"],
        message: "Sistólica (60-260) debe ser mayor que diastólica (30-160).",
      });
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
  onPrescriptionCreated?: (prescription: MedicalPrescriptionItem) => void;
}

export function useConsultas({
  patient,
  initialConsultations,
  initialReasons,
  formContext,
  onCountsChange,
  onConsultationsChange,
  onPrescriptionCreated,
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
        bloodPressure: item.vitalSigns.bloodPressure || "110/70",
        heartRate: item.vitalSigns.heartRate || 72,
        respiratoryRate: item.vitalSigns.respiratoryRate ?? 18,
        temperature: item.vitalSigns.temperature || 36.5,
        oxygenSaturation: item.vitalSigns.oxygenSaturation ?? 98,
        weightKg: item.vitalSigns.weightKg || 58,
        heightCm: item.vitalSigns.heightCm || 162,
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
      bloodPressure: "110/70",
      heartRate: 72,
      respiratoryRate: 18,
      temperature: 36.5,
      oxygenSaturation: 98,
      weightKg: 58,
      heightCm: 162,
      generalExam: NORMAL_PHYSICAL_EXAM_PRESET.generalExam,
      breastsExam: NORMAL_PHYSICAL_EXAM_PRESET.breastsExam,
      externalGenitalia: NORMAL_PHYSICAL_EXAM_PRESET.externalGenitalia,
      speculoscopy: NORMAL_PHYSICAL_EXAM_PRESET.speculoscopy,
      bimanualPalpation: NORMAL_PHYSICAL_EXAM_PRESET.bimanualPalpation,
      diagnosis: "",
      cie10Code: "",
      treatmentPlan:
        "1. Indicaciones generales de estilo de vida y control clínico.\n2. Acudir a evaluación con resultados según programación.",
      auxiliaryExams: "",
      prescriptionNotes: "",
      nextAppointmentDate: "",
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

  const liveBmi = useMemo(
    () => calculateBmi(Number(watchedWeight) || 0, Number(watchedHeight) || 0),
    [watchedWeight, watchedHeight]
  );

  const bmiMeta = useMemo(() => classifyBmi(liveBmi), [liveBmi]);

  const vitalAlerts = useMemo(
    () =>
      getVitalSignAlerts({
        bloodPressure: watchedBp || "110/70",
        heartRate: Number(watchedHr) || 72,
        temperature: Number(watchedTemp) || 36.5,
        oxygenSaturation: Number(watchedSpo2) || 98,
        weightKg: Number(watchedWeight) || 58,
        heightCm: Number(watchedHeight) || 162,
        bmi: liveBmi,
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
    form.reset(buildDefaults());
    setDialogOpen(true);
  };

  const openEditModal = (item: MedicalConsultationItem) => {
    setEditingItem(item);
    setSaveAndPrintIntent(false);
    form.reset(buildDefaults(item));
    setDialogOpen(true);
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
        bloodPressure: values.bloodPressure,
        heartRate: Number(values.heartRate),
        respiratoryRate: Number(values.respiratoryRate),
        temperature: Number(values.temperature),
        oxygenSaturation: Number(values.oxygenSaturation),
        weightKg: Number(values.weightKg),
        heightCm: Number(values.heightCm),
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

    if (editingItem) {
      const res = await updateConsultationAction({
        id: editingItem.id,
        ...commonPayload,
      });
      if (!res.success || !res.data) {
        toast.error(res.error || "No se pudo actualizar la consulta médica.");
        return;
      }

      const saved = res.data;
      const nextItems = items.map((row) => (row.id === saved.id ? saved : row));
      setItems(nextItems);
      onConsultationsChange?.(nextItems);
      reasonManager.syncUsageCounts(nextItems.map((i) => i.reasonForVisit));
      setDialogOpen(false);
      setEditingItem(null);
      toast.success("Consulta médica actualizada.");
      if (saveAndPrintIntent) {
        setPrintingItem(saved);
      }
      return;
    }

    const res = await createConsultationAction({
      ...commonPayload,
      markAppointmentAttended: Boolean(validApptId && values.markAppointmentAttended),
      generatePrescription: Boolean(
        values.generatePrescription && values.prescriptionNotes.trim()
      ),
      generateLabOrder: Boolean(
        values.generateLabOrder && values.auxiliaryExams.trim()
      ),
    });

    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo registrar la consulta médica.");
      return;
    }

    const {
      consultation,
      createdPrescriptionId,
      createdPrescription,
      createdLabOrderId,
      attendedAppointmentId,
    } = res.data;

    const nextItems = [consultation, ...items];
    setItems(nextItems);
    onConsultationsChange?.(nextItems);
    if (createdPrescription) {
      onPrescriptionCreated?.(createdPrescription);
    }
    reasonManager.syncUsageCounts(nextItems.map((i) => i.reasonForVisit));

    if (attendedAppointmentId) {
      setActiveAppointments((prev) =>
        prev.map((a) =>
          a.id === attendedAppointmentId ? { ...a, status: "ATENDIDA" } : a
        )
      );
    }

    onCountsChange?.({
      consultationsDelta: 1,
      prescriptionsDelta: createdPrescriptionId ? 1 : 0,
      labOrdersDelta: createdLabOrderId ? 1 : 0,
    });

    const extras: string[] = [];
    if (attendedAppointmentId) extras.push("cita marcada como ATENDIDA");
    if (createdPrescriptionId) extras.push("receta creada");
    if (createdLabOrderId) extras.push("orden de laboratorio creada");

    toast.success(
      extras.length > 0
        ? `Consulta registrada (${extras.join(", ")}).`
        : "Consulta médica registrada."
    );

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
    setSaveAndPrintIntent,
    openCreateModal,
    openEditModal,
    fillNormalPhysicalExam,
    selectReasonPreset,
    appendLabTemplate,
    appendVademecumMedication,
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
