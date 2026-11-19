"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { ClinicalImageRecord } from "@/db/schema/specialty";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import { usePagination } from "@/hooks/use-pagination";
import { compressClinicalImageFile } from "@/lib/image-compressor";
import { getPeruDateString } from "@/lib/utils";
import {
  createColposcopyAction,
  deleteColposcopyAction,
  updateColposcopyAction,
} from "../actions/colposcopia.actions";
import {
  classifyColposcopyFindings,
  COLPOSCOPY_CAPTION_PRESETS,
  createColposcopySchema,
  SCHILLER_TEST_OPTIONS,
  SCJ_VISIBILITY_OPTIONS,
  TRANSFORMATION_ZONE_OPTIONS,
  type ClockHour,
  type ColposcopyReportItem,
  type CreateColposcopyInput,
} from "../colposcopia.schema";

export interface UseColposcopiaParams {
  patientId: string;
  colposcopies: ColposcopyReportItem[];
  onColposcopiesChange: (next: ColposcopyReportItem[]) => void;
  consultations: MedicalConsultationItem[];
}

function buildDefaultColposcopyValues(
  patientId: string,
  todayStr: string,
  consultationId = ""
): CreateColposcopyInput {
  return {
    patientId,
    consultationId,
    reportDate: todayStr,
    adequateColposcopy: true,
    squamocolumnarJunctionVisible: "Visible",
    transformationZoneType: "Tipo 1",
    matureSquamousEpithelium: true,
    ectopy: false,
    thinAcetowhiteEpithelium: false,
    denseAcetowhiteEpithelium: false,
    irregularBorder: false,
    fineMosaic: false,
    coarseMosaic: false,
    finePunctation: false,
    coarsePunctation: false,
    atypicalVessels: false,
    extendedFindings: {
      inadequateReason: "",
      nabothCyst: false,
      cryptOpenings: false,
      deciduosis: false,
      rapidAcetowhite: false,
      thickenedGlands: false,
      sharpBorders: false,
      innerBorderSign: false,
      ridgeSign: false,
      leukoplakia: false,
      erosion: false,
      fragileVessels: false,
      irregularSurface: false,
      exophyticLesion: false,
      necrosis: false,
      nodularTumor: false,
      congenitalTZ: false,
      condyloma: false,
      polyp: false,
      inflammation: false,
      stenosis: false,
      postTreatmentAnomaly: false,
      endometriosisFoci: false,
      otherFindings: "",
    },
    schillerTest: SCHILLER_TEST_OPTIONS[0],
    cervicalBiopsyTaken: false,
    biopsyClockHours: [],
    images: [],
    diagnosis:
      "Colposcopía adecuada satisfactoria sin lesiones intraepiteliales (Cérvix sano)",
    planRecommendations:
      "Continuar control ginecológico preventivo periódico y tamizaje citológico / VPH según norma vigente.",
    cie10Code: "Z01.4",
  };
}

