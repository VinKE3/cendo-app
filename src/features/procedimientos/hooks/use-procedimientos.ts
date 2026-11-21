"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type {
  CreateClinicalTemplateInput,
  ProcedureClinicalTemplateItem,
  ProcedureTemplatePayload,
} from "@/features/clinical-templates/clinical-templates.schema";
import type { ColposcopyReportItem } from "@/features/colposcopia/colposcopia.schema";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import { usePagination } from "@/hooks/use-pagination";
import { formatPeruDateDisplay, getPeruDateString } from "@/lib/utils";
import {
  createMinorProcedureAction,
  deleteMinorProcedureAction,
  updateMinorProcedureAction,
} from "../actions/procedimientos.actions";
import {
  ANESTHESIA_OPTIONS,
  BLEEDING_OPTIONS,
  createMinorProcedureSchema,
  HEMOSTASIS_OPTIONS,
  isContraceptiveDeviceProcedure,
  PATHOLOGY_STATUS_OPTIONS,
  PROCEDURE_PRESETS,
  PROCEDURE_TYPE_LABELS,
  PROCEDURE_TYPES,
  type CreateMinorProcedureInput,
  type MinorProcedureItem,
  type ProcedureType,
} from "../procedimientos.schema";

export interface UseProcedimientosParams {
  patientId: string;
  procedures: MinorProcedureItem[];
  onProceduresChange: (next: MinorProcedureItem[]) => void;
  consultations: MedicalConsultationItem[];
  lastColposcopy?: ColposcopyReportItem | null;
  templates: ProcedureClinicalTemplateItem[];
  onCreateTemplate?: (
    input: CreateClinicalTemplateInput
  ) => Promise<{ success: boolean }>;
  onMacSynced?: (newMac: string) => void;
  onOpenPathologyAfterSave?: (proc: MinorProcedureItem) => void;
}

function buildDefaultProcedureValues(
  patientId: string,
  todayStr: string,
  consultationId = "",
  type: ProcedureType = "BIOPSIA_CERVICAL"
): CreateMinorProcedureInput {
  const preset =
    PROCEDURE_PRESETS.find((p) => p.procedureType === type) ??
    PROCEDURE_PRESETS[0];

  return {
    patientId,
    consultationId,
    procedureDate: todayStr,
    procedureType: preset.procedureType,
    preOpDiagnosis: preset.preOpDiagnosis,
    postOpDiagnosis: preset.postOpDiagnosis,
    cie10Code: preset.cie10Code,
    anesthesiaType: preset.anesthesiaType,
    procedureDetails: {
      ...preset.procedureDetails,
      specimenSentToPathology: false,
      pathologyStatus: "NO_APLICA",
    },
    postOpIndications: preset.postOpIndications,
    medicationsPrescribed: preset.medicationsPrescribed,
    nextControlDate: "",
    syncPatientMac: isContraceptiveDeviceProcedure(preset.procedureType),
  };
}

