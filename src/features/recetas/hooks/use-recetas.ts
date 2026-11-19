"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { PrescriptionItemRecord } from "@/db/schema/clinical";
import type {
  ConsultationVademecumOption,
  MedicalConsultationItem,
} from "@/features/consultas/consultas.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import {
  PROCEDURE_TYPE_LABELS,
  type MinorProcedureItem,
} from "@/features/procedimientos/procedimientos.schema";
import { usePagination } from "@/hooks/use-pagination";
import { getPeruDateString } from "@/lib/utils";
import {
  createPrescriptionAction,
  deletePrescriptionAction,
  updatePrescriptionAction,
} from "../actions/recetas.actions";
import {
  CLINICAL_DOSAGE_PRESETS,
  hasDuplicateMedication,
  inferDosagePresetForMedication,
  parseConsultationRxNotesToDraftItems,
  type ClinicalDosagePreset,
  type MedicalPrescriptionItem,
} from "../recetas.schema";
import type { PrescriptionPaperFormat } from "@/components/export/PrescriptionPrintView";

const pgUuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const prescriptionModalFormSchema = z.object({
  consultationId: z.string().trim(),
  prescriptionDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Seleccione fecha válida (YYYY-MM-DD)."),
  diagnosis: z
    .string()
    .trim()
    .min(3, "El diagnóstico presuntivo es obligatorio.")
    .max(500),
  cie10Code: z.string().trim().max(15),
  generalIndications: z.string().trim().max(2000),
  nextAppointmentDate: z
    .string()
    .trim()
    .refine((val) => val === "" || /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: "Fecha de control inválida (YYYY-MM-DD).",
    }),
});

export type PrescriptionModalFormValues = z.infer<
  typeof prescriptionModalFormSchema
>;

export interface MedicationBuilderState {
  medicationName: string;
  presentation: string;
  route: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions: string;
}

const DEFAULT_BUILDER_STATE: MedicationBuilderState = {
  medicationName: "",
  presentation: "",
  route: "Vía Oral",
  dosage: "1 tableta",
  frequency: "Cada 12 horas con alimentos",
  duration: "Por 7 días continuos",
  quantity: "14 tabletas",
  instructions: "",
};

const DEFAULT_GENERAL_INDICATIONS =
  "Cumplir estrictamente la pauta médica indicada. Acudir a control según programación.";

export interface UseRecetasParams {
  patient: PatientDirectoryItem;
  prescriptions: MedicalPrescriptionItem[];
  onPrescriptionsChange: (next: MedicalPrescriptionItem[]) => void;
  vademecumOptions: ConsultationVademecumOption[];
  consultations: MedicalConsultationItem[];
}

