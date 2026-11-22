"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { CheckupDossierItemRecord } from "@/db/schema/clinical";
import type { ColposcopyReportItem } from "@/features/colposcopia/colposcopia.schema";
import { classifyColposcopyFindings } from "@/features/colposcopia/colposcopia.schema";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type {
  PatientDocumentItem,
  PatientDocumentType,
} from "@/features/documentos/documentos.schema";
import {
  ULTRASOUND_TYPE_SHORT_LABELS,
  type UltrasoundReportItem,
} from "@/features/ecografias/ecografias.schema";
import { usePagination } from "@/hooks/use-pagination";
import { formatPeruDateDisplay, getPeruDateString } from "@/lib/utils";
import {
  createCheckupAction,
  deleteCheckupAction,
  updateCheckupAction,
} from "../actions/chequeos.actions";
import {
  autoOrderDossierItems,
  CHECKUP_BIRADS_OPTIONS,
  CHECKUP_STATUSES,
  createCheckupSchema,
  DEFAULT_DOSSIER_CONFIG,
  normalizeDossierConfig,
  type ClinicalCheckupItem,
  type CreateCheckupInput,
} from "../chequeos.schema";

export interface UseChequeosParams {
  patientId: string;
  checkups: ClinicalCheckupItem[];
  onCheckupsChange: (next: ClinicalCheckupItem[]) => void;
  patientDocuments: PatientDocumentItem[];
  onPatientDocumentsChange: (next: PatientDocumentItem[]) => void;
  ultrasounds: UltrasoundReportItem[];
  colposcopies: ColposcopyReportItem[];
  consultations: MedicalConsultationItem[];
}

function buildDossierItemLabel(
  kind: CheckupDossierItemRecord["kind"],
  refId: string,
  ultrasounds: UltrasoundReportItem[],
  colposcopies: ColposcopyReportItem[],
  documents: PatientDocumentItem[]
): string {
  if (kind === "ULTRASOUND") {
    const eco = ultrasounds.find((u) => u.id === refId);
    if (!eco) return "Informe Ecográfico";
    return `${ULTRASOUND_TYPE_SHORT_LABELS[eco.ultrasoundType] || eco.ultrasoundType} (${formatPeruDateDisplay(eco.reportDate)})`;
  }
  if (kind === "COLPOSCOPY") {
    const colpo = colposcopies.find((c) => c.id === refId);
    if (!colpo) return "Colposcopía Digital IFCPC";
    return `Colposcopía IFCPC (${formatPeruDateDisplay(colpo.reportDate)})`;
  }
  const doc = documents.find((d) => d.id === refId);
  return doc ? `PDF: ${doc.title}` : "Documento PDF Externo";
}

function buildDefaultCheckupValues(
  patientId: string,
  todayStr: string,
  consultationId = ""
): CreateCheckupInput {
  return {
    patientId,
    consultationId,
    checkupDate: todayStr,
    status: "EN_PROCESO",
    reasonForConsultation: "Chequeo ginecológico preventivo integral",
    breastUltrasoundFindings: "",
    breastUltrasoundBirads: "BI-RADS 1 (Normal)",
    breastLesionMeasurements: "Sin lesiones focales",
    transvaginalUltrasoundFindings: "",
    uterusMeasurements: "",
    endometriumThicknessMm: null,
    ovariesFindings: "",
    colposcopyFindings: "",
    colposcopyResult: "",
    papResult: "Pendiente de resultado",
    vphResult: "No solicitado / Pendiente",
    conclusions:
      "Evaluación ginecológica integral en curso según estudios realizados.",
    cie10Code: "Z01.4",
    medicalPrescription:
      "1. Correlacionar con resultados pendientes de citología PAP / Test VPH.\n2. Control médico para lectura definitiva de chequeo.",
    dossierConfig: { ...DEFAULT_DOSSIER_CONFIG, items: [] },
  };
}