export function useProcedimientos({
  patientId,
  procedures,
  onProceduresChange,
  consultations,
  lastColposcopy,
  templates,
  onCreateTemplate,
  onMacSynced,
  onOpenPathologyAfterSave,
}: UseProcedimientosParams) {
  const todayStr = useMemo(() => getPeruDateString(), []);

  const [search, setSearchState] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MinorProcedureItem | null>(
    null
  );
  const [saveAndPrintIntent, setSaveAndPrintIntent] = useState(false);
  const [openPathologyAfterSave, setOpenPathologyAfterSave] = useState(false);

  const [printingItem, setPrintingItem] = useState<MinorProcedureItem | null>(
    null
  );
  const [showCoverPage, setShowCoverPage] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<MinorProcedureItem | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<CreateMinorProcedureInput>({
    resolver: zodResolver(createMinorProcedureSchema),
    defaultValues: buildDefaultProcedureValues(
      patientId,
      todayStr,
      consultations[0]?.id ?? ""
    ),
  });

  const watchedValues = useWatch({ control: form.control });

  const filteredProcedures = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return procedures;
    return procedures.filter((p) => {
      const typeLabel = (
        PROCEDURE_TYPE_LABELS[p.procedureType] || p.procedureType
      ).toLowerCase();
      return (
        typeLabel.includes(q) ||
        p.preOpDiagnosis.toLowerCase().includes(q) ||
        p.postOpDiagnosis.toLowerCase().includes(q) ||
        p.cie10Code.toLowerCase().includes(q) ||
        p.doctorName.toLowerCase().includes(q) ||
        (p.procedureDetails.specimenDescription ?? "")
          .toLowerCase()
          .includes(q) ||
        (p.procedureDetails.deviceInfo ?? "").toLowerCase().includes(q) ||
        (p.procedureDetails.pathologyResultNotes ?? "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [procedures, search]);

  const pagination = usePagination(filteredProcedures, 10);

  const setSearch = (val: string) => {
    setSearchState(val);
    pagination.setCurrentPage(1);
  };

  const applyProcedurePayload = (
    payload: ProcedureTemplatePayload,
    labelForToast?: string
  ) => {
    form.setValue("procedureType", payload.procedureType, {
      shouldDirty: true,
    });
    form.setValue("preOpDiagnosis", payload.preOpDiagnosis, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("postOpDiagnosis", payload.postOpDiagnosis, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("cie10Code", payload.cie10Code ?? "", {
      shouldDirty: true,
    });
    form.setValue("anesthesiaType", payload.anesthesiaType, {
      shouldDirty: true,
    });
    form.setValue(
      "procedureDetails",
      {
        asepsisTechnique: payload.procedureDetails.asepsisTechnique,
        biopsySites: payload.procedureDetails.biopsySites ?? "",
        specimenSentToPathology:
          payload.procedureDetails.specimenSentToPathology,
        specimenDescription:
          payload.procedureDetails.specimenDescription ?? "",
        bleedingAmount: payload.procedureDetails.bleedingAmount,
        hemostasisMethod: payload.procedureDetails.hemostasisMethod,
        complications: payload.procedureDetails.complications,
        informedConsentConfirmed:
          payload.procedureDetails.informedConsentConfirmed ?? true,
        deviceInfo: payload.procedureDetails.deviceInfo ?? "",
        pathologyStatus:
          payload.procedureDetails.pathologyStatus ??
          (payload.procedureDetails.specimenSentToPathology
            ? "PENDIENTE"
            : "NO_APLICA"),
        pathologyResultNotes:
          payload.procedureDetails.pathologyResultNotes ?? "",
      },
      { shouldDirty: true }
    );
    form.setValue("postOpIndications", payload.postOpIndications, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue(
      "medicationsPrescribed",
      payload.medicationsPrescribed ?? "",
      { shouldDirty: true }
    );
    form.setValue(
      "syncPatientMac",
      isContraceptiveDeviceProcedure(payload.procedureType),
      { shouldDirty: true }
    );

    if (labelForToast) {
      toast.success(`Protocolo "${labelForToast}" aplicado.`);
    }
  };

  const handleSelectProcedureType = (nextType: ProcedureType) => {
    form.setValue("procedureType", nextType, { shouldDirty: true });
    // Si estamos creando un nuevo procedimiento, hidratar el protocolo completo del tipo elegido
    if (!editingItem) {
      const matchingTemplate = templates.find(
        (t) => t.payload.procedureType === nextType
      );
      if (matchingTemplate) {
        applyProcedurePayload(matchingTemplate.payload);
        return;
      }
      const preset = PROCEDURE_PRESETS.find(
        (p) => p.procedureType === nextType
      );
      if (preset) {
        applyProcedurePayload({
          procedureType: preset.procedureType,
          preOpDiagnosis: preset.preOpDiagnosis,
          postOpDiagnosis: preset.postOpDiagnosis,
          cie10Code: preset.cie10Code,
          anesthesiaType: preset.anesthesiaType,
          procedureDetails: { ...preset.procedureDetails },
          postOpIndications: preset.postOpIndications,
          medicationsPrescribed: preset.medicationsPrescribed,
        });
      }
    } else {
      const isDevice = isContraceptiveDeviceProcedure(nextType);
      if (isDevice) {
        form.setValue("procedureDetails.specimenSentToPathology", false, {
          shouldDirty: true,
        });
        form.setValue("procedureDetails.pathologyStatus", "NO_APLICA", {
          shouldDirty: true,
        });
      }
      form.setValue("syncPatientMac", isDevice, { shouldDirty: true });
    }
  };

  const applyTemplate = (template: ProcedureClinicalTemplateItem) => {
    applyProcedurePayload(template.payload, template.name);
  };

  const importFromLastColposcopy = () => {
    if (!lastColposcopy) {
      toast.info("Esta paciente aún no registra una colposcopía previa.");
      return;
    }

    const hours =
      lastColposcopy.biopsyClockHours.length > 0
        ? `Cérvix uterino en horas: ${lastColposcopy.biopsyClockHours
            .map((h) => `${h}:00 (${h}h)`)
            .join(", ")} según mapeo colposcópico IFCPC (${
            lastColposcopy.transformationZoneType
          }).`
        : `Cérvix uterino (${lastColposcopy.transformationZoneType} • Test de Schiller: ${lastColposcopy.schillerTest}).`;

    form.setValue("preOpDiagnosis", lastColposcopy.diagnosis, {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (lastColposcopy.cie10Code) {
      form.setValue("cie10Code", lastColposcopy.cie10Code, {
        shouldDirty: true,
      });
    }
    form.setValue("procedureDetails.biopsySites", hours, {
      shouldDirty: true,
    });
    form.setValue("procedureDetails.specimenSentToPathology", true, {
      shouldDirty: true,
    });
    form.setValue("procedureDetails.pathologyStatus", "PENDIENTE", {
      shouldDirty: true,
    });
    if (lastColposcopy.biopsyClockHours.length > 0) {
      form.setValue(
        "procedureDetails.specimenDescription",
        `Fragmentos de biopsia cervical dirigida (${lastColposcopy.biopsyClockHours
          .map((h) => `H${h}`)
          .join(", ")}) fijados en formol tamponado al 10% (BIOLAQ).`,
        { shouldDirty: true }
      );
    }

    toast.success(
      `Datos importados de la Colposcopía del ${formatPeruDateDisplay(
        lastColposcopy.reportDate
      )}.`
    );
  };

  const buildTemplatePayload = (): ProcedureTemplatePayload => {
    const v = form.getValues();
    return {
      procedureType: v.procedureType,
      preOpDiagnosis: v.preOpDiagnosis.trim(),
      postOpDiagnosis: v.postOpDiagnosis.trim(),
      cie10Code: (v.cie10Code ?? "").trim().toUpperCase(),
      anesthesiaType: v.anesthesiaType.trim(),
      procedureDetails: {
        ...v.procedureDetails,
        asepsisTechnique: v.procedureDetails.asepsisTechnique.trim(),
        biopsySites: v.procedureDetails.biopsySites?.trim() || "",
        specimenDescription:
          v.procedureDetails.specimenDescription?.trim() || "",
        complications: v.procedureDetails.complications.trim(),
        deviceInfo: v.procedureDetails.deviceInfo?.trim() || "",
        pathologyResultNotes:
          v.procedureDetails.pathologyResultNotes?.trim() || "",
      },
      postOpIndications: v.postOpIndications.trim(),
      medicationsPrescribed: (v.medicationsPrescribed ?? "").trim(),
    };
  };

  const saveAsTemplate = async (
    name: string,
    description: string,
    payload: ProcedureTemplatePayload
  ): Promise<boolean> => {
    if (!onCreateTemplate) return false;
    const res = await onCreateTemplate({
      scope: "PROCEDURE",
      subType: payload.procedureType,
      name,
      description: description || null,
      payload,
    });
    return res.success;
  };

  const openCreateModal = (initialType: ProcedureType = "BIOPSIA_CERVICAL") => {
    setEditingItem(null);
    setSaveAndPrintIntent(false);
    setOpenPathologyAfterSave(false);
    form.reset(
      buildDefaultProcedureValues(
        patientId,
        todayStr,
        consultations[0]?.id ?? "",
        initialType
      )
    );
    setDialogOpen(true);
  };

  const openEditModal = (item: MinorProcedureItem) => {
    setEditingItem(item);
    setSaveAndPrintIntent(false);
    setOpenPathologyAfterSave(false);
    form.reset({
      patientId: item.patientId,
      consultationId: item.consultationId ?? "",
      procedureDate: item.procedureDate,
      procedureType: item.procedureType,
      preOpDiagnosis: item.preOpDiagnosis,
      postOpDiagnosis: item.postOpDiagnosis,
      cie10Code: item.cie10Code,
      anesthesiaType: item.anesthesiaType,
      procedureDetails: {
        asepsisTechnique: item.procedureDetails.asepsisTechnique,
        biopsySites: item.procedureDetails.biopsySites ?? "",
        specimenSentToPathology: item.procedureDetails.specimenSentToPathology,
        specimenDescription: item.procedureDetails.specimenDescription ?? "",
        bleedingAmount: item.procedureDetails.bleedingAmount,
        hemostasisMethod: item.procedureDetails.hemostasisMethod,
        complications: item.procedureDetails.complications,
        informedConsentConfirmed:
          item.procedureDetails.informedConsentConfirmed ?? true,
        deviceInfo: item.procedureDetails.deviceInfo ?? "",
        pathologyStatus:
          item.procedureDetails.pathologyStatus ??
          (item.procedureDetails.specimenSentToPathology
            ? "PENDIENTE"
            : "NO_APLICA"),
        pathologyResultNotes: item.procedureDetails.pathologyResultNotes ?? "",
      },
      postOpIndications: item.postOpIndications,
      medicationsPrescribed: item.medicationsPrescribed,
      nextControlDate: item.nextControlDate,
      syncPatientMac: false,
    });
    setDialogOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: CreateMinorProcedureInput = openPathologyAfterSave
      ? {
          ...values,
          procedureDetails: {
            ...values.procedureDetails,
            specimenSentToPathology: true,
          },
        }
      : values;

    const res = editingItem
      ? await updateMinorProcedureAction({ ...payload, id: editingItem.id })
      : await createMinorProcedureAction(payload);

    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo guardar el procedimiento menor.");
      return;
    }

    const { syncedMac, ...savedItem } = res.data;

    if (editingItem) {
      onProceduresChange(
        procedures.map((p) => (p.id === savedItem.id ? savedItem : p))
      );
      toast.success("Protocolo de procedimiento menor actualizado.");
    } else {
      onProceduresChange([savedItem, ...procedures]);
      toast.success("Procedimiento menor registrado exitosamente.");
    }

    if (syncedMac && onMacSynced) {
      onMacSynced(syncedMac);
      toast.info(
        `Método anticonceptivo en Antecedentes actualizado a: ${syncedMac}.`
      );
    }

    const shouldOpenPathology = openPathologyAfterSave;
    setOpenPathologyAfterSave(false);
    setDialogOpen(false);
    if (shouldOpenPathology && onOpenPathologyAfterSave) {
      setSaveAndPrintIntent(false);
      onOpenPathologyAfterSave(savedItem);
      return;
    }
    if (saveAndPrintIntent) {
      setSaveAndPrintIntent(false);
      setPrintingItem(savedItem);
    }
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await deleteMinorProcedureAction({ id: deleteTarget.id });
      if (!res.success) {
        toast.error(res.error || "No se pudo archivar el procedimiento.");
        return;
      }
      onProceduresChange(procedures.filter((p) => p.id !== deleteTarget.id));
      toast.success("Procedimiento menor archivado.");
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  return {
    items: pagination.paginatedItems,
    totalCount: procedures.length,
    filteredCount: filteredProcedures.length,
    pagination,
    search,
    setSearch,
    dialogOpen,
    setDialogOpen,
    editingItem,
    form,
    watchedValues,
    isSubmitting: form.formState.isSubmitting,
    procedureTypes: PROCEDURE_TYPES,
    anesthesiaOptions: ANESTHESIA_OPTIONS,
    bleedingOptions: BLEEDING_OPTIONS,
    hemostasisOptions: HEMOSTASIS_OPTIONS,
    pathologyStatusOptions: PATHOLOGY_STATUS_OPTIONS,
    openCreateModal,
    openEditModal,
    handleSelectProcedureType,
    applyTemplate,
    importFromLastColposcopy,
    buildTemplatePayload,
    saveAsTemplate,
    setSaveAndPrintIntent,
    onSubmit,
    printingItem,
    setPrintingItem,
    showCoverPage,
    setShowCoverPage,
    deleteTarget,
    setDeleteTarget,
    deletingId,
    confirmDelete,
    openPathologyAfterSave,
    setOpenPathologyAfterSave,
  };
}
