"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type {
  ClinicalImageRecord,
  UltrasoundBreastLesionRecord,
  UltrasoundDopplerRecord,
  UltrasoundDopplerVesselRecord,
} from "@/db/schema/specialty";
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
  BREAST_ACR_LABELS,
  BREAST_ACR_TYPES,
  BREAST_LESION_TYPES,
  calculateBppTotal,
  calculateDopplerDerivedIndices,
  calculateEllipsoidVolumeCc,
  calculateHadlockEfwGr,
  createUltrasoundSchema,
  DOPPLER_VESSEL_META,
  ENDOMETRIUM_PATTERNS,
  SLIDING_SIGN_OPTIONS,
  STANDARD_BREAST_COMPLEMENT,
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

export function toOptionalEnumValue<T extends string>(
  raw: unknown
): T | undefined {
  if (typeof raw !== "string") return undefined;
  const clean = raw.trim();
  return clean ? (clean as T) : undefined;
}

function normalizeBirads(
  raw?: string | null
): (typeof BIRADS_OPTIONS)[number] | undefined {
  if (!raw) return undefined;
  return BIRADS_OPTIONS.find((opt) => opt === raw);
}

function mapDopplerToForm(
  raw?: UltrasoundDopplerRecord
): UltrasoundDopplerRecord | undefined {
  if (!raw) return undefined;
  const mapped: UltrasoundDopplerRecord = {};
  let hasAny = false;
  for (const meta of DOPPLER_VESSEL_META) {
    const v = raw[meta.key];
    if (!v) continue;
    const entry: UltrasoundDopplerVesselRecord = {
      ...(typeof v.pi === "number" ? { pi: v.pi } : {}),
      ...(v.percentile ? { percentile: v.percentile } : {}),
      ...(v.status ? { status: v.status } : {}),
    };
    mapped[meta.key] = entry;
    hasAny = true;
  }
  return hasAny ? mapped : undefined;
}

function toUltrasoundFormFindings(
  raw?: CreateUltrasoundInput["findings"] | UltrasoundReportItem["findings"]
): CreateUltrasoundInput["findings"] {
  const f = raw ?? {};
  return {
    referringDoctor: f.referringDoctor,
    uterusPosition: f.uterusPosition,
    uterusDimensions: f.uterusDimensions,
    uterusVolumeCc: f.uterusVolumeCc,
    myometriumStatus: f.myometriumStatus,
    endometriumThicknessMm: f.endometriumThicknessMm,
    endometriumPattern: f.endometriumPattern,
    cervixLengthMm: f.cervixLengthMm,
    cervixStatus: f.cervixStatus,
    uterusEcopulsionPain: f.uterusEcopulsionPain,
    rightOvaryDimensions: f.rightOvaryDimensions,
    rightOvaryVolumeCc: f.rightOvaryVolumeCc,
    leftOvaryDimensions: f.leftOvaryDimensions,
    leftOvaryVolumeCc: f.leftOvaryVolumeCc,
    ovaryEcopulsionPain: f.ovaryEcopulsionPain,
    periOvarianFluid: f.periOvarianFluid,
    ovariesNotes: f.ovariesNotes,
    douglasPouch: f.douglasPouch,
    endometriosisFoci: f.endometriosisFoci,
    slidingSign: f.slidingSign,
    uterosacralLigaments: f.uterosacralLigaments,
    breastAcrType: f.breastAcrType,
    breastPattern: f.breastPattern,
    rightBreastFindings: f.rightBreastFindings,
    leftBreastFindings: f.leftBreastFindings,
    breastLesions: Array.isArray(f.breastLesions)
      ? f.breastLesions.map((l) => ({ ...l }))
      : undefined,
    breastComplement: f.breastComplement,
    biradsCategory: normalizeBirads(f.biradsCategory),
    gestationalSacsCount: f.gestationalSacsCount,
    gestationalSacMm: f.gestationalSacMm,
    yolkSacMm: f.yolkSacMm,
    embryoCrownRumpLengthMm: f.embryoCrownRumpLengthMm,
    gestationalAgeByEcho: f.gestationalAgeByEcho,
    fetalHeartRate: f.fetalHeartRate,
    choriodecidualReaction: f.choriodecidualReaction,
    nuchalTranslucencyMm: f.nuchalTranslucencyMm,
    nasalBone: f.nasalBone,
    ductusVenosusWave: f.ductusVenosusWave,
    ductusVenosusPi: f.ductusVenosusPi,
    uterineArteriesMeanPi: f.uterineArteriesMeanPi,
    chromosomopathyRisk: f.chromosomopathyRisk,
    preeclampsiaRisk: f.preeclampsiaRisk,
    fetalStatic: f.fetalStatic,
    fetalSex: f.fetalSex,
    fetalAnatomySummary: f.fetalAnatomySummary,
    fetalHeartFourChambers: f.fetalHeartFourChambers,
    fetalAbdominalWall: f.fetalAbdominalWall,
    fetalKidneys: f.fetalKidneys,
    fetalSpine: f.fetalSpine,
    bpdMm: f.bpdMm,
    hcMm: f.hcMm,
    acMm: f.acMm,
    flMm: f.flMm,
    estimatedFetalWeightGr: f.estimatedFetalWeightGr,
    estimatedFetalWeightPercentile: f.estimatedFetalWeightPercentile,
    bppBodyMovements: f.bppBodyMovements,
    bppBreathingMovements: f.bppBreathingMovements,
    bppMuscleTone: f.bppMuscleTone,
    bppAmnioticFluid: f.bppAmnioticFluid,
    placentaLocation: f.placentaLocation,
    placentaGrade: f.placentaGrade,
    placentaHematomas: f.placentaHematomas,
    umbilicalCord: f.umbilicalCord,
    amnioticFluidIndex: f.amnioticFluidIndex,
    amnioticFluidIlaMm: f.amnioticFluidIlaMm,
    includeDoppler: f.includeDoppler,
    doppler: mapDopplerToForm(f.doppler),
  };
}