export function useRecetas({
  patient,
  prescriptions,
  onPrescriptionsChange,
  vademecumOptions,
  consultations,
}: UseRecetasParams) {
  const todayStr = useMemo(() => getPeruDateString(), []);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MedicalPrescriptionItem | null>(
    null
  );
  const [sourceConsultationLabel, setSourceConsultationLabel] = useState<
    string | null
  >(null);
  const [saveAndPrintIntent, setSaveAndPrintIntent] = useState(false);

  const [printingItem, setPrintingItem] =
    useState<MedicalPrescriptionItem | null>(null);
  const [showCoverPage, setShowCoverPage] = useState(false);
  const [paperFormat, setPaperFormat] =
    useState<PrescriptionPaperFormat>("A4");

  const [deleteTarget, setDeleteTarget] =
    useState<MedicalPrescriptionItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Builder state for structured medications
  const [draftItems, setDraftItems] = useState<PrescriptionItemRecord[]>([]);
  const [builder, setBuilder] =
    useState<MedicationBuilderState>(DEFAULT_BUILDER_STATE);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [vademecumSearch, setVademecumSearch] = useState("");

  const form = useForm<PrescriptionModalFormValues>({
    resolver: zodResolver(prescriptionModalFormSchema),
    defaultValues: {
      consultationId: "",
      prescriptionDate: todayStr,
      diagnosis: "",
      cie10Code: "",
      generalIndications: DEFAULT_GENERAL_INDICATIONS,
      nextAppointmentDate: "",
    },
  });

  const watchedDiagnosis = useWatch({
    control: form.control,
    name: "diagnosis",
  });
  const watchedCie10 = useWatch({
    control: form.control,
    name: "cie10Code",
  });
  const watchedConsultationId = useWatch({
    control: form.control,
    name: "consultationId",
  });

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return prescriptions;
    return prescriptions.filter(
      (rec) =>
        rec.diagnosis.toLowerCase().includes(q) ||
        rec.cie10Code.toLowerCase().includes(q) ||
        rec.doctorName.toLowerCase().includes(q) ||
        rec.generalIndications.toLowerCase().includes(q) ||
        rec.items.some((it) => it.medicationName.toLowerCase().includes(q))
    );
  }, [prescriptions, search]);

  const pagination = usePagination(filteredItems, 10);

  const filteredVademecum = useMemo(() => {
    const q = vademecumSearch.trim().toLowerCase();
    if (!q) return vademecumOptions;
    return vademecumOptions.filter(
      (med) =>
        med.genericName.toLowerCase().includes(q) ||
        med.therapeuticGroup.toLowerCase().includes(q) ||
        med.commercialBrands.some((b) => b.brandName.toLowerCase().includes(q))
    );
  }, [vademecumOptions, vademecumSearch]);

  const resetBuilder = () => {
    setBuilder(DEFAULT_BUILDER_STATE);
    setEditingItemIndex(null);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    pagination.setCurrentPage(1);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setSourceConsultationLabel(null);
    setSaveAndPrintIntent(false);
    resetBuilder();
    setVademecumSearch("");
    setDraftItems([]);
    form.reset({
      consultationId: consultations[0]?.id ?? "",
      prescriptionDate: todayStr,
      diagnosis: consultations[0]?.diagnosis ?? "",
      cie10Code: consultations[0]?.cie10Code ?? "",
      generalIndications: DEFAULT_GENERAL_INDICATIONS,
      nextAppointmentDate: consultations[0]?.nextAppointmentDate ?? "",
    });
    setDialogOpen(true);
  };

  const openEditModal = (item: MedicalPrescriptionItem) => {
    setEditingItem(item);
    setSourceConsultationLabel(null);
    setSaveAndPrintIntent(false);
    resetBuilder();
    setVademecumSearch("");
    setDraftItems(item.items.map((it) => ({ ...it })));
    form.reset({
      consultationId: item.consultationId ?? "",
      prescriptionDate: item.prescriptionDate,
      diagnosis: item.diagnosis,
      cie10Code: item.cie10Code,
      generalIndications: item.generalIndications,
      nextAppointmentDate: item.nextAppointmentDate,
    });
    setDialogOpen(true);
  };

  const openDuplicateModal = (item: MedicalPrescriptionItem) => {
    setEditingItem(null);
    setSourceConsultationLabel(
      `Renovación basada en receta del ${item.prescriptionDate}`
    );
    setSaveAndPrintIntent(false);
    resetBuilder();
    setVademecumSearch("");
    setDraftItems(
      item.items.map((it, idx) => ({
        ...it,
        id: `rx-dup-${Date.now()}-${idx}`,
      }))
    );
    form.reset({
      consultationId: "",
      prescriptionDate: todayStr,
      diagnosis: item.diagnosis,
      cie10Code: item.cie10Code,
      generalIndications: item.generalIndications || DEFAULT_GENERAL_INDICATIONS,
      nextAppointmentDate: "",
    });
    setDialogOpen(true);
  };

  const openFromConsultation = (consultation: MedicalConsultationItem) => {
    const parsedDrafts = parseConsultationRxNotesToDraftItems(
      consultation.prescriptionNotes,
      vademecumOptions
    );
    setEditingItem(null);
    setSourceConsultationLabel(
      `Pre-llenado desde consulta del ${consultation.consultationDate} (${consultation.reasonForVisit})`
    );
    setSaveAndPrintIntent(false);
    resetBuilder();
    setVademecumSearch("");
    setDraftItems(parsedDrafts);
    form.reset({
      consultationId: consultation.id,
      prescriptionDate: consultation.consultationDate || todayStr,
      diagnosis: consultation.diagnosis,
      cie10Code: consultation.cie10Code,
      generalIndications: DEFAULT_GENERAL_INDICATIONS,
      nextAppointmentDate: consultation.nextAppointmentDate,
    });
    setDialogOpen(true);
  };

  const openFromProcedure = (procedure: MinorProcedureItem) => {
    const parsedDrafts = parseConsultationRxNotesToDraftItems(
      procedure.medicationsPrescribed || "",
      vademecumOptions
    );
    const procLabel =
      PROCEDURE_TYPE_LABELS[procedure.procedureType] || procedure.procedureType;
    setEditingItem(null);
    setSourceConsultationLabel(
      `Pre-llenado desde Procedimiento Menor: ${procLabel} (${procedure.procedureDate})`
    );
    setSaveAndPrintIntent(false);
    resetBuilder();
    setVademecumSearch("");
    setDraftItems(parsedDrafts);
    form.reset({
      consultationId: procedure.consultationId ?? consultations[0]?.id ?? "",
      prescriptionDate: procedure.procedureDate || todayStr,
      diagnosis: procedure.postOpDiagnosis,
      cie10Code: procedure.cie10Code || "N87.0",
      generalIndications:
        procedure.postOpIndications || DEFAULT_GENERAL_INDICATIONS,
      nextAppointmentDate: procedure.nextControlDate || "",
    });
    setDialogOpen(true);
  };

  const selectVademecumMedication = (
    med: ConsultationVademecumOption,
    brandIndex?: number
  ) => {
    const brand =
      typeof brandIndex === "number"
        ? med.commercialBrands[brandIndex]
        : med.commercialBrands[0];
    const medicationName = brand
      ? `${brand.brandName} (${med.genericName})`
      : med.genericName;
    const presentation = brand?.presentation || "Presentación médica";
    const preset = inferDosagePresetForMedication(med.genericName);

    setBuilder((prev) => ({
      medicationName,
      presentation,
      route: preset?.route ?? prev.route,
      dosage: preset?.dosage ?? prev.dosage,
      frequency: preset?.frequency ?? prev.frequency,
      duration: preset?.duration ?? prev.duration,
      quantity: preset?.quantity ?? prev.quantity,
      instructions: preset?.instructions ?? med.indications ?? prev.instructions,
    }));
  };

  const applyDosagePreset = (preset: ClinicalDosagePreset) => {
    setBuilder((prev) => ({
      ...prev,
      route: preset.route,
      dosage: preset.dosage,
      frequency: preset.frequency,
      duration: preset.duration,
      quantity: preset.quantity,
      instructions: preset.instructions,
    }));
  };

  const saveBuilderItem = () => {
    const name = builder.medicationName.trim();
    const presentation = builder.presentation.trim() || "Presentación indicada";
    const route = builder.route.trim() || "Vía Oral";
    const dosage = builder.dosage.trim();
    const frequency = builder.frequency.trim();
    const duration = builder.duration.trim();

    if (name.length < 2) {
      toast.error("Seleccione o escriba el nombre del medicamento.");
      return;
    }
    if (!dosage || !frequency || !duration) {
      toast.error("Complete dosis, frecuencia y duración del medicamento.");
      return;
    }
    if (hasDuplicateMedication(draftItems, name, editingItemIndex ?? undefined)) {
      toast.info(`"${name}" ya forma parte de esta receta.`);
      return;
    }

    const nextRecord: PrescriptionItemRecord = {
      id:
        editingItemIndex !== null && draftItems[editingItemIndex]
          ? draftItems[editingItemIndex].id
          : `rx-${Date.now()}-${draftItems.length}`,
      medicationName: name,
      presentation,
      route,
      dosage,
      frequency,
      duration,
      instructions: builder.instructions.trim() || undefined,
      quantity: builder.quantity.trim() || undefined,
    };

    if (editingItemIndex !== null) {
      setDraftItems((prev) =>
        prev.map((it, idx) => (idx === editingItemIndex ? nextRecord : it))
      );
      toast.success("Medicamento actualizado en la receta.");
    } else {
      setDraftItems((prev) => [...prev, nextRecord]);
    }
    resetBuilder();
  };

  const startEditDraftItem = (index: number) => {
    const target = draftItems[index];
    if (!target) return;
    setEditingItemIndex(index);
    setBuilder({
      medicationName: target.medicationName,
      presentation: target.presentation,
      route: target.route,
      dosage: target.dosage,
      frequency: target.frequency,
      duration: target.duration,
      quantity: target.quantity ?? "",
      instructions: target.instructions ?? "",
    });
  };

  const removeDraftItem = (index: number) => {
    setDraftItems((prev) => prev.filter((_, idx) => idx !== index));
    if (editingItemIndex === index) {
      resetBuilder();
    } else if (editingItemIndex !== null && editingItemIndex > index) {
      setEditingItemIndex(editingItemIndex - 1);
    }
  };

  const appendGeneralIndication = (text: string) => {
    const current = form.getValues("generalIndications").trim();
    if (current.includes(text)) return;
    form.setValue("generalIndications", current ? `${current}\n${text}` : text, {
      shouldDirty: true,
    });
  };

  const handleSelectConsultationLink = (consultationId: string) => {
    form.setValue("consultationId", consultationId, { shouldDirty: true });
    if (!consultationId || editingItem) return;
    const matched = consultations.find((c) => c.id === consultationId);
    if (!matched) return;
    if (!form.getValues("diagnosis").trim()) {
      form.setValue("diagnosis", matched.diagnosis, { shouldDirty: true });
      form.setValue("cie10Code", matched.cie10Code, { shouldDirty: true });
    }
    if (!form.getValues("nextAppointmentDate") && matched.nextAppointmentDate) {
      form.setValue("nextAppointmentDate", matched.nextAppointmentDate, {
        shouldDirty: true,
      });
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (draftItems.length === 0) {
      toast.error("Agregue al menos un medicamento antes de guardar la receta.");
      return;
    }

    const validConsultationId =
      values.consultationId && pgUuidRegex.test(values.consultationId)
        ? values.consultationId
        : null;

    const payload = {
      patientId: patient.id,
      consultationId: validConsultationId,
      prescriptionDate: values.prescriptionDate,
      diagnosis: values.diagnosis,
      cie10Code: values.cie10Code,
      items: draftItems,
      generalIndications: values.generalIndications,
      nextAppointmentDate: values.nextAppointmentDate,
    };

    if (editingItem) {
      const res = await updatePrescriptionAction({
        id: editingItem.id,
        ...payload,
      });
      if (!res.success || !res.data) {
        toast.error(res.error || "No se pudo actualizar la receta médica.");
        return;
      }

      const saved = res.data;
      onPrescriptionsChange(
        prescriptions.map((row) => (row.id === saved.id ? saved : row))
      );
      setDialogOpen(false);
      setEditingItem(null);
      toast.success("Receta médica actualizada.");
      if (saveAndPrintIntent) {
        setPrintingItem(saved);
      }
      return;
    }

    const res = await createPrescriptionAction(payload);
    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo emitir la receta médica.");
      return;
    }

    const created = res.data;
    onPrescriptionsChange([created, ...prescriptions]);
    setDialogOpen(false);
    toast.success("Receta médica oficial emitida.");
    if (saveAndPrintIntent) {
      setPrintingItem(created);
    }
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeletingId(target.id);
    try {
      const res = await deletePrescriptionAction({ id: target.id });
      if (!res.success) {
        toast.error(res.error || "No se pudo archivar la receta médica.");
        return;
      }
      onPrescriptionsChange(prescriptions.filter((r) => r.id !== target.id));
      toast.success("Receta médica archivada.");
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  return {
    items: pagination.paginatedItems,
    totalCount: prescriptions.length,
    filteredCount: filteredItems.length,
    pagination,
    search,
    setSearch: handleSearchChange,
    dialogOpen,
    setDialogOpen,
    editingItem,
    sourceConsultationLabel,
    form,
    isSubmitting: form.formState.isSubmitting,
    watchedDiagnosis,
    watchedCie10,
    watchedConsultationId,
    draftItems,
    builder,
    setBuilder,
    editingItemIndex,
    vademecumSearch,
    setVademecumSearch,
    filteredVademecum,
    dosagePresets: CLINICAL_DOSAGE_PRESETS,
    openCreateModal,
    openEditModal,
    openDuplicateModal,
    openFromConsultation,
    openFromProcedure,
    selectVademecumMedication,
    applyDosagePreset,
    saveBuilderItem,
    startEditDraftItem,
    cancelEditDraftItem: resetBuilder,
    removeDraftItem,
    appendGeneralIndication,
    handleSelectConsultationLink,
    setSaveAndPrintIntent,
    onSubmit,
    printingItem,
    setPrintingItem,
    showCoverPage,
    setShowCoverPage,
    paperFormat,
    setPaperFormat,
    deleteTarget,
    setDeleteTarget,
    deletingId,
    confirmDelete,
  };
}
