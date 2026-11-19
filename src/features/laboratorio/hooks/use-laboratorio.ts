"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type {
  LabOrderItemRecord,
  LabSpecimenDetailsRecord,
} from "@/db/schema/clinical";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import { usePagination } from "@/hooks/use-pagination";
import { getPeruDateString } from "@/lib/utils";
import {
  createLabOrderAction,
  createLabTemplateAction,
  deleteLabOrderAction,
  deleteLabTemplateAction,
  updateLabOrderAction,
  updateLabTemplateAction,
} from "../actions/laboratorio.actions";
import {
  getDefaultInstructionsForTemplateType,
  hasDuplicateLabTest,
  inferLabSampleAndCategory,
  LAB_CATEGORIES,
  LAB_PRESET_PACKS,
  LAB_TEMPLATE_TYPES,
  LAB_TESTS_CATALOG,
  LAB_URGENCIES,
  parseConsultationAuxExamsToLabItems,
  type LabCatalogTest,
  type LabOrderItem,
  type LabOrderTemplateItem,
  type LabPresetPack,
  type LabTemplateType,
  type LabUrgency,
} from "../laboratorio.schema";

const pgUuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const labOrderModalFormSchema = z.object({
  consultationId: z.string().trim(),
  orderDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Seleccione fecha válida (YYYY-MM-DD)."),
  diagnosis: z
    .string()
    .trim()
    .min(3, "El diagnóstico presuntivo es obligatorio.")
    .max(500),
  cie10Code: z.string().trim().max(15),
  urgency: z.enum(LAB_URGENCIES),
  customTests: z.string().trim().max(2000),
  patientInstructions: z.string().trim().max(2000),
  templateType: z.enum(LAB_TEMPLATE_TYPES),
  templateTitle: z.string().trim().max(220),
  // Specimen metadata fields (used only when templateType !== "GENERAL")
  anatomicalSite: z.string().trim().max(240),
  sampleMethod: z.string().trim().max(240),
  fixative: z.string().trim().max(200),
  containerCount: z.number().int().min(1).max(30),
  cervixAspect: z.string().trim().max(240),
  furDate: z.string().trim().max(30),
  obstetricParity: z.string().trim().max(80),
  contraceptiveMethod: z.string().trim().max(160),
  clinicalFindings: z.string().trim().max(1000),
  sampleObtainedAt: z.string().trim().max(30),
  procedureOrigin: z.string().trim().max(200),
});

export type LabOrderModalFormValues = z.infer<typeof labOrderModalFormSchema>;

export interface UseLaboratorioParams {
  patient: PatientDirectoryItem;
  background?: PatientBackgroundItem | null;
  labOrders: LabOrderItem[];
  onLabOrdersChange: (next: LabOrderItem[]) => void;
  labTemplates: LabOrderTemplateItem[];
  onLabTemplatesChange: (next: LabOrderTemplateItem[]) => void;
  consultations: MedicalConsultationItem[];
}