export function useColposcopia({
  patientId,
  colposcopies,
  onColposcopiesChange,
  consultations,
}: UseColposcopiaParams) {
  const todayStr = useMemo(() => getPeruDateString(), []);

  const [search, setSearchState] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ColposcopyReportItem | null>(
    null
  );
  const [saveAndPrintIntent, setSaveAndPrintIntent] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [draftImages, setDraftImages] = useState<ClinicalImageRecord[]>([]);
  const [sessionUploadedPaths, setSessionUploadedPaths] = useState<string[]>(
    []
  );

  const [printingItem, setPrintingItem] = useState<ColposcopyReportItem | null>(
    null
  );
  const [showCoverPage, setShowCoverPage] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ColposcopyReportItem | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<CreateColposcopyInput>({
    resolver: zodResolver(createColposcopySchema),
    defaultValues: buildDefaultColposcopyValues(patientId, todayStr),
  });

  const watchedValues = useWatch({ control: form.control });

  const classification = useMemo(
    () =>
      classifyColposcopyFindings({
        thinAcetowhiteEpithelium: watchedValues.thinAcetowhiteEpithelium,
        irregularBorder: watchedValues.irregularBorder,
        fineMosaic: watchedValues.fineMosaic,
        finePunctation: watchedValues.finePunctation,
        denseAcetowhiteEpithelium: watchedValues.denseAcetowhiteEpithelium,
        coarseMosaic: watchedValues.coarseMosaic,
        coarsePunctation: watchedValues.coarsePunctation,
        atypicalVessels: watchedValues.atypicalVessels,
        extendedFindings: watchedValues.extendedFindings,
      }),
    [watchedValues]
  );

  const filteredColposcopies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return colposcopies;
    return colposcopies.filter(
      (c) =>
        c.diagnosis.toLowerCase().includes(q) ||
        c.cie10Code.toLowerCase().includes(q) ||
        c.transformationZoneType.toLowerCase().includes(q) ||
        c.schillerTest.toLowerCase().includes(q) ||
        c.doctorName.toLowerCase().includes(q)
    );
  }, [colposcopies, search]);

  const pagination = usePagination(filteredColposcopies, 10);

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

    form.reset(
      buildDefaultColposcopyValues(
        patientId,
        todayStr,
        consultations[0]?.id ?? ""
      )
    );
    setDialogOpen(true);
  };

  const openEditModal = (item: ColposcopyReportItem) => {
    setSessionUploadedPaths([]);
    setEditingItem(item);
    setSaveAndPrintIntent(false);
    setDraftImages(item.images.map((img) => ({ ...img })));

    const scj = (SCJ_VISIBILITY_OPTIONS as readonly string[]).includes(
      item.squamocolumnarJunctionVisible
    )
      ? (item.squamocolumnarJunctionVisible as (typeof SCJ_VISIBILITY_OPTIONS)[number])
      : "Visible";

    const tz = (TRANSFORMATION_ZONE_OPTIONS as readonly string[]).includes(
      item.transformationZoneType
    )
      ? (item.transformationZoneType as (typeof TRANSFORMATION_ZONE_OPTIONS)[number])
      : "Tipo 1";

    const clockHours = item.biopsyClockHours.filter((h): h is ClockHour =>
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].includes(
        h
      )
    );

    form.reset({
      patientId: item.patientId,
      consultationId: item.consultationId ?? "",
      reportDate: item.reportDate,
      adequateColposcopy: item.adequateColposcopy,
      squamocolumnarJunctionVisible: scj,
      transformationZoneType: tz,
      matureSquamousEpithelium: item.matureSquamousEpithelium,
      ectopy: item.ectopy,
      thinAcetowhiteEpithelium: item.thinAcetowhiteEpithelium,
      denseAcetowhiteEpithelium: item.denseAcetowhiteEpithelium,
      irregularBorder: item.irregularBorder,
      fineMosaic: item.fineMosaic,
      coarseMosaic: item.coarseMosaic,
      finePunctation: item.finePunctation,
      coarsePunctation: item.coarsePunctation,
      atypicalVessels: item.atypicalVessels,
      extendedFindings: {
        inadequateReason: item.extendedFindings.inadequateReason ?? "",
        nabothCyst: Boolean(item.extendedFindings.nabothCyst),
        cryptOpenings: Boolean(item.extendedFindings.cryptOpenings),
        deciduosis: Boolean(item.extendedFindings.deciduosis),
        rapidAcetowhite: Boolean(item.extendedFindings.rapidAcetowhite),
        thickenedGlands: Boolean(item.extendedFindings.thickenedGlands),
        sharpBorders: Boolean(item.extendedFindings.sharpBorders),
        innerBorderSign: Boolean(item.extendedFindings.innerBorderSign),
        ridgeSign: Boolean(item.extendedFindings.ridgeSign),
        leukoplakia: Boolean(item.extendedFindings.leukoplakia),
        erosion: Boolean(item.extendedFindings.erosion),
        fragileVessels: Boolean(item.extendedFindings.fragileVessels),
        irregularSurface: Boolean(item.extendedFindings.irregularSurface),
        exophyticLesion: Boolean(item.extendedFindings.exophyticLesion),
        necrosis: Boolean(item.extendedFindings.necrosis),
        nodularTumor: Boolean(item.extendedFindings.nodularTumor),
        congenitalTZ: Boolean(item.extendedFindings.congenitalTZ),
        condyloma: Boolean(item.extendedFindings.condyloma),
        polyp: Boolean(item.extendedFindings.polyp),
        inflammation: Boolean(item.extendedFindings.inflammation),
        stenosis: Boolean(item.extendedFindings.stenosis),
        postTreatmentAnomaly: Boolean(
          item.extendedFindings.postTreatmentAnomaly
        ),
        endometriosisFoci: Boolean(item.extendedFindings.endometriosisFoci),
        otherFindings: item.extendedFindings.otherFindings ?? "",
      },
      schillerTest: item.schillerTest,
      cervicalBiopsyTaken: item.cervicalBiopsyTaken,
      biopsyClockHours: clockHours,
      images: item.images.map((img) => ({ ...img })),
      diagnosis: item.diagnosis,
      planRecommendations: item.planRecommendations,
      cie10Code: item.cie10Code,
    });
    setDialogOpen(true);
  };

  const handleToggleClockHours = (hours: string[]) => {
    const validHours = hours.filter((h): h is ClockHour =>
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].includes(
        h
      )
    );
    form.setValue("biopsyClockHours", validHours, { shouldDirty: true });
    if (validHours.length > 0 && !form.getValues("cervicalBiopsyTaken")) {
      form.setValue("cervicalBiopsyTaken", true, { shouldDirty: true });
    }
  };

  const handleToggleBiopsyTaken = (taken: boolean) => {
    form.setValue("cervicalBiopsyTaken", taken, { shouldDirty: true });
    if (!taken) {
      form.setValue("biopsyClockHours", [], { shouldDirty: true });
    }
  };

  const applyClassificationSuggestion = () => {
    form.setValue("diagnosis", classification.suggestedDiagnosis, {
      shouldDirty: true,
    });
    form.setValue("cie10Code", classification.suggestedCie10, {
      shouldDirty: true,
    });
    form.setValue("planRecommendations", classification.suggestedPlan, {
      shouldDirty: true,
    });
    toast.success(`Sugerencia aplicada: ${classification.suggestedCie10}`);
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = Math.max(0, 16 - draftImages.length);
    if (remainingSlots === 0) {
      toast.error("Alcanzó el máximo de 16 capturas por evaluación.");
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
        formData.append("module", "colposcopia");
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

        const nextSlotIndex = draftImages.length + uploadedRecords.length;
        const suggestedPreset =
          COLPOSCOPY_CAPTION_PRESETS[
            nextSlotIndex % COLPOSCOPY_CAPTION_PRESETS.length
          ];

        uploadedRecords.push({
          storagePath,
          caption: suggestedPreset,
        });
      }

      const nextList = [...draftImages, ...uploadedRecords];
      setDraftImages(nextList);
      form.setValue("images", nextList, { shouldDirty: true });
      toast.success(
        `${uploadedRecords.length} captura(s) colposcópica(s) subida(s) al Storage privado.`
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Error procesando o subiendo capturas colposcópicas."
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
    const payload: CreateColposcopyInput = {
      ...values,
      images: draftImages,
    };

    const res = editingItem
      ? await updateColposcopyAction({ ...payload, id: editingItem.id })
      : await createColposcopyAction(payload);

    if (!res.success || !res.data) {
      toast.error(res.error || "No se pudo guardar el informe colposcópico.");
      return;
    }

    const saved = res.data;
    setSessionUploadedPaths([]);

    if (editingItem) {
      onColposcopiesChange(
        colposcopies.map((item) => (item.id === saved.id ? saved : item))
      );
      toast.success("Informe de colposcopía actualizado.");
    } else {
      onColposcopiesChange([saved, ...colposcopies]);
      toast.success("Colposcopía digital registrada en la historia clínica.");
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
      const res = await deleteColposcopyAction({ id: deleteTarget.id });
      if (!res.success) {
        toast.error(res.error || "No se pudo eliminar la colposcopía.");
        return;
      }
      onColposcopiesChange(
        colposcopies.filter((c) => c.id !== deleteTarget.id)
      );
      toast.success("Informe de colposcopía archivado.");
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  return {
    items: pagination.paginatedItems,
    totalCount: colposcopies.length,
    filteredCount: filteredColposcopies.length,
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
    watchedValues,
    classification,
    scjOptions: SCJ_VISIBILITY_OPTIONS,
    tzOptions: TRANSFORMATION_ZONE_OPTIONS,
    schillerOptions: SCHILLER_TEST_OPTIONS,
    captionPresets: COLPOSCOPY_CAPTION_PRESETS,
    openCreateModal,
    openEditModal,
    handleToggleClockHours,
    handleToggleBiopsyTaken,
    applyClassificationSuggestion,
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