export function useChequeos({
  patientId,
  checkups,
  onCheckupsChange,
  patientDocuments,
  onPatientDocumentsChange,
  ultrasounds,
  colposcopies,
  consultations,
}: UseChequeosParams) {
  const todayStr = useMemo(() => getPeruDateString(), []);

  const [search, setSearchState] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClinicalCheckupItem | null>(
    null
  );
  const [downloadAfterSaveIntent, setDownloadAfterSaveIntent] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const [printingItem, setPrintingItem] = useState<ClinicalCheckupItem | null>(
    null
  );
  const [showCoverPage, setShowCoverPage] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<ClinicalCheckupItem | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<CreateCheckupInput>({
    resolver: zodResolver(createCheckupSchema),
    defaultValues: buildDefaultCheckupValues(patientId, todayStr),
  });

  const watchedDossier = useWatch({
    control: form.control,
    name: "dossierConfig",
  });
  const watchedDiagnosis = useWatch({
    control: form.control,
    name: "conclusions",
  });
  const watchedCie10 = useWatch({
    control: form.control,
    name: "cie10Code",
  });

  const filteredCheckups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return checkups;
    return checkups.filter(
      (c) =>
        c.reasonForConsultation.toLowerCase().includes(q) ||
        c.conclusions.toLowerCase().includes(q) ||
        c.cie10Code.toLowerCase().includes(q) ||
        c.breastUltrasoundBirads.toLowerCase().includes(q) ||
        c.colposcopyResult.toLowerCase().includes(q) ||
        c.doctorName.toLowerCase().includes(q)
    );
  }, [checkups, search]);

  const pagination = usePagination(filteredCheckups, 10);

  const setSearch = (val: string) => {
    setSearchState(val);
    pagination.setCurrentPage(1);
  };

  const syncFromStudiesAndDocuments = (
    explicitItems?: CheckupDossierItemRecord[],
    silent = false,
    extraDocuments: PatientDocumentItem[] = []
  ) => {
    const allDocs =
      extraDocuments.length > 0
        ? [...extraDocuments, ...patientDocuments]
        : patientDocuments;

    let items = explicitItems
      ? [...explicitItems]
      : [...(form.getValues("dossierConfig.items") ?? [])];

    // Si no se pasaron explicitItems (ej. botón "Sincronizar estudios" o creación inicial),
    // agregar automáticamente cualquier estudio reciente o PDF externo que aún no esté vinculado.
    if (!explicitItems) {
      const candidateItems: CheckupDossierItemRecord[] = [...items];
      const hasItem = (kind: CheckupDossierItemRecord["kind"], refId: string) =>
        candidateItems.some((entry) => entry.kind === kind && entry.refId === refId);

      const latestBreast = ultrasounds.find(
        (u) => u.ultrasoundType === "MAMA_BILATERAL"
      );
      if (latestBreast && !hasItem("ULTRASOUND", latestBreast.id)) {
        candidateItems.push({
          kind: "ULTRASOUND",
          refId: latestBreast.id,
          label: buildDossierItemLabel(
            "ULTRASOUND",
            latestBreast.id,
            ultrasounds,
            colposcopies,
            allDocs
          ),
        });
      }

      const latestTv = ultrasounds.find(
        (u) => u.ultrasoundType !== "MAMA_BILATERAL"
      );
      if (latestTv && !hasItem("ULTRASOUND", latestTv.id)) {
        candidateItems.push({
          kind: "ULTRASOUND",
          refId: latestTv.id,
          label: buildDossierItemLabel(
            "ULTRASOUND",
            latestTv.id,
            ultrasounds,
            colposcopies,
            allDocs
          ),
        });
      }

      const latestColpo = colposcopies[0];
      if (latestColpo && !hasItem("COLPOSCOPY", latestColpo.id)) {
        candidateItems.push({
          kind: "COLPOSCOPY",
          refId: latestColpo.id,
          label: buildDossierItemLabel(
            "COLPOSCOPY",
            latestColpo.id,
            ultrasounds,
            colposcopies,
            allDocs
          ),
        });
      }

      for (const doc of allDocs.slice(0, 6)) {
        if (!hasItem("DOCUMENT", doc.id)) {
          candidateItems.push({
            kind: "DOCUMENT",
            refId: doc.id,
            label: `PDF: ${doc.title}`,
          });
        }
      }

      items = autoOrderDossierItems(candidateItems, ultrasounds, allDocs);
      form.setValue("dossierConfig.items", items, { shouldDirty: true });
    }

    const selectedEcoIds = items
      .filter((i) => i.kind === "ULTRASOUND")
      .map((i) => i.refId);
    const selectedColpoIds = items
      .filter((i) => i.kind === "COLPOSCOPY")
      .map((i) => i.refId);
    const selectedDocIds = items
      .filter((i) => i.kind === "DOCUMENT")
      .map((i) => i.refId);

    const breastEco =
      ultrasounds.find(
        (u) =>
          selectedEcoIds.includes(u.id) && u.ultrasoundType === "MAMA_BILATERAL"
      ) ??
      (explicitItems
        ? undefined
        : ultrasounds.find((u) => u.ultrasoundType === "MAMA_BILATERAL"));

    const tvEco =
      ultrasounds.find(
        (u) =>
          selectedEcoIds.includes(u.id) && u.ultrasoundType !== "MAMA_BILATERAL"
      ) ??
      (explicitItems
        ? undefined
        : ultrasounds.find((u) => u.ultrasoundType !== "MAMA_BILATERAL"));

    const colpo =
      colposcopies.find((c) => selectedColpoIds.includes(c.id)) ??
      (explicitItems ? undefined : colposcopies[0]);

    const selectedDocs = allDocs.filter((d) => selectedDocIds.includes(d.id));
    const hasPapDoc = selectedDocs.some(
      (d) => d.documentType === "LABORATORIO_PAP"
    );
    const hasVphDoc = selectedDocs.some(
      (d) => d.documentType === "LABORATORIO_VPH"
    );

    const summaryNotes: string[] = [];

    if (breastEco) {
      const f = breastEco.findings;
      const parts = [
        f.breastPattern ? `Patrón: ${f.breastPattern}` : "",
        f.rightBreastFindings ? `MD: ${f.rightBreastFindings}` : "",
        f.leftBreastFindings ? `MI: ${f.leftBreastFindings}` : "",
      ].filter(Boolean);
      form.setValue(
        "breastUltrasoundFindings",
        parts.join(" ") || breastEco.conclusion,
        { shouldDirty: true }
      );
      if (f.biradsCategory) {
        const matchOpt =
          CHECKUP_BIRADS_OPTIONS.find((opt) =>
            opt.startsWith(f.biradsCategory || "")
          ) ?? f.biradsCategory;
        form.setValue("breastUltrasoundBirads", matchOpt, {
          shouldDirty: true,
        });
      }
      summaryNotes.push(`Eco Mama (${breastEco.findings.biradsCategory || "Realizada"})`);
    }

    if (tvEco) {
      const f = tvEco.findings;
      const tvParts = [
        f.uterusPosition ? `Útero en ${f.uterusPosition}.` : "",
        f.myometriumStatus || "",
        f.douglasPouch ? `Douglas: ${f.douglasPouch}` : "",
        f.slidingSign ? `Sliding sign: ${f.slidingSign}.` : "",
      ].filter(Boolean);
      form.setValue(
        "transvaginalUltrasoundFindings",
        tvParts.join(" ") || tvEco.conclusion,
        { shouldDirty: true }
      );
      if (f.uterusDimensions) {
        form.setValue(
          "uterusMeasurements",
          `${f.uterusDimensions}${f.uterusVolumeCc != null ? ` (${f.uterusVolumeCc} cc)` : ""}`,
          { shouldDirty: true }
        );
      }
      if (typeof f.endometriumThicknessMm === "number") {
        form.setValue("endometriumThicknessMm", f.endometriumThicknessMm, {
          shouldDirty: true,
        });
      }
      const ovParts = [
        f.rightOvaryDimensions ? `OD: ${f.rightOvaryDimensions}` : "",
        f.leftOvaryDimensions ? `OI: ${f.leftOvaryDimensions}` : "",
      ].filter(Boolean);
      if (ovParts.length > 0) {
        form.setValue("ovariesFindings", ovParts.join(" | "), {
          shouldDirty: true,
        });
      }
      summaryNotes.push(
        `Eco ${ULTRASOUND_TYPE_SHORT_LABELS[tvEco.ultrasoundType] || "Pélvica"}`
      );
    }

    if (colpo) {
      const cls = classifyColposcopyFindings({
        thinAcetowhiteEpithelium: colpo.thinAcetowhiteEpithelium,
        irregularBorder: colpo.irregularBorder,
        fineMosaic: colpo.fineMosaic,
        finePunctation: colpo.finePunctation,
        denseAcetowhiteEpithelium: colpo.denseAcetowhiteEpithelium,
        coarseMosaic: colpo.coarseMosaic,
        coarsePunctation: colpo.coarsePunctation,
        atypicalVessels: colpo.atypicalVessels,
        extendedFindings: colpo.extendedFindings,
      });
      form.setValue(
        "colposcopyFindings",
        `${colpo.adequateColposcopy ? "Adecuada" : "Inadecuada"}. ${colpo.transformationZoneType}. Schiller: ${colpo.schillerTest}. ${colpo.diagnosis}`,
        { shouldDirty: true }
      );
      form.setValue("colposcopyResult", cls.label, { shouldDirty: true });
      if (colpo.cie10Code) {
        form.setValue("cie10Code", colpo.cie10Code, { shouldDirty: true });
      }
      summaryNotes.push(`Colposcopía (${colpo.cie10Code})`);
    }

    if (hasPapDoc) {
      const papDoc = selectedDocs.find(
        (d) => d.documentType === "LABORATORIO_PAP"
      );
      const currPap = form.getValues("papResult") ?? "";
      if (!currPap || currPap.toLowerCase().includes("pendiente")) {
        form.setValue(
          "papResult",
          `Adjunto en Dossier (${papDoc?.title ?? "Resultado PAP"})`,
          { shouldDirty: true }
        );
      }
    }

    if (hasVphDoc) {
      const vphDoc = selectedDocs.find(
        (d) => d.documentType === "LABORATORIO_VPH"
      );
      const currVph = form.getValues("vphResult") ?? "";
      if (!currVph || currVph.toLowerCase().includes("pendiente")) {
        form.setValue(
          "vphResult",
          `Adjunto en Dossier (${vphDoc?.title ?? "Resultado VPH"})`,
          { shouldDirty: true }
        );
      }
    }

    const conclusionParts = [
      breastEco?.conclusion ? `• Eco Mamaria: ${breastEco.conclusion}` : "",
      tvEco?.conclusion ? `• Eco Transvaginal: ${tvEco.conclusion}` : "",
      colpo?.diagnosis ? `• Colposcopía: ${colpo.diagnosis}` : "",
    ].filter(Boolean);

    if (conclusionParts.length > 0) {
      form.setValue("conclusions", conclusionParts.join("\n"), {
        shouldDirty: true,
      });
    }

    if (breastEco && tvEco && colpo && hasPapDoc) {
      form.setValue("status", "COMPLETO", { shouldDirty: true });
    }

    if (!silent) {
      toast.success(
        summaryNotes.length > 0
          ? `Estudios sincronizados: ${summaryNotes.join(" • ")}`
          : "Se revisaron los estudios disponibles de la paciente."
      );
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setDownloadAfterSaveIntent(false);
    form.reset(
      buildDefaultCheckupValues(patientId, todayStr, consultations[0]?.id ?? "")
    );
    syncFromStudiesAndDocuments(undefined, true);
    setDialogOpen(true);
  };

  const openEditModal = (item: ClinicalCheckupItem) => {
    setEditingItem(item);
    setDownloadAfterSaveIntent(false);
    form.reset({
      patientId: item.patientId,
      consultationId: item.consultationId ?? "",
      checkupDate: item.checkupDate,
      status: item.status,
      reasonForConsultation: item.reasonForConsultation,
      breastUltrasoundFindings: item.breastUltrasoundFindings,
      breastUltrasoundBirads: item.breastUltrasoundBirads,
      breastLesionMeasurements: item.breastLesionMeasurements,
      transvaginalUltrasoundFindings: item.transvaginalUltrasoundFindings,
      uterusMeasurements: item.uterusMeasurements,
      endometriumThicknessMm: item.endometriumThicknessMm,
      ovariesFindings: item.ovariesFindings,
      colposcopyFindings: item.colposcopyFindings,
      colposcopyResult: item.colposcopyResult,
      papResult: item.papResult,
      vphResult: item.vphResult,
      conclusions: item.conclusions,
      cie10Code: item.cie10Code,
      medicalPrescription: item.medicalPrescription,
      dossierConfig: normalizeDossierConfig(item.dossierConfig),
    });
    setDialogOpen(true);
  };

  const toggleDossierItem = (
    kind: CheckupDossierItemRecord["kind"],
    refId: string,
    label?: string
  ) => {
    const current = form.getValues("dossierConfig.items") ?? [];
    const exists = current.some(
      (entry) => entry.kind === kind && entry.refId === refId
    );
    if (exists) {
      const filtered = current.filter(
        (entry) => !(entry.kind === kind && entry.refId === refId)
      );
      form.setValue("dossierConfig.items", filtered, { shouldDirty: true });
      syncFromStudiesAndDocuments(filtered, true);
      return;
    }

    const next = autoOrderDossierItems(
      [
        ...current,
        {
          kind,
          refId,
          label:
            label ||
            buildDossierItemLabel(
              kind,
              refId,
              ultrasounds,
              colposcopies,
              patientDocuments
            ),
        },
      ],
      ultrasounds,
      patientDocuments
    );
    form.setValue("dossierConfig.items", next, { shouldDirty: true });
    syncFromStudiesAndDocuments(next, true);
  };

  const moveDossierItem = (index: number, delta: -1 | 1) => {
    const current = [...(form.getValues("dossierConfig.items") ?? [])];
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    const [moved] = current.splice(index, 1);
    current.splice(targetIdx, 0, moved);
    form.setValue("dossierConfig.items", current, { shouldDirty: true });
  };

  const handleAutoOrderDossier = () => {
    const current = form.getValues("dossierConfig.items") ?? [];
    const ordered = autoOrderDossierItems(
      current,
      ultrasounds,
      patientDocuments
    );
    form.setValue("dossierConfig.items", ordered, { shouldDirty: true });
    toast.success(
      "Orden del Dossier ajustado automáticamente al formato oficial CENDO."
    );
  };

  const uploadExternalPdf = async (params: {
    file: File;
    documentType: PatientDocumentType;
    title: string;
    documentDate?: string;
    notes?: string;
    attachToDraftDossier?: boolean;
  }): Promise<{ success: boolean; data?: PatientDocumentItem }> => {
    setIsUploadingDocument(true);
    try {
      const formData = new FormData();
      formData.append("patientId", patientId);
      formData.append("documentType", params.documentType);
      formData.append("title", params.title.trim());
      if (params.documentDate?.trim()) {
        formData.append("documentDate", params.documentDate.trim());
      }
      if (params.notes?.trim()) {
        formData.append("notes", params.notes.trim());
      }
      formData.append("file", params.file);

      const res = await fetch("/api/patient-documents", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: PatientDocumentItem;
      };

      if (!res.ok || !json.success || !json.data) {
        toast.error(json.error || "No se pudo subir el documento PDF.");
        return { success: false };
      }

      const uploadedDoc = json.data;
      const nextDocs = [uploadedDoc, ...patientDocuments];
      onPatientDocumentsChange(nextDocs);

      if (params.attachToDraftDossier !== false && dialogOpen) {
        const current = form.getValues("dossierConfig.items") ?? [];
        const updated = autoOrderDossierItems(
          [
            ...current,
            {
              kind: "DOCUMENT",
              refId: uploadedDoc.id,
              label: `PDF: ${uploadedDoc.title}`,
            },
          ],
          ultrasounds,
          nextDocs
        );
        form.setValue("dossierConfig.items", updated, { shouldDirty: true });
      }

      toast.success("Documento agregado correctamente", {
        description: `"${uploadedDoc.title}" guardado en Storage privado.`,
        duration: 4500,
      });
      return { success: true, data: uploadedDoc };
    } catch {
      toast.error("Error de red subiendo el archivo PDF.");
      return { success: false };
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const deleteExternalPdf = async (documentId: string): Promise<boolean> => {
    setDeletingDocId(documentId);
    try {
      const res = await fetch(
        `/api/patient-documents?id=${encodeURIComponent(documentId)}`,
        { method: "DELETE" }
      );
      const json = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !json.success) {
        toast.error(json.error || "No se pudo eliminar el documento PDF.");
        return false;
      }

      onPatientDocumentsChange(
        patientDocuments.filter((d) => d.id !== documentId)
      );

      const current = form.getValues("dossierConfig.items") ?? [];
      if (
        current.some((i) => i.kind === "DOCUMENT" && i.refId === documentId)
      ) {
        form.setValue(
          "dossierConfig.items",
          current.filter(
            (i) => !(i.kind === "DOCUMENT" && i.refId === documentId)
          ),
          { shouldDirty: true }
        );
      }

      toast.success("Documento PDF archivado.");
      return true;
    } catch {
      toast.error("Error de red al eliminar el PDF.");
      return false;
    } finally {
      setDeletingDocId(null);
    }
  };

  const triggerDownloadDossier = (
    checkupId: string,
    opts?: {
      sig?: boolean;
      cover?: boolean;
      summary?: boolean;
      inline?: boolean;
    }
  ) => {
    const params = new URLSearchParams();
    params.set("download", opts?.inline ? "0" : "1");
    if (opts?.sig !== undefined) params.set("sig", opts.sig ? "1" : "0");
    if (opts?.cover !== undefined) params.set("cover", opts.cover ? "1" : "0");
    if (opts?.summary !== undefined) {
      params.set("summary", opts.summary ? "1" : "0");
    }

    const url = `/api/chequeos/${encodeURIComponent(checkupId)}/dossier?${params.toString()}`;
    if (opts?.inline) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const cleanConfig = normalizeDossierConfig(values.dossierConfig);
    const payload: CreateCheckupInput = {
      ...values,
      dossierConfig: cleanConfig,
    };

    const res = editingItem
      ? await updateCheckupAction({ ...payload, id: editingItem.id })
      : await createCheckupAction(payload);

    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo guardar el chequeo integral.");
      return;
    }

    const saved = res.data;
    if (editingItem) {
      onCheckupsChange(
        checkups.map((item) => (item.id === saved.id ? saved : item))
      );
      toast.success("Chequeo integral actualizado.");
    } else {
      onCheckupsChange([saved, ...checkups]);
      toast.success("Chequeo ginecológico integral registrado.");
    }

    setDialogOpen(false);
    if (downloadAfterSaveIntent) {
      setDownloadAfterSaveIntent(false);
      triggerDownloadDossier(saved.id, {
        sig: saved.dossierConfig.showDigitalSignature,
        cover: saved.dossierConfig.includeCoverPage,
        summary: saved.dossierConfig.includeSummarySheet,
      });
    }
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await deleteCheckupAction({ id: deleteTarget.id });
      if (!res.success) {
        toast.error(res.error || "No se pudo archivar el chequeo.");
        return;
      }
      onCheckupsChange(checkups.filter((c) => c.id !== deleteTarget.id));
      toast.success("Chequeo integral archivado.");
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  return {
    items: pagination.paginatedItems,
    totalCount: checkups.length,
    filteredCount: filteredCheckups.length,
    pagination,
    search,
    setSearch,
    dialogOpen,
    setDialogOpen,
    editingItem,
    form,
    isSubmitting: form.formState.isSubmitting,
    isUploadingDocument,
    deletingDocId,
    watchedDossier,
    watchedDiagnosis,
    watchedCie10,
    statusOptions: CHECKUP_STATUSES,
    biradsOptions: CHECKUP_BIRADS_OPTIONS,
    openCreateModal,
    openEditModal,
    syncFromStudiesAndDocuments,
    toggleDossierItem,
    moveDossierItem,
    handleAutoOrderDossier,
    uploadExternalPdf,
    deleteExternalPdf,
    triggerDownloadDossier,
    setDownloadAfterSaveIntent,
    onSubmit,
    printingItem,
    setPrintingItem,
    showCoverPage,
    setShowCoverPage,
    deleteTarget,
    setDeleteTarget,
    deletingId,
    confirmDelete,
  };
}
