"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { ClinicalImageRecord } from "@/db/schema/specialty";
import type {
  UltrasoundClinicalTemplateItem,
  UltrasoundTemplatePayload,
} from "@/features/clinical-templates/clinical-templates.schema";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import { usePagination } from "@/hooks/use-pagination";
import { compressClinicalImageFile } from "@/lib/image-compressor";
import { getPeruDateString } from "@/lib/utils";
import {
  createUltrasoundAction,
  deleteUltrasoundAction,
  updateUltrasoundAction,
} from "../actions/ecografias.actions";
import {
  BIRADS_OPTIONS,
  calculateEllipsoidVolumeCc,
  createUltrasoundSchema,
  ENDOMETRIUM_PATTERNS,
  SLIDING_SIGN_OPTIONS,
  ULTRASOUND_PRESETS,
  ULTRASOUND_TYPE_LABELS,
  ULTRASOUND_TYPES,
  UTERUS_POSITIONS,
  type CreateUltrasoundInput,
  type UltrasoundReportItem,
} from "../ecografias.schema";

export interface UseEcografiasParams {
  patientId: string;
  ultrasounds: UltrasoundReportItem[];
  onUltrasoundsChange: (next: UltrasoundReportItem[]) => void;
  consultations: MedicalConsultationItem[];
  templates?: UltrasoundClinicalTemplateItem[];
}