export function useLaboratorio({
  patient,
  background,
  labOrders,
  onLabOrdersChange,
  labTemplates,
  onLabTemplatesChange,
  consultations,
}: UseLaboratorioParams) {
  const todayStr = useMemo(() => getPeruDateString(), []);

  const [search, setSearchState] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LabOrderItem | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [saveAndPrintIntent, setSaveAndPrintIntent] = useState(false);

  const [printingItem, setPrintingItem] = useState<LabOrderItem | null>(null);
  const [showCoverPage, setShowCoverPage] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<LabOrderItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Selected catalog tests + filter
  const [selectedTests, setSelectedTests] = useState<LabOrderItemRecord[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState<string>("Todas");
  const [manualTestName, setManualTestName] = useState("");

  // Template manager modal state
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);

  const defaultSpecimenValues = useMemo(
    () => ({
      anatomicalSite: "",
      sampleMethod: "",
      fixative: "Formol tamponado al 10%",
      containerCount: 1,
      cervixAspect: "",
      furDate: background?.lastMenstrualPeriod || patient.lastMenstrualPeriod || "",
      obstetricParity:
        background?.obstetricFormula || patient.obstetricFormula || "",
      contraceptiveMethod: background?.contraceptiveMethod || "",
      clinicalFindings: "",
      sampleObtainedAt: todayStr,
      procedureOrigin: "Consultorio Ginecológico CENDO",
    }),
    [background, patient, todayStr]
  );

  const form = useForm<LabOrderModalFormValues>({
    resolver: zodResolver(labOrderModalFormSchema),
    defaultValues: {
      consultationId: "",
      orderDate: todayStr,
      diagnosis: "",
      cie10Code: "",
      urgency: "Rutina",
      customTests: "",
      patientInstructions: getDefaultInstructionsForTemplateType("GENERAL"),
      templateType: "GENERAL",
      templateTitle: "",
      ...defaultSpecimenValues,
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
  const watchedTemplateType = useWatch({
    control: form.control,
    name: "templateType",
  });
  const watchedTemplateTitle = useWatch({
    control: form.control,
    name: "templateTitle",
  });

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return labOrders;
    return labOrders.filter(
      (ord) =>
        ord.diagnosis.toLowerCase().includes(q) ||
        ord.cie10Code.toLowerCase().includes(q) ||
        ord.templateTitle.toLowerCase().includes(q) ||
        ord.customTests.toLowerCase().includes(q) ||
        ord.doctorName.toLowerCase().includes(q) ||
        ord.items.some((it) => it.testName.toLowerCase().includes(q))
    );
  }, [labOrders, search]);

  const pagination = usePagination(filteredOrders, 10);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return LAB_TESTS_CATALOG.filter((test) => {
      if (catalogCategory !== "Todas" && test.category !== catalogCategory) {
        return false;
      }
      if (!q) return true;
      return (
        test.name.toLowerCase().includes(q) ||
        test.category.toLowerCase().includes(q) ||
        test.sampleType.toLowerCase().includes(q)
      );
    });
  }, [catalogSearch, catalogCategory]);

  const setSearch = (val: string) => {
    setSearchState(val);
    pagination.setCurrentPage(1);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setSourceLabel(null);
    setSaveAndPrintIntent(false);
    setSelectedTests([]);
    setCatalogSearch("");
    setCatalogCategory("Todas");
    setManualTestName("");
    form.reset({
      consultationId: consultations[0]?.id ?? "",
      orderDate: todayStr,
      diagnosis: consultations[0]?.diagnosis ?? "",
      cie10Code: consultations[0]?.cie10Code ?? "",
      urgency: "Rutina",
      customTests: "",
      patientInstructions: getDefaultInstructionsForTemplateType("GENERAL"),
      templateType: "GENERAL",
      templateTitle: "",
      ...defaultSpecimenValues,
    });
    setDialogOpen(true);
  };

  const openEditModal = (item: LabOrderItem) => {
    setEditingItem(item);
    setSourceLabel(null);
    setSaveAndPrintIntent(false);
    setSelectedTests(item.items.map((it) => ({ ...it })));
    setCatalogSearch("");
    setCatalogCategory("Todas");
    setManualTestName("");
    const sp = item.specimenDetails;
    form.reset({
      consultationId: item.consultationId ?? "",
      orderDate: item.orderDate,
      diagnosis: item.diagnosis,
      cie10Code: item.cie10Code,
      urgency: item.urgency as LabUrgency,
      customTests: item.customTests,
      patientInstructions:
        item.patientInstructions ||
        getDefaultInstructionsForTemplateType(item.templateType),
      templateType: item.templateType as LabTemplateType,
      templateTitle: item.templateTitle,
      anatomicalSite: sp?.anatomicalSite ?? "",
      sampleMethod: sp?.sampleMethod ?? "",
      fixative: sp?.fixative ?? defaultSpecimenValues.fixative,
      containerCount: sp?.containerCount ?? 1,
      cervixAspect: sp?.cervixAspect ?? "",
      furDate: sp?.furDate ?? defaultSpecimenValues.furDate,
      obstetricParity: sp?.obstetricParity ?? defaultSpecimenValues.obstetricParity,
      contraceptiveMethod:
        sp?.contraceptiveMethod ?? defaultSpecimenValues.contraceptiveMethod,
      clinicalFindings: sp?.clinicalFindings ?? "",
      sampleObtainedAt: sp?.sampleObtainedAt ?? item.orderDate,
      procedureOrigin:
        sp?.procedureOrigin ?? defaultSpecimenValues.procedureOrigin,
    });
    setDialogOpen(true);
  };

  const openFromConsultation = (consultation: MedicalConsultationItem) => {
    const parsedTests = parseConsultationAuxExamsToLabItems(
      consultation.auxiliaryExams
    );
    setEditingItem(null);
    setSourceLabel(
      `Pre-llenado desde consulta del ${consultation.consultationDate} (${consultation.reasonForVisit})`
    );
    setSaveAndPrintIntent(false);
    setSelectedTests(parsedTests);
    setCatalogSearch("");
    setCatalogCategory("Todas");
    setManualTestName("");
    form.reset({
      consultationId: consultation.id,
      orderDate: consultation.consultationDate || todayStr,
      diagnosis: consultation.diagnosis,
      cie10Code: consultation.cie10Code,
      urgency: "Rutina",
      customTests: "",
      patientInstructions: getDefaultInstructionsForTemplateType("GENERAL"),
      templateType: "GENERAL",
      templateTitle: "",
      ...defaultSpecimenValues,
    });
    setDialogOpen(true);
  };

  const applyTemplate = (tmpl: LabOrderTemplateItem) => {
    form.setValue("templateType", tmpl.templateType, { shouldDirty: true });
    form.setValue("templateTitle", tmpl.title, { shouldDirty: true });
    if (tmpl.suggestedDiagnosis && !form.getValues("diagnosis").trim()) {
      form.setValue("diagnosis", tmpl.suggestedDiagnosis, { shouldDirty: true });
      form.setValue("cie10Code", tmpl.cie10Code, { shouldDirty: true });
    }
    form.setValue(
      "patientInstructions",
      tmpl.clinicalNotes || getDefaultInstructionsForTemplateType(tmpl.templateType),
      { shouldDirty: true }
    );
    form.setValue("anatomicalSite", tmpl.sampleType || "", { shouldDirty: true });
    form.setValue(
      "fixative",
      tmpl.fixativeTransport || "Formol tamponado al 10%",
      { shouldDirty: true }
    );
    // Auto-hidratar correlación gineco-obstétrica desde antecedentes
    form.setValue("furDate", defaultSpecimenValues.furDate, { shouldDirty: true });
    form.setValue("obstetricParity", defaultSpecimenValues.obstetricParity, {
      shouldDirty: true,
    });
    form.setValue(
      "contraceptiveMethod",
      defaultSpecimenValues.contraceptiveMethod,
      { shouldDirty: true }
    );

    setSelectedTests((prev) => {
      const next = [...prev];
      tmpl.defaultTests.forEach((testName, idx) => {
        if (!hasDuplicateLabTest(next, testName)) {
          next.push({
            id: `lab-tmpl-${Date.now()}-${idx}`,
            category: tmpl.category,
            testName,
            sampleType: tmpl.sampleType || "Según protocolo",
          });
        }
      });
      return next;
    });
    toast.success(`Plantilla aplicada: ${tmpl.title}`);
  };

  const resetToGeneralOrder = () => {
    form.setValue("templateType", "GENERAL", { shouldDirty: true });
    form.setValue("templateTitle", "", { shouldDirty: true });
    form.setValue(
      "patientInstructions",
      getDefaultInstructionsForTemplateType("GENERAL"),
      { shouldDirty: true }
    );
  };

  const applyPresetPack = (pack: LabPresetPack) => {
    const matchedTests = LAB_TESTS_CATALOG.filter((t) =>
      pack.testIds.includes(t.id)
    );
    setSelectedTests((prev) => {
      const next = [...prev];
      matchedTests.forEach((t, idx) => {
        if (!hasDuplicateLabTest(next, t.name)) {
          next.push({
            id: `lab-pack-${Date.now()}-${idx}`,
            category: t.category,
            testName: t.name,
            sampleType: t.sampleType,
            notes: t.notes,
          });
        }
      });
      return next;
    });

    if (!form.getValues("diagnosis").trim()) {
      form.setValue("diagnosis", pack.diagnosis, { shouldDirty: true });
      form.setValue("cie10Code", pack.cie10Code, { shouldDirty: true });
    }
    toast.success(`Perfil agregado: ${pack.name}`);
  };

  const addCatalogTest = (test: LabCatalogTest) => {
    if (hasDuplicateLabTest(selectedTests, test.name)) {
      setSelectedTests((prev) =>
        prev.filter((it) => it.testName.toLowerCase() !== test.name.toLowerCase())
      );
      return;
    }
    setSelectedTests((prev) => [
      ...prev,
      {
        id: `lab-${Date.now()}-${prev.length}`,
        category: test.category,
        testName: test.name,
        sampleType: test.sampleType,
        notes: test.notes,
      },
    ]);
  };

  const addManualTest = () => {
    const clean = manualTestName.trim();
    if (clean.length < 2) {
      toast.error("Escriba el nombre del análisis.");
      return;
    }
    if (hasDuplicateLabTest(selectedTests, clean)) {
      toast.info(`"${clean}" ya está agregado en la orden.`);
      return;
    }
    const inferred = inferLabSampleAndCategory(clean);
    setSelectedTests((prev) => [
      ...prev,
      {
        id: `lab-custom-${Date.now()}-${prev.length}`,
        category: inferred.category,
        testName: clean,
        sampleType: inferred.sampleType,
      },
    ]);
    setManualTestName("");
  };

  const removeSelectedTest = (index: number) => {
    setSelectedTests((prev) => prev.filter((_, idx) => idx !== index));
  };

  const appendInstruction = (text: string) => {
    const current = form.getValues("patientInstructions").trim();
    if (current.includes(text)) return;
    form.setValue(
      "patientInstructions",
      current ? `${current}\n${text}` : text,
      { shouldDirty: true }
    );
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
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (selectedTests.length === 0 && values.customTests.trim().length < 3) {
      toast.error(
        "Seleccione al menos un examen del catálogo o indique análisis en el campo adicional."
      );
      return;
    }

    const validConsultationId =
      values.consultationId && pgUuidRegex.test(values.consultationId)
        ? values.consultationId
        : null;

    const specimenDetails: LabSpecimenDetailsRecord | null =
      values.templateType === "GENERAL"
        ? null
        : {
            anatomicalSite: values.anatomicalSite || undefined,
            sampleMethod: values.sampleMethod || undefined,
            fixative: values.fixative || undefined,
            containerCount: Number(values.containerCount) || 1,
            cervixAspect: values.cervixAspect || undefined,
            furDate: values.furDate || undefined,
            obstetricParity: values.obstetricParity || undefined,
            contraceptiveMethod: values.contraceptiveMethod || undefined,
            clinicalFindings: values.clinicalFindings || undefined,
            sampleObtainedAt: values.sampleObtainedAt || undefined,
            procedureOrigin: values.procedureOrigin || undefined,
          };

    const payload = {
      patientId: patient.id,
      consultationId: validConsultationId,
      orderDate: values.orderDate,
      diagnosis: values.diagnosis,
      cie10Code: values.cie10Code,
      urgency: values.urgency,
      items: selectedTests,
      customTests: values.customTests,
      patientInstructions: values.patientInstructions,
      templateType: values.templateType,
      templateTitle: values.templateTitle,
      specimenDetails,
    };

    if (editingItem) {
      const res = await updateLabOrderAction({
        id: editingItem.id,
        ...payload,
      });
      if (!res.success || !res.data) {
        toast.error(res.error || "No se pudo actualizar la orden de laboratorio.");
        return;
      }

      const saved = res.data;
      onLabOrdersChange(
        labOrders.map((row) => (row.id === saved.id ? saved : row))
      );
      setDialogOpen(false);
      setEditingItem(null);
      toast.success("Orden de laboratorio actualizada.");
      if (saveAndPrintIntent) {
        setPrintingItem(saved);
      }
      return;
    }

    const res = await createLabOrderAction(payload);
    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo emitir la orden de laboratorio.");
      return;
    }

    const created = res.data;
    onLabOrdersChange([created, ...labOrders]);
    setDialogOpen(false);
    toast.success("Orden de laboratorio emitida.");
    if (saveAndPrintIntent) {
      setPrintingItem(created);
    }
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeletingId(target.id);
    try {
      const res = await deleteLabOrderAction({ id: target.id });
      if (!res.success) {
        toast.error(res.error || "No se pudo archivar la orden.");
        return;
      }
      onLabOrdersChange(labOrders.filter((o) => o.id !== target.id));
      toast.success("Orden de laboratorio archivada.");
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  // Template CRUD Handlers
  const handleCreateTemplate = async (input: {
    code?: string;
    title: string;
    category: string;
    templateType: LabTemplateType;
    sampleType: string;
    fixativeTransport: string;
    suggestedDiagnosis: string;
    cie10Code: string;
    defaultTests: string[];
    clinicalNotes: string;
  }): Promise<boolean> => {
    const res = await createLabTemplateAction(input);
    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo crear la plantilla.");
      return false;
    }
    onLabTemplatesChange([...labTemplates, res.data]);
    toast.success("Plantilla de laboratorio creada.");
    return true;
  };

  const handleUpdateTemplate = async (input: {
    id: string;
    code?: string;
    title: string;
    category: string;
    templateType: LabTemplateType;
    sampleType: string;
    fixativeTransport: string;
    suggestedDiagnosis: string;
    cie10Code: string;
    defaultTests: string[];
    clinicalNotes: string;
  }): Promise<boolean> => {
    const res = await updateLabTemplateAction(input);
    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo actualizar la plantilla.");
      return false;
    }
    const saved = res.data;
    onLabTemplatesChange(
      labTemplates.map((t) => (t.id === saved.id ? saved : t))
    );
    toast.success("Plantilla de laboratorio actualizada.");
    return true;
  };

  const handleDeleteTemplate = async (id: string): Promise<boolean> => {
    const res = await deleteLabTemplateAction({ id });
    if (!res.success) {
      toast.error(res.error || "No se pudo eliminar la plantilla.");
      return false;
    }
    onLabTemplatesChange(labTemplates.filter((t) => t.id !== id));
    toast.success("Plantilla eliminada.");
    return true;
  };

  return {
    items: pagination.paginatedItems,
    totalCount: labOrders.length,
    filteredCount: filteredOrders.length,
    pagination,
    search,
    setSearch,
    dialogOpen,
    setDialogOpen,
    editingItem,
    sourceLabel,
    form,
    isSubmitting: form.formState.isSubmitting,
    watchedDiagnosis,
    watchedCie10,
    watchedConsultationId,
    watchedTemplateType,
    watchedTemplateTitle,
    selectedTests,
    catalogSearch,
    setCatalogSearch,
    catalogCategory,
    setCatalogCategory,
    filteredCatalog,
    manualTestName,
    setManualTestName,
    categories: LAB_CATEGORIES,
    presetPacks: LAB_PRESET_PACKS,
    openCreateModal,
    openEditModal,
    openFromConsultation,
    applyTemplate,
    resetToGeneralOrder,
    applyPresetPack,
    addCatalogTest,
    addManualTest,
    removeSelectedTest,
    appendInstruction,
    handleSelectConsultationLink,
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
    templateManagerOpen,
    setTemplateManagerOpen,
    handleCreateTemplate,
    handleUpdateTemplate,
    handleDeleteTemplate,
  };
}
