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
import type { ColposcopyReportItem } from "@/features/colposcopia/colposcopia.schema";
import type {
  DraftLabOrderForConsultation,
  MedicalConsultationItem,
} from "@/features/consultas/consultas.schema";
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import {
  calculateGestationalAge,
  type PrenatalCardItem,
} from "@/features/prenatal/prenatal.schema";
import {
  PROCEDURE_TYPE_LABELS,
  type MinorProcedureItem,
} from "@/features/procedimientos/procedimientos.schema";
import { usePagination } from "@/hooks/use-pagination";
import { formatPeruDateDisplay, getPeruDateString } from "@/lib/utils";
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
  requestingDoctor: z.string().trim().max(160),
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
  onDraftSubmit?: (
    draft: DraftLabOrderForConsultation,
    editingDraftIndex: number | null
  ) => void;
}

export function useLaboratorio({
  patient,
  background,
  labOrders,
  onLabOrdersChange,
  labTemplates,
  onLabTemplatesChange,
  consultations,
  onDraftSubmit,
}: UseLaboratorioParams) {
  const todayStr = useMemo(() => getPeruDateString(), []);

  const [search, setSearchState] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LabOrderItem | null>(null);
  const [draftMode, setDraftMode] = useState(false);
  const [editingDraftIndex, setEditingDraftIndex] = useState<number | null>(null);
  const [lockedConsultationLabel, setLockedConsultationLabel] = useState<
    string | null
  >(null);
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
      requestingDoctor: "DR. PATRICK JOSÉ JACINTO GOMERO",
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

  const resetConsultModeFlags = (lockedLabel: string | null = null) => {
    setDraftMode(false);
    setEditingDraftIndex(null);
    setLockedConsultationLabel(lockedLabel);
  };

  const openCreateModal = () => {
    resetConsultModeFlags(null);
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

  const openEditModal = (item: LabOrderItem, lockedLabel?: string) => {
    resetConsultModeFlags(lockedLabel ?? null);
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
      requestingDoctor:
        sp?.requestingDoctor ?? defaultSpecimenValues.requestingDoctor,
    });
    setDialogOpen(true);
  };

  const openFromConsultation = (consultation: MedicalConsultationItem) => {
    resetConsultModeFlags(null);
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

  const openDraftCreate = (prefill: {
    orderDate: string;
    diagnosis: string;
    cie10Code: string;
    sourceLabel?: string;
  }) => {
    setDraftMode(true);
    setEditingDraftIndex(null);
    setLockedConsultationLabel(
      prefill.sourceLabel ?? "Nueva consulta en curso (se emitirá al guardar)"
    );
    setEditingItem(null);
    setSourceLabel(null);
    setSaveAndPrintIntent(false);
    setSelectedTests([]);
    setCatalogSearch("");
    setCatalogCategory("Todas");
    setManualTestName("");
    form.reset({
      consultationId: "",
      orderDate: prefill.orderDate || todayStr,
      diagnosis: prefill.diagnosis,
      cie10Code: prefill.cie10Code,
      urgency: "Rutina",
      customTests: "",
      patientInstructions: getDefaultInstructionsForTemplateType("GENERAL"),
      templateType: "GENERAL",
      templateTitle: "",
      ...defaultSpecimenValues,
    });
    setDialogOpen(true);
  };

  const openDraftEdit = (
    draft: DraftLabOrderForConsultation,
    index: number,
    sourceLabel?: string
  ) => {
    setDraftMode(true);
    setEditingDraftIndex(index);
    setLockedConsultationLabel(
      sourceLabel ?? "Nueva consulta en curso (se emitirá al guardar)"
    );
    setEditingItem(null);
    setSourceLabel(null);
    setSaveAndPrintIntent(false);
    setSelectedTests(draft.items.map((it) => ({ ...it })));
    setCatalogSearch("");
    setCatalogCategory("Todas");
    setManualTestName("");
    const sp = draft.specimenDetails ?? null;
    form.reset({
      consultationId: "",
      orderDate: draft.orderDate || todayStr,
      diagnosis: draft.diagnosis,
      cie10Code: draft.cie10Code,
      urgency: draft.urgency,
      customTests: draft.customTests,
      patientInstructions:
        draft.patientInstructions ||
        getDefaultInstructionsForTemplateType(draft.templateType),
      templateType: draft.templateType,
      templateTitle: draft.templateTitle,
      anatomicalSite: sp?.anatomicalSite ?? "",
      sampleMethod: sp?.sampleMethod ?? "",
      fixative: sp?.fixative ?? defaultSpecimenValues.fixative,
      containerCount: sp?.containerCount ?? 1,
      cervixAspect: sp?.cervixAspect ?? "",
      furDate: sp?.furDate ?? defaultSpecimenValues.furDate,
      obstetricParity:
        sp?.obstetricParity ?? defaultSpecimenValues.obstetricParity,
      contraceptiveMethod:
        sp?.contraceptiveMethod ?? defaultSpecimenValues.contraceptiveMethod,
      clinicalFindings: sp?.clinicalFindings ?? "",
      sampleObtainedAt:
        sp?.sampleObtainedAt ?? draft.orderDate ?? todayStr,
      procedureOrigin:
        sp?.procedureOrigin ?? defaultSpecimenValues.procedureOrigin,
      requestingDoctor:
        sp?.requestingDoctor ?? defaultSpecimenValues.requestingDoctor,
    });
    setDialogOpen(true);
  };

  const openForExistingConsultation = (
    consultation: MedicalConsultationItem
  ) => {
    const label = `Consulta del ${formatPeruDateDisplay(consultation.consultationDate)} — ${consultation.diagnosis}`;
    resetConsultModeFlags(label);
    setEditingItem(null);
    setSourceLabel(null);
    setSaveAndPrintIntent(false);
    setSelectedTests([]);
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

  const openBiopsyFromColposcopy = (colpo: ColposcopyReportItem) => {
    resetConsultModeFlags(null);
    setEditingItem(null);
    setSourceLabel(
      `Colposcopía IFCPC del ${formatPeruDateDisplay(colpo.reportDate)}`
    );
    setSaveAndPrintIntent(false);
    setCatalogSearch("");
    setCatalogCategory("Anatomía Patológica & Biopsias");
    setManualTestName("");

    const matchedBiopsyTmpl = labTemplates.find(
      (t) => t.templateType === "BIOPSIA"
    );
    const hoursLabel =
      colpo.biopsyClockHours.length > 0
        ? colpo.biopsyClockHours.map((h) => `H${h}`).join(", ")
        : "";

    setSelectedTests([
      {
        id: `lab-colpo-biopsy-${Date.now()}`,
        category: "Anatomía Patológica & Biopsias",
        testName:
          matchedBiopsyTmpl?.defaultTests[0] ||
          "Estudio Anatomopatológico de Biopsia de Cérvix (Biopsia Dirigida)",
        sampleType: hoursLabel
          ? `Biopsia cervical (${hoursLabel})`
          : "Biopsia de cérvix en formol 10%",
        notes: "Remisión directa desde Colposcopía Digital IFCPC CENDO",
      },
    ]);

    form.reset({
      consultationId: colpo.consultationId ?? consultations[0]?.id ?? "",
      orderDate: colpo.reportDate || todayStr,
      diagnosis: colpo.diagnosis,
      cie10Code: colpo.cie10Code,
      urgency: "Prioritario",
      customTests: "",
      patientInstructions:
        matchedBiopsyTmpl?.clinicalNotes ||
        getDefaultInstructionsForTemplateType("BIOPSIA"),
      templateType: "BIOPSIA",
      templateTitle:
        matchedBiopsyTmpl?.title || "Biopsia de Cérvix (Anatomía Patológica)",
      ...defaultSpecimenValues,
      anatomicalSite: hoursLabel
        ? `Cérvix uterino — Horario colposcópico: ${hoursLabel}`
        : "Cérvix uterino (Exocérvix / Zona de Transformación)",
      sampleMethod: "Punch de biopsia cervical dirigida",
      fixative: matchedBiopsyTmpl?.fixativeTransport || "Formol tamponado al 10%",
      containerCount: Math.max(1, colpo.biopsyClockHours.length || 1),
      cervixAspect: `ZT ${colpo.transformationZoneType} • Schiller: ${colpo.schillerTest}`,
      clinicalFindings: `Colposcopía del ${formatPeruDateDisplay(colpo.reportDate)}. ${colpo.diagnosis}`,
      sampleObtainedAt: colpo.reportDate || todayStr,
      procedureOrigin: "Unidad de Colposcopía Digital CENDO",
    });

    setDialogOpen(true);
  };

  const openPathologyFromProcedure = (proc: MinorProcedureItem) => {
    resetConsultModeFlags(null);
    setEditingItem(null);
    setSourceLabel(
      `Procedimiento: ${PROCEDURE_TYPE_LABELS[proc.procedureType] || proc.procedureType} (${formatPeruDateDisplay(proc.procedureDate)})`
    );
    setSaveAndPrintIntent(false);
    setCatalogSearch("");
    setCatalogCategory("Anatomía Patológica & Biopsias");
    setManualTestName("");

    const matchedBiopsyTmpl = labTemplates.find(
      (t) => t.templateType === "BIOPSIA"
    );
    const procLabel =
      PROCEDURE_TYPE_LABELS[proc.procedureType] || proc.procedureType;

    setSelectedTests([
      {
        id: `lab-proc-biopsy-${Date.now()}`,
        category: "Anatomía Patológica & Biopsias",
        testName:
          proc.procedureType === "BIOPSIA_ENDOMETRIAL"
            ? "Estudio Histopatológico de Biopsia de Endometrio (Pipelle)"
            : proc.procedureType === "CONO_LEEP"
              ? "Estudio Anatomopatológico de Pieza de Cono Cervical LEEP"
              : proc.procedureType === "POLIPECTOMIA"
                ? "Estudio Histopatológico de Pólipo Cervical / Endocervical"
                : matchedBiopsyTmpl?.defaultTests[0] ||
                  "Estudio Anatomopatológico de Biopsia de Cérvix (Biopsia Dirigida)",
        sampleType:
          proc.procedureDetails.specimenDescription ||
          "Muestra tisular en formol tamponado al 10%",
        notes: `Remisión directa desde Procedimiento Menor CENDO (${procLabel})`,
      },
    ]);

    form.reset({
      consultationId: proc.consultationId ?? consultations[0]?.id ?? "",
      orderDate: proc.procedureDate || todayStr,
      diagnosis: proc.postOpDiagnosis,
      cie10Code: proc.cie10Code || "N87.0",
      urgency: "Prioritario",
      customTests: "",
      patientInstructions:
        matchedBiopsyTmpl?.clinicalNotes ||
        getDefaultInstructionsForTemplateType("BIOPSIA"),
      templateType: "BIOPSIA",
      templateTitle: "Solicitud de Anatomía Patológica",
      ...defaultSpecimenValues,
      anatomicalSite:
        proc.procedureDetails.biopsySites ||
        procLabel ||
        "Biopsia ginecológica",
      sampleMethod: procLabel,
      fixative: matchedBiopsyTmpl?.fixativeTransport || "Formol tamponado al 10%",
      containerCount: 1,
      cervixAspect: proc.preOpDiagnosis,
      clinicalFindings: proc.postOpDiagnosis,
      sampleObtainedAt: proc.procedureDate || todayStr,
      procedureOrigin: "Sala de Procedimientos Menores CENDO",
      requestingDoctor: proc.doctorName || defaultSpecimenValues.requestingDoctor,
    });

    setDialogOpen(true);
  };

  const openPrenatalBattery = (card: PrenatalCardItem) => {
    resetConsultModeFlags(null);
    const ga = calculateGestationalAge(card.baseline.fum, todayStr);
    setEditingItem(null);
    setSourceLabel(
      `Batería Prenatal MINSA — ${ga.trimester}° Trimestre (${ga.formatted})`
    );
    setSaveAndPrintIntent(false);
    setCatalogSearch("");
    setCatalogCategory("Todas");
    setManualTestName("");

    const prenatalTests: LabOrderItemRecord[] = [
      {
        id: `lab-cpn-hb-${Date.now()}-1`,
        category: "Hematología & Coagulación",
        testName: "Hemograma Completo Automatizado + Hemoglobina y Hematocrito",
        sampleType: "Sangre total (EDTA)",
      },
      {
        id: `lab-cpn-grp-${Date.now()}-2`,
        category: "Hematología & Coagulación",
        testName: "Grupo Sanguíneo ABO y Factor Rh",
        sampleType: "Sangre total (EDTA)",
      },
      {
        id: `lab-cpn-glu-${Date.now()}-3`,
        category: "Bioquímica & Perfil Metabólico",
        testName: "Glucosa Basal en Ayunas",
        sampleType: "Suero (Ayuno 8 horas)",
      },
      {
        id: `lab-cpn-vdrl-${Date.now()}-4`,
        category: "Inmunología, Serología & ITS",
        testName: "VDRL / RPR Cuantitativo y Prueba Rápida de Sífilis",
        sampleType: "Suero",
      },
      {
        id: `lab-cpn-vih-${Date.now()}-5`,
        category: "Inmunología, Serología & ITS",
        testName: "Tamizaje VIH 1-2 (Prueba Rápida / ELISA 4ta Generación)",
        sampleType: "Suero",
      },
      {
        id: `lab-cpn-hbs-${Date.now()}-6`,
        category: "Inmunología, Serología & ITS",
        testName: "Antígeno de Superficie Hepatitis B (HBsAg)",
        sampleType: "Suero",
      },
      {
        id: `lab-cpn-ori-${Date.now()}-7`,
        category: "Microbiología, Orina & Cultivos",
        testName: "Examen Completo de Orina con Sedimento",
        sampleType: "Orina 1er chorro medio matutino",
      },
      {
        id: `lab-cpn-uro-${Date.now()}-8`,
        category: "Microbiología, Orina & Cultivos",
        testName: "Urocultivo Cuantitativo y Antibiograma",
        sampleType: "Orina chorro medio estéril",
      },
    ];

    setSelectedTests(prenatalTests);

    form.reset({
      consultationId: consultations[0]?.id ?? "",
      orderDate: todayStr,
      diagnosis: `Control prenatal de rutina — ${ga.trimester}° Trimestre (${ga.formatted})`,
      cie10Code: "Z34.9",
      urgency: "Rutina",
      customTests: "",
      patientInstructions:
        "Acudir en ayunas de 8 horas para glicemia basal. Llevar primera orina de la mañana (chorro medio previa higiene genital) en frasco estéril para examen completo de orina y urocultivo.",
      templateType: "GENERAL",
      templateTitle: `Batería de Control Prenatal MINSA (${ga.trimester}° Trimestre)`,
      ...defaultSpecimenValues,
      furDate: card.baseline.fum || defaultSpecimenValues.furDate,
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

  const openCreatePathologyModal = () => {
    resetConsultModeFlags(null);
    setEditingItem(null);
    setSourceLabel(null);
    setSaveAndPrintIntent(false);
    setSelectedTests([]);
    setCatalogSearch("");
    setCatalogCategory("Anatomía Patológica & Biopsias");
    setManualTestName("");
    form.reset({
      consultationId: consultations[0]?.id ?? "",
      orderDate: todayStr,
      diagnosis: consultations[0]?.diagnosis ?? "",
      cie10Code: consultations[0]?.cie10Code ?? "",
      urgency: "Rutina",
      customTests: "",
      patientInstructions: getDefaultInstructionsForTemplateType("BIOPSIA"),
      templateType: "BIOPSIA",
      templateTitle: "Solicitud de Anatomía Patológica",
      ...defaultSpecimenValues,
    });
    setDialogOpen(true);
  };

  const switchToPathologyMode = () => {
    if (form.getValues("templateType") !== "GENERAL") return;
    form.setValue("templateType", "BIOPSIA", { shouldDirty: true });
    form.setValue("templateTitle", "Solicitud de Anatomía Patológica", {
      shouldDirty: true,
    });
    const currentInstr = form.getValues("patientInstructions").trim();
    const generalDefault = getDefaultInstructionsForTemplateType("GENERAL");
    if (!currentInstr || currentInstr === generalDefault) {
      form.setValue(
        "patientInstructions",
        getDefaultInstructionsForTemplateType("BIOPSIA"),
        { shouldDirty: true }
      );
    }
    const currentOrderDate = form.getValues("orderDate") || todayStr;
    if (!form.getValues("sampleObtainedAt").trim()) {
      form.setValue("sampleObtainedAt", currentOrderDate, {
        shouldDirty: true,
      });
    }
    if (!form.getValues("furDate").trim() && defaultSpecimenValues.furDate) {
      form.setValue("furDate", defaultSpecimenValues.furDate, {
        shouldDirty: true,
      });
    }
    if (!form.getValues("requestingDoctor").trim()) {
      form.setValue(
        "requestingDoctor",
        defaultSpecimenValues.requestingDoctor,
        { shouldDirty: true }
      );
    }
    setCatalogCategory("Anatomía Patológica & Biopsias");
  };

  const resetToGeneralOrder = () => {
    form.setValue("templateType", "GENERAL", { shouldDirty: true });
    form.setValue("templateTitle", "", { shouldDirty: true });
    form.setValue(
      "patientInstructions",
      getDefaultInstructionsForTemplateType("GENERAL"),
      { shouldDirty: true }
    );
    setCatalogCategory("Todas");
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
    const isPathology = values.templateType !== "GENERAL";
    const sampleText = values.anatomicalSite.trim();
    const hasCustomTests = values.customTests.trim().length >= 3;

    if (selectedTests.length === 0 && !hasCustomTests) {
      if (!isPathology) {
        toast.error(
          "Seleccione al menos un examen del catálogo o indique análisis en el campo adicional."
        );
        return;
      }
      if (sampleText.length < 2) {
        toast.error(
          "Indique la Muestra para Anatomía Patológica o seleccione un estudio del catálogo."
        );
        return;
      }
    }

    const effectiveItems: LabOrderItemRecord[] =
      selectedTests.length > 0
        ? selectedTests
        : isPathology && !hasCustomTests && sampleText.length >= 2
          ? [
              {
                id: `lab-ap-${
                  sampleText
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "")
                    .slice(0, 32) || "muestra"
                }`,
                category: "Anatomía Patológica & Biopsias",
                testName: sampleText,
                sampleType:
                  values.fixative?.trim() || "Muestra para Anatomía Patológica",
              },
            ]
          : [];

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
            requestingDoctor: values.requestingDoctor || undefined,
          };

    if (draftMode && onDraftSubmit) {
      onDraftSubmit(
        {
          orderDate: values.orderDate,
          diagnosis: values.diagnosis,
          cie10Code: values.cie10Code,
          urgency: values.urgency,
          items: effectiveItems,
          customTests: values.customTests,
          patientInstructions: values.patientInstructions,
          templateType: values.templateType,
          templateTitle:
            values.templateType === "GENERAL" ? "" : values.templateTitle,
          specimenDetails,
        },
        editingDraftIndex
      );
      setDialogOpen(false);
      setDraftMode(false);
      setEditingDraftIndex(null);
      setLockedConsultationLabel(null);
      toast.success(
        editingDraftIndex !== null
          ? "Orden borrador actualizada en la consulta."
          : "Orden de laboratorio asociada a la consulta (se emitirá al guardar)."
      );
      return;
    }

    const payload = {
      patientId: patient.id,
      consultationId: validConsultationId,
      orderDate: values.orderDate,
      diagnosis: values.diagnosis,
      cie10Code: values.cie10Code,
      urgency: values.urgency,
      items: effectiveItems,
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
    draftMode,
    editingDraftIndex,
    lockedConsultationLabel,
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
    openCreatePathologyModal,
    openEditModal,
    openFromConsultation,
    openDraftCreate,
    openDraftEdit,
    openForExistingConsultation,
    openBiopsyFromColposcopy,
    openPathologyFromProcedure,
    openPrenatalBattery,
    applyTemplate,
    switchToPathologyMode,
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