export function toOptionalNumber(raw: unknown): number | undefined {
  if (raw === "" || raw === null || raw === undefined) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeBirads(
  raw?: string | null
): (typeof BIRADS_OPTIONS)[number] | undefined {
  if (!raw) return undefined;
  return BIRADS_OPTIONS.find((opt) => opt === raw);
}

function toUltrasoundFormFindings(
  raw?: CreateUltrasoundInput["findings"] | UltrasoundReportItem["findings"]
): CreateUltrasoundInput["findings"] {
  const f = raw ?? {};
  return {
    uterusPosition: f.uterusPosition,
    uterusDimensions: f.uterusDimensions,
    uterusVolumeCc: f.uterusVolumeCc,
    myometriumStatus: f.myometriumStatus,
    endometriumThicknessMm: f.endometriumThicknessMm,
    endometriumPattern: f.endometriumPattern,
    rightOvaryDimensions: f.rightOvaryDimensions,
    leftOvaryDimensions: f.leftOvaryDimensions,
    ovariesNotes: f.ovariesNotes,
    douglasPouch: f.douglasPouch,
    endometriosisFoci: f.endometriosisFoci,
    slidingSign: f.slidingSign,
    uterosacralLigaments: f.uterosacralLigaments,
    breastPattern: f.breastPattern,
    rightBreastFindings: f.rightBreastFindings,
    leftBreastFindings: f.leftBreastFindings,
    biradsCategory: normalizeBirads(f.biradsCategory),
    gestationalSacsCount: f.gestationalSacsCount,
    embryoCrownRumpLengthMm: f.embryoCrownRumpLengthMm,
    gestationalAgeByEcho: f.gestationalAgeByEcho,
    fetalHeartRate: f.fetalHeartRate,
    placentaLocation: f.placentaLocation,
    amnioticFluidIndex: f.amnioticFluidIndex,
  };
}

export function useEcografias({
  patientId,
  ultrasounds,
  onUltrasoundsChange,
  consultations,
  templates = [],
}: UseEcografiasParams) {
  const todayStr = useMemo(() => getPeruDateString(), []);

  const [search, setSearchState] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UltrasoundReportItem | null>(null);
  const [saveAndPrintIntent, setSaveAndPrintIntent] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [draftImages, setDraftImages] = useState<ClinicalImageRecord[]>([]);
  const [sessionUploadedPaths, setSessionUploadedPaths] = useState<string[]>(
    []
  );

  const [printingItem, setPrintingItem] = useState<UltrasoundReportItem | null>(
    null
  );
  const [showCoverPage, setShowCoverPage] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UltrasoundReportItem | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<CreateUltrasoundInput>({
    resolver: zodResolver(createUltrasoundSchema),
    defaultValues: {
      patientId,
      consultationId: "",
      reportDate: todayStr,
      ultrasoundType: "TRANSVAGINAL",
      indication: "Control ginecológico preventivo / Evaluación pélvica",
      findings: {
        uterusPosition: "AVF",
        uterusDimensions: "70 x 40 x 46 mm",
        uterusVolumeCc: 67.4,
        myometriumStatus:
          "Ecoestructura miometrial homogénea, sin nódulos ni focos adenomióticos.",
        endometriumThicknessMm: 6.5,
        endometriumPattern: "Trilaminar",
        rightOvaryDimensions: "28 x 19 mm, folículos antrales conservados.",
        leftOvaryDimensions: "27 x 18 mm, estroma y folículos normales.",
        ovariesNotes: "",
        douglasPouch: "Libre de colecciones.",
        slidingSign: "Positivo",
        uterosacralLigaments: "Libres, sin nodulaciones palpables.",
        endometriosisFoci: "",
        breastPattern:
          "Parénquima fibroglandular de distribución simétrica.",
        rightBreastFindings:
          "Sin lesiones sólidas ni quísticas dominantes. Planos respetados.",
        leftBreastFindings:
          "Sin lesiones nodulares ni microcalcificaciones agrupadas.",
        biradsCategory: "BI-RADS 1",
        gestationalSacsCount: 1,
        embryoCrownRumpLengthMm: undefined,
        gestationalAgeByEcho: "",
        fetalHeartRate: undefined,
        placentaLocation: "",
        amnioticFluidIndex: "",
      },
      conclusion: "1. ÚTERO Y OVARIOS DENTRO DE PARÁMETROS NORMALES.",
      recommendations: "Control ginecológico preventivo periódico.",
      images: [],
    },
  });

  const watchedUltrasoundType = useWatch({
    control: form.control,
    name: "ultrasoundType",
  });
  const watchedBirads = useWatch({
    control: form.control,
    name: "findings.biradsCategory",
  });
  const watchedEndometrium = useWatch({
    control: form.control,
    name: "findings.endometriumThicknessMm",
  });
  const watchedDimensions = useWatch({
    control: form.control,
    name: "findings.uterusDimensions",
  });
  const watchedVolume = useWatch({
    control: form.control,
    name: "findings.uterusVolumeCc",
  });

  const filteredUltrasounds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ultrasounds;
    return ultrasounds.filter(
      (u) =>
        u.ultrasoundType.toLowerCase().includes(q) ||
        ULTRASOUND_TYPE_LABELS[u.ultrasoundType].toLowerCase().includes(q) ||
        u.indication.toLowerCase().includes(q) ||
        u.conclusion.toLowerCase().includes(q) ||
        u.doctorName.toLowerCase().includes(q) ||
        (u.findings.biradsCategory || "").toLowerCase().includes(q)
    );
  }, [ultrasounds, search]);

  const pagination = usePagination(filteredUltrasounds, 10);

  const setSearch = (val: string) => {
    setSearchState(val);
    pagination.setCurrentPage(1);
  };

  const cleanupSessionOrphans = async () => {
    const toDelete = [...sessionUploadedPaths];
    setSessionUploadedPaths([]);
    if (toDelete.length === 0) return;

    await Promise.allSettled(
      toDelete.map((path) =>
        fetch(`/api/clinical-images?path=${encodeURIComponent(path)}`, {
          method: "DELETE",
        })
      )
    );
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      void cleanupSessionOrphans();
    }
    setDialogOpen(open);
  };

  const openCreateModal = () => {
    setSessionUploadedPaths([]);
    setEditingItem(null);
    setSaveAndPrintIntent(false);
    setDraftImages([]);
    const firstTemplate = templates[0]?.payload ?? ULTRASOUND_PRESETS[0];

    form.reset({
      patientId,
      consultationId: consultations[0]?.id ?? "",
      reportDate: todayStr,
      ultrasoundType: firstTemplate.ultrasoundType,
      indication: firstTemplate.indication,
      findings: toUltrasoundFormFindings(firstTemplate.findings),
      conclusion: firstTemplate.conclusion,
      recommendations: firstTemplate.recommendations ?? "",
      images: [],
    });
    setDialogOpen(true);
  };

  const openEditModal = (item: UltrasoundReportItem) => {
    setSessionUploadedPaths([]);
    setEditingItem(item);
    setSaveAndPrintIntent(false);
    setDraftImages(item.images.map((img) => ({ ...img })));

    form.reset({
      patientId: item.patientId,
      consultationId: item.consultationId ?? "",
      reportDate: item.reportDate,
      ultrasoundType: item.ultrasoundType,
      indication: item.indication,
      findings: toUltrasoundFormFindings(item.findings),
      conclusion: item.conclusion,
      recommendations: item.recommendations ?? "",
      images: item.images.map((img) => ({ ...img })),
    });
    setDialogOpen(true);
  };

  const applyTemplate = (template: UltrasoundClinicalTemplateItem) => {
    form.setValue("ultrasoundType", template.payload.ultrasoundType, {
      shouldDirty: true,
    });
    form.setValue("indication", template.payload.indication, {
      shouldDirty: true,
    });
    const currentFindings = form.getValues("findings");
    form.setValue(
      "findings",
      {
        ...currentFindings,
        ...toUltrasoundFormFindings(template.payload.findings),
      },
      { shouldDirty: true }
    );
    form.setValue("conclusion", template.payload.conclusion, {
      shouldDirty: true,
    });
    form.setValue(
      "recommendations",
      template.payload.recommendations ?? "",
      { shouldDirty: true }
    );
    toast.success(`Plantilla aplicada: ${template.name}`);
  };

  const buildTemplatePayloadFromForm = (): UltrasoundTemplatePayload => {
    const vals = form.getValues();
    return {
      ultrasoundType: vals.ultrasoundType,
      indication: vals.indication,
      findings: vals.findings,
      conclusion: vals.conclusion,
      recommendations: vals.recommendations ?? "",
    };
  };

  const autoCalculateVolume = (dimsText?: string) => {
    const source = dimsText ?? form.getValues("findings.uterusDimensions") ?? "";
    const vol = calculateEllipsoidVolumeCc(source);
    if (vol !== null) {
      form.setValue("findings.uterusVolumeCc", vol, { shouldDirty: true });
    }
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = Math.max(0, 16 - draftImages.length);
    if (remainingSlots === 0) {
      toast.error("Alcanzó el máximo de 16 capturas por estudio ecográfico.");
      return;
    }

    const fileArray = Array.from(files).slice(0, remainingSlots);
    setIsUploadingImages(true);

    try {
      const uploadedRecords: ClinicalImageRecord[] = [];

      for (let idx = 0; idx < fileArray.length; idx++) {
        const rawFile = fileArray[idx];
        const compressed = await compressClinicalImageFile(rawFile);

        const formData = new FormData();
        formData.append("patientId", patientId);
        formData.append("module", "ecografias");
        formData.append(
          "file",
          new File([compressed.blob], compressed.filename, {
            type: "image/jpeg",
          })
        );

        const res = await fetch("/api/clinical-images", {
          method: "POST",
          body: formData,
        });

        const json = (await res.json()) as {
          success?: boolean;
          error?: string;
          data?: { storagePath: string };
        };

        if (!res.ok || !json.success || !json.data?.storagePath) {
          throw new Error(
            json.error || `No se pudo subir "${rawFile.name}" al bucket privado.`
          );
        }

        const storagePath = json.data.storagePath;
        setSessionUploadedPaths((prev) => [...prev, storagePath]);

        const cleanName = rawFile.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ")
          .trim();

        uploadedRecords.push({
          storagePath,
          caption:
            cleanName.length >= 2
              ? cleanName
              : `Captura ecográfica ${draftImages.length + uploadedRecords.length + 1}`,
        });
      }

      const nextList = [...draftImages, ...uploadedRecords];
      setDraftImages(nextList);
      form.setValue("images", nextList, { shouldDirty: true });
      toast.success(
        `${uploadedRecords.length} captura(s) ecográfica(s) subida(s) al Storage privado.`
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Error procesando o subiendo capturas ecográficas."
      );
    } finally {
      setIsUploadingImages(false);
    }
  };

  const updateDraftImageCaption = (index: number, caption: string) => {
    setDraftImages((prev) => {
      const next = prev.map((item, idx) =>
        idx === index ? { ...item, caption } : item
      );
      form.setValue("images", next, { shouldDirty: true });
      return next;
    });
  };

  const removeDraftImage = async (index: number) => {
    const target = draftImages[index];
    if (!target) return;

    const next = draftImages.filter((_, idx) => idx !== index);
    setDraftImages(next);
    form.setValue("images", next, { shouldDirty: true });

    if (sessionUploadedPaths.includes(target.storagePath)) {
      setSessionUploadedPaths((prev) =>
        prev.filter((p) => p !== target.storagePath)
      );
      await fetch(
        `/api/clinical-images?path=${encodeURIComponent(target.storagePath)}`,
        { method: "DELETE" }
      ).catch(() => undefined);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: CreateUltrasoundInput = {
      ...values,
      images: draftImages,
    };

    const res = editingItem
      ? await updateUltrasoundAction({ ...payload, id: editingItem.id })
      : await createUltrasoundAction(payload);

    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo guardar el informe ecográfico.");
      return;
    }

    const saved = res.data;
    setSessionUploadedPaths([]);

    if (editingItem) {
      onUltrasoundsChange(
        ultrasounds.map((item) => (item.id === saved.id ? saved : item))
      );
      toast.success("Informe ecográfico actualizado.");
    } else {
      onUltrasoundsChange([saved, ...ultrasounds]);
      toast.success("Informe ecográfico registrado en la historia clínica.");
    }

    setDialogOpen(false);
    if (saveAndPrintIntent) {
      setSaveAndPrintIntent(false);
      setPrintingItem(saved);
    }
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await deleteUltrasoundAction({ id: deleteTarget.id });
      if (!res.success) {
        toast.error(res.error || "No se pudo eliminar la ecografía.");
        return;
      }
      onUltrasoundsChange(ultrasounds.filter((u) => u.id !== deleteTarget.id));
      toast.success("Informe ecográfico archivado.");
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  return {
    items: pagination.paginatedItems,
    totalCount: ultrasounds.length,
    filteredCount: filteredUltrasounds.length,
    pagination,
    search,
    setSearch,
    dialogOpen,
    onDialogOpenChange: handleDialogOpenChange,
    editingItem,
    form,
    isSubmitting: form.formState.isSubmitting,
    isUploadingImages,
    draftImages,
    watchedUltrasoundType,
    watchedBirads,
    watchedEndometrium,
    watchedDimensions,
    watchedVolume,
    typeOptions: ULTRASOUND_TYPES,
    uterusPositions: UTERUS_POSITIONS,
    endometriumPatterns: ENDOMETRIUM_PATTERNS,
    slidingSignOptions: SLIDING_SIGN_OPTIONS,
    biradsOptions: BIRADS_OPTIONS,
    openCreateModal,
    openEditModal,
    applyTemplate,
    buildTemplatePayloadFromForm,
    autoCalculateVolume,
    handleUploadFiles,
    updateDraftImageCaption,
    removeDraftImage,
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
  };
}