export function useEcografias({
  patientId,
  ultrasounds,
  onUltrasoundsChange,
  consultations,
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
      indication: "",
      findings: {},
      conclusion: "",
      recommendations: "",
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
  const watchedRightOvaryVolume = useWatch({
    control: form.control,
    name: "findings.rightOvaryVolumeCc",
  });
  const watchedLeftOvaryVolume = useWatch({
    control: form.control,
    name: "findings.leftOvaryVolumeCc",
  });
  const watchedBreastLesions = useWatch({
    control: form.control,
    name: "findings.breastLesions",
  });
  const watchedIncludeDoppler = useWatch({
    control: form.control,
    name: "findings.includeDoppler",
  });
  const watchedBppFields = useWatch({
    control: form.control,
    name: [
      "findings.bppBodyMovements",
      "findings.bppBreathingMovements",
      "findings.bppMuscleTone",
      "findings.bppAmnioticFluid",
    ],
  });

  const bppTotal = useMemo(
    () =>
      calculateBppTotal({
        bppBodyMovements: watchedBppFields[0],
        bppBreathingMovements: watchedBppFields[1],
        bppMuscleTone: watchedBppFields[2],
        bppAmnioticFluid: watchedBppFields[3],
      }),
    [watchedBppFields]
  );

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

    form.reset({
      patientId,
      consultationId: consultations[0]?.id ?? "",
      reportDate: todayStr,
      ultrasoundType: "TRANSVAGINAL",
      indication: "",
      findings: {},
      conclusion: "",
      recommendations: "",
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
    const existingReferringDoctor = form.getValues("findings.referringDoctor");
    const nextFindings = toUltrasoundFormFindings(template.payload.findings);
    if (existingReferringDoctor?.trim()) {
      nextFindings.referringDoctor = existingReferringDoctor.trim();
    }
    form.setValue("findings", nextFindings, { shouldDirty: true });
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

  const autoCalculateOvaryVolume = (
    side: "right" | "left",
    dimsText?: string
  ) => {
    const field =
      side === "right"
        ? "findings.rightOvaryDimensions"
        : "findings.leftOvaryDimensions";
    const volField =
      side === "right"
        ? "findings.rightOvaryVolumeCc"
        : "findings.leftOvaryVolumeCc";
    const source = dimsText ?? form.getValues(field) ?? "";
    const vol = calculateEllipsoidVolumeCc(source);
    if (vol !== null) {
      form.setValue(volField, vol, { shouldDirty: true });
    }
  };

  const autoCalculateHadlockEfw = () => {
    const efw = calculateHadlockEfwGr(
      toOptionalNumber(form.getValues("findings.bpdMm")),
      toOptionalNumber(form.getValues("findings.hcMm")),
      toOptionalNumber(form.getValues("findings.acMm")),
      toOptionalNumber(form.getValues("findings.flMm"))
    );
    if (efw === null) {
      toast.info(
        "Ingrese medidas válidas de DBP, CC, CA y LF (en mm) para calcular Hadlock."
      );
      return;
    }
    form.setValue("findings.estimatedFetalWeightGr", efw, {
      shouldDirty: true,
    });
    toast.success(`Ponderado fetal estimado (Hadlock): ${efw} g`);
  };

  const autoCalculateDopplerIndices = () => {
    const currentDoppler = form.getValues("findings.doppler");
    const derived = calculateDopplerDerivedIndices(currentDoppler);
    if (
      derived.cerebroplacentalRatioPi === undefined &&
      derived.meanUterinePi === undefined
    ) {
      toast.info(
        "Ingrese IP de Arteria Umbilical y ACM para ICP, o ambas Arterias Uterinas para el promedio."
      );
      return;
    }
    if (derived.cerebroplacentalRatioPi !== undefined) {
      form.setValue(
        "findings.doppler.cerebroplacentalRatio.pi",
        derived.cerebroplacentalRatioPi,
        { shouldDirty: true }
      );
    }
    if (derived.meanUterinePi !== undefined) {
      form.setValue(
        "findings.doppler.meanUterineArteries.pi",
        derived.meanUterinePi,
        { shouldDirty: true }
      );
    }
    toast.success("Índices Doppler calculados automáticamente.");
  };

  const addBreastLesion = (lesionType?: string) => {
    const current = form.getValues("findings.breastLesions") ?? [];
    const typeName = lesionType?.trim() || "Quiste simple";
    const newLesion: UltrasoundBreastLesionRecord = {
      id: `lesion-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      breastSide: "Derecha",
      lesionType: typeName,
      shape: "ovalada",
      margins:
        typeName === "Quiste complicado"
          ? "microlobulados con tabiques internos"
          : "circunscritos",
      orientation: "paralela",
      echoPattern: typeName === "Fibroadenoma" ? "isoecoico" : "anecoico",
      posteriorAcoustic: "con refuerzo posterior",
    };
    form.setValue("findings.breastLesions", [...current, newLesion], {
      shouldDirty: true,
    });
  };

  const updateBreastLesion = (
    index: number,
    patch: Partial<UltrasoundBreastLesionRecord>
  ) => {
    const current = form.getValues("findings.breastLesions") ?? [];
    const next = current.map((item, idx) =>
      idx === index ? { ...item, ...patch } : item
    );
    form.setValue("findings.breastLesions", next, { shouldDirty: true });
  };

  const removeBreastLesion = (index: number) => {
    const current = form.getValues("findings.breastLesions") ?? [];
    const next = current.filter((_, idx) => idx !== index);
    form.setValue(
      "findings.breastLesions",
      next.length > 0 ? next : undefined,
      { shouldDirty: true }
    );
  };

  const fillStandardBreastComplement = () => {
    form.setValue("findings.breastComplement", STANDARD_BREAST_COMPLEMENT, {
      shouldDirty: true,
    });
    toast.success("Complemento mamario normal aplicado.");
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
    watchedRightOvaryVolume,
    watchedLeftOvaryVolume,
    watchedBreastLesions: watchedBreastLesions ?? [],
    watchedIncludeDoppler,
    bppTotal,
    typeOptions: ULTRASOUND_TYPES,
    uterusPositions: UTERUS_POSITIONS,
    endometriumPatterns: ENDOMETRIUM_PATTERNS,
    slidingSignOptions: SLIDING_SIGN_OPTIONS,
    biradsOptions: BIRADS_OPTIONS,
    breastAcrTypes: BREAST_ACR_TYPES,
    breastAcrLabels: BREAST_ACR_LABELS,
    breastLesionTypes: BREAST_LESION_TYPES,
    openCreateModal,
    openEditModal,
    applyTemplate,
    buildTemplatePayloadFromForm,
    autoCalculateVolume,
    autoCalculateOvaryVolume,
    autoCalculateHadlockEfw,
    autoCalculateDopplerIndices,
    addBreastLesion,
    updateBreastLesion,
    removeBreastLesion,
    fillStandardBreastComplement,
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
