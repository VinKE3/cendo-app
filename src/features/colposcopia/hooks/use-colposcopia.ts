"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type {
  ClinicalImageRecord,
  ColposcopyAdditionalDiagnosisRecord,
} from "@/db/schema/specialty";
import type {
  ColposcopyClinicalTemplateItem,
  ColposcopyTemplatePayload,
} from "@/features/clinical-templates/clinical-templates.schema";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type { PatientBackgroundItem } from "@/features/pacientes/pacientes.schema";
import { usePagination } from "@/hooks/use-pagination";
import { compressClinicalImageFile } from "@/lib/image-compressor";
import { getPeruDateString } from "@/lib/utils";
import {
  createColposcopyAction,
  deleteColposcopyAction,
  updateColposcopyAction,
} from "../actions/colposcopia.actions";
import {
  buildColposcopyBackgroundSyncPatch,
  classifyColposcopyFindings,
  COLPOSCOPY_CAPTION_PRESETS,
  COLPOSCOPY_DIAGNOSIS_PRESETS,
  COLPOSCOPY_PAP_OPTIONS,
  COLPOSCOPY_VPH_OPTIONS,
  createColposcopySchema,
  normalizeScjVisibility,
  parseBackgroundPapToColposcopy,
  parseBackgroundVphToColposcopy,
  SCHILLER_TEST_OPTIONS,
  SCJ_VISIBILITY_OPTIONS,
  TRANSFORMATION_ZONE_OPTIONS,
  VALID_CLOCK_HOURS,
  type ClockHour,
  type ColposcopyReportItem,
  type CreateColposcopyInput,
} from "../colposcopia.schema";

export interface UseColposcopiaParams {
  patientId: string;
  background?: PatientBackgroundItem | null;
  onBackgroundSynced?: (patch: Partial<PatientBackgroundItem>) => void;
  colposcopies: ColposcopyReportItem[];
  onColposcopiesChange: (next: ColposcopyReportItem[]) => void;
  consultations: MedicalConsultationItem[];
  templates?: ColposcopyClinicalTemplateItem[];
}

function buildComplementaryDefaultsFromBackground(
  background?: PatientBackgroundItem | null
) {
  const parsedPap = parseBackgroundPapToColposcopy(background?.papHistory);
  const parsedVph = parseBackgroundVphToColposcopy(background?.vphTestHistory);

  return {
    nps:
      background?.sexualPartnersCount != null
        ? String(background.sexualPartnersCount)
        : "",
    irs:
      background?.sexualDebutAge != null
        ? String(background.sexualDebutAge)
        : "",
    fur: background?.lastMenstrualPeriod ?? "",
    obstetricFormula: background?.obstetricFormula ?? "",
    mac: background?.contraceptiveMethod ?? "",
    papResult: parsedPap.papResult,
    papOther: parsedPap.papOther,
    vphResult: parsedVph.vphResult,
    vphSerotype: parsedVph.vphSerotype,
  };
}

function buildDefaultColposcopyValues(
  patientId: string,
  todayStr: string,
  consultationId = "",
  background?: PatientBackgroundItem | null
): CreateColposcopyInput {
  const comp = buildComplementaryDefaultsFromBackground(background);

  return {
    patientId,
    consultationId,
    reportDate: todayStr,
    adequateColposcopy: true,
    squamocolumnarJunctionVisible: "Completamente visible",
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
      ...comp,
      atrophicSquamousEpithelium: false,
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
      necroticUlceration: false,
      nodularTumor: false,
      congenitalTZ: false,
      condyloma: false,
      polyp: false,
      inflammation: false,
      stenosis: false,
      congenitalAnomaly: false,
      postTreatmentAnomaly: false,
      endometriosisFoci: false,
      otherFindings: "",
      additionalDiagnoses: [],
    },
    schillerTest: SCHILLER_TEST_OPTIONS[0],
    cervicalBiopsyTaken: false,
    biopsyClockHours: [],
    images: [],
    diagnosis:
      "Hallazgos colposcópicos normales (Colposcopía sin alteraciones)",
    planRecommendations:
      "Continuar control ginecológico preventivo periódico y tamizaje citológico / VPH según norma vigente.",
    cie10Code: "Z01.4",
    syncBackgroundToHistory: true,
  };
}

export function useColposcopia({
  patientId,
  background = null,
  onBackgroundSynced,
  colposcopies,
  onColposcopiesChange,
  consultations,
  templates = [],
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
        consultations[0]?.id ?? "",
        background
      )
    );
    setDialogOpen(true);
  };

  const openEditModal = (item: ColposcopyReportItem) => {
    setSessionUploadedPaths([]);
    setEditingItem(item);
    setSaveAndPrintIntent(false);
    setDraftImages(item.images.map((img) => ({ ...img })));

    const scj = normalizeScjVisibility(item.squamocolumnarJunctionVisible);

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

    const compDefaults = buildComplementaryDefaultsFromBackground(background);
    const ext = item.extendedFindings ?? {};
    const hasSavedPap = Boolean(ext.papResult?.trim() || ext.papOther?.trim());
    const hasSavedVph = Boolean(ext.vphResult?.trim() || ext.vphSerotype?.trim());

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
        inadequateReason: ext.inadequateReason ?? "",
        nps: ext.nps ?? compDefaults.nps,
        irs: ext.irs ?? compDefaults.irs,
        fur: ext.fur ?? compDefaults.fur,
        obstetricFormula: ext.obstetricFormula ?? compDefaults.obstetricFormula,
        mac: ext.mac ?? compDefaults.mac,
        papResult: hasSavedPap ? (ext.papResult ?? "") : compDefaults.papResult,
        papOther: hasSavedPap ? (ext.papOther ?? "") : compDefaults.papOther,
        vphResult: hasSavedVph ? (ext.vphResult ?? "") : compDefaults.vphResult,
        vphSerotype: hasSavedVph
          ? (ext.vphSerotype ?? "")
          : compDefaults.vphSerotype,
        atrophicSquamousEpithelium: Boolean(ext.atrophicSquamousEpithelium),
        nabothCyst: Boolean(ext.nabothCyst),
        cryptOpenings: Boolean(ext.cryptOpenings),
        deciduosis: Boolean(ext.deciduosis),
        rapidAcetowhite: Boolean(ext.rapidAcetowhite),
        thickenedGlands: Boolean(ext.thickenedGlands),
        sharpBorders: Boolean(ext.sharpBorders),
        innerBorderSign: Boolean(ext.innerBorderSign),
        ridgeSign: Boolean(ext.ridgeSign),
        leukoplakia: Boolean(ext.leukoplakia),
        erosion: Boolean(ext.erosion),
        fragileVessels: Boolean(ext.fragileVessels),
        irregularSurface: Boolean(ext.irregularSurface),
        exophyticLesion: Boolean(ext.exophyticLesion),
        necrosis: Boolean(ext.necrosis),
        necroticUlceration: Boolean(ext.necroticUlceration),
        nodularTumor: Boolean(ext.nodularTumor),
        congenitalTZ: Boolean(ext.congenitalTZ),
        condyloma: Boolean(ext.condyloma),
        polyp: Boolean(ext.polyp),
        inflammation: Boolean(ext.inflammation),
        stenosis: Boolean(ext.stenosis),
        congenitalAnomaly: Boolean(ext.congenitalAnomaly),
        postTreatmentAnomaly: Boolean(ext.postTreatmentAnomaly),
        endometriosisFoci: Boolean(ext.endometriosisFoci),
        otherFindings: ext.otherFindings ?? "",
        additionalDiagnoses: (ext.additionalDiagnoses ?? []).map((d) => ({
          diagnosis: d.diagnosis,
          cie10Code: d.cie10Code ?? "",
        })),
      },
      schillerTest: item.schillerTest,
      cervicalBiopsyTaken: item.cervicalBiopsyTaken,
      biopsyClockHours: clockHours,
      images: item.images.map((img) => ({ ...img })),
      diagnosis: item.diagnosis,
      planRecommendations: item.planRecommendations,
      cie10Code: item.cie10Code,
      syncBackgroundToHistory: true,
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

  const applyTemplatePayload = (
    payload: ColposcopyTemplatePayload,
    label: string
  ) => {
    const scj = normalizeScjVisibility(payload.squamocolumnarJunctionVisible);
    const tz = (TRANSFORMATION_ZONE_OPTIONS as readonly string[]).includes(
      payload.transformationZoneType
    )
      ? payload.transformationZoneType
      : "Tipo 1";

    const cleanHours = payload.cervicalBiopsyTaken
      ? payload.biopsyClockHours
          .filter((h): h is ClockHour =>
            (VALID_CLOCK_HOURS as readonly string[]).includes(h)
          )
          .sort((a, b) => Number(a) - Number(b))
      : [];

    const cleanExt = payload.extendedFindings ?? {};
    const currentExt = form.getValues("extendedFindings") ?? {};

    form.setValue("adequateColposcopy", payload.adequateColposcopy, {
      shouldDirty: true,
    });
    form.setValue("squamocolumnarJunctionVisible", scj, { shouldDirty: true });
    form.setValue("transformationZoneType", tz, { shouldDirty: true });
    form.setValue("matureSquamousEpithelium", payload.matureSquamousEpithelium, {
      shouldDirty: true,
    });
    form.setValue("ectopy", payload.ectopy, { shouldDirty: true });
    form.setValue("thinAcetowhiteEpithelium", payload.thinAcetowhiteEpithelium, {
      shouldDirty: true,
    });
    form.setValue(
      "denseAcetowhiteEpithelium",
      payload.denseAcetowhiteEpithelium,
      { shouldDirty: true }
    );
    form.setValue("irregularBorder", payload.irregularBorder, {
      shouldDirty: true,
    });
    form.setValue("fineMosaic", payload.fineMosaic, { shouldDirty: true });
    form.setValue("coarseMosaic", payload.coarseMosaic, { shouldDirty: true });
    form.setValue("finePunctation", payload.finePunctation, {
      shouldDirty: true,
    });
    form.setValue("coarsePunctation", payload.coarsePunctation, {
      shouldDirty: true,
    });
    form.setValue("atypicalVessels", payload.atypicalVessels, {
      shouldDirty: true,
    });
    form.setValue(
      "extendedFindings",
      {
        nps: currentExt.nps ?? "",
        irs: currentExt.irs ?? "",
        fur: currentExt.fur ?? "",
        obstetricFormula: currentExt.obstetricFormula ?? "",
        mac: currentExt.mac ?? "",
        papResult: currentExt.papResult ?? "",
        papOther: currentExt.papOther ?? "",
        vphResult: currentExt.vphResult ?? "",
        vphSerotype: currentExt.vphSerotype ?? "",
        inadequateReason: cleanExt.inadequateReason ?? "",
        atrophicSquamousEpithelium: Boolean(cleanExt.atrophicSquamousEpithelium),
        nabothCyst: Boolean(cleanExt.nabothCyst),
        cryptOpenings: Boolean(cleanExt.cryptOpenings),
        deciduosis: Boolean(cleanExt.deciduosis),
        rapidAcetowhite: Boolean(cleanExt.rapidAcetowhite),
        thickenedGlands: Boolean(cleanExt.thickenedGlands),
        sharpBorders: Boolean(cleanExt.sharpBorders),
        innerBorderSign: Boolean(cleanExt.innerBorderSign),
        ridgeSign: Boolean(cleanExt.ridgeSign),
        leukoplakia: Boolean(cleanExt.leukoplakia),
        erosion: Boolean(cleanExt.erosion),
        fragileVessels: Boolean(cleanExt.fragileVessels),
        irregularSurface: Boolean(cleanExt.irregularSurface),
        exophyticLesion: Boolean(cleanExt.exophyticLesion),
        necrosis: Boolean(cleanExt.necrosis),
        necroticUlceration: Boolean(cleanExt.necroticUlceration),
        nodularTumor: Boolean(cleanExt.nodularTumor),
        congenitalTZ: Boolean(cleanExt.congenitalTZ),
        condyloma: Boolean(cleanExt.condyloma),
        polyp: Boolean(cleanExt.polyp),
        inflammation: Boolean(cleanExt.inflammation),
        stenosis: Boolean(cleanExt.stenosis),
        congenitalAnomaly: Boolean(cleanExt.congenitalAnomaly),
        postTreatmentAnomaly: Boolean(cleanExt.postTreatmentAnomaly),
        endometriosisFoci: Boolean(cleanExt.endometriosisFoci),
        otherFindings: cleanExt.otherFindings ?? "",
        additionalDiagnoses: (cleanExt.additionalDiagnoses ?? []).map((d) => ({
          diagnosis: d.diagnosis,
          cie10Code: d.cie10Code ?? "",
        })),
      },
      { shouldDirty: true }
    );
    form.setValue("schillerTest", payload.schillerTest, { shouldDirty: true });
    form.setValue("cervicalBiopsyTaken", payload.cervicalBiopsyTaken, {
      shouldDirty: true,
    });
    form.setValue("biopsyClockHours", cleanHours, { shouldDirty: true });
    form.setValue("cie10Code", payload.cie10Code, { shouldDirty: true });
    form.setValue("diagnosis", payload.diagnosis, { shouldDirty: true });
    form.setValue("planRecommendations", payload.planRecommendations, {
      shouldDirty: true,
    });

    toast.success(`Plantilla aplicada: ${label}`);
  };

  const applyTemplate = (template: ColposcopyClinicalTemplateItem) => {
    applyTemplatePayload(template.payload, template.name);
  };

  const applyNormalDefaults = () => {
    const officialNormal = templates.find((t) => t.code === "colpo-normal");
    if (officialNormal) {
      applyTemplatePayload(officialNormal.payload, officialNormal.name);
      return;
    }

    const defaults = buildDefaultColposcopyValues(
      patientId,
      todayStr,
      "",
      background
    );
    applyTemplatePayload(
      {
        adequateColposcopy: defaults.adequateColposcopy,
        squamocolumnarJunctionVisible: defaults.squamocolumnarJunctionVisible,
        transformationZoneType: defaults.transformationZoneType,
        matureSquamousEpithelium: defaults.matureSquamousEpithelium,
        ectopy: defaults.ectopy,
        thinAcetowhiteEpithelium: defaults.thinAcetowhiteEpithelium,
        denseAcetowhiteEpithelium: defaults.denseAcetowhiteEpithelium,
        irregularBorder: defaults.irregularBorder,
        fineMosaic: defaults.fineMosaic,
        coarseMosaic: defaults.coarseMosaic,
        finePunctation: defaults.finePunctation,
        coarsePunctation: defaults.coarsePunctation,
        atypicalVessels: defaults.atypicalVessels,
        extendedFindings: defaults.extendedFindings,
        schillerTest: defaults.schillerTest,
        cervicalBiopsyTaken: defaults.cervicalBiopsyTaken,
        biopsyClockHours: defaults.biopsyClockHours,
        cie10Code: defaults.cie10Code,
        diagnosis: defaults.diagnosis,
        planRecommendations: defaults.planRecommendations,
      },
      "Cérvix Normal (Sin LIE)"
    );
  };

  const buildTemplatePayloadFromForm = (): ColposcopyTemplatePayload => {
    const vals = form.getValues();
    const ext = vals.extendedFindings ?? {};
    const cleanAdditional = (ext.additionalDiagnoses ?? [])
      .filter((d) => d.diagnosis.trim().length > 0)
      .map((d) => ({
        diagnosis: d.diagnosis.trim(),
        ...(d.cie10Code?.trim() ? { cie10Code: d.cie10Code.trim().toUpperCase() } : {}),
      }));

    return {
      adequateColposcopy: vals.adequateColposcopy,
      squamocolumnarJunctionVisible: vals.squamocolumnarJunctionVisible,
      transformationZoneType: vals.transformationZoneType,
      matureSquamousEpithelium: vals.matureSquamousEpithelium,
      ectopy: vals.ectopy,
      thinAcetowhiteEpithelium: vals.thinAcetowhiteEpithelium,
      denseAcetowhiteEpithelium: vals.denseAcetowhiteEpithelium,
      irregularBorder: vals.irregularBorder,
      fineMosaic: vals.fineMosaic,
      coarseMosaic: vals.coarseMosaic,
      finePunctation: vals.finePunctation,
      coarsePunctation: vals.coarsePunctation,
      atypicalVessels: vals.atypicalVessels,
      extendedFindings: {
        inadequateReason: vals.adequateColposcopy ? "" : ext.inadequateReason ?? "",
        atrophicSquamousEpithelium: Boolean(ext.atrophicSquamousEpithelium),
        nabothCyst: Boolean(ext.nabothCyst),
        cryptOpenings: Boolean(ext.cryptOpenings),
        deciduosis: Boolean(ext.deciduosis),
        rapidAcetowhite: Boolean(ext.rapidAcetowhite),
        thickenedGlands: Boolean(ext.thickenedGlands),
        sharpBorders: Boolean(ext.sharpBorders),
        innerBorderSign: Boolean(ext.innerBorderSign),
        ridgeSign: Boolean(ext.ridgeSign),
        leukoplakia: Boolean(ext.leukoplakia),
        erosion: Boolean(ext.erosion),
        fragileVessels: Boolean(ext.fragileVessels),
        irregularSurface: Boolean(ext.irregularSurface),
        exophyticLesion: Boolean(ext.exophyticLesion),
        necrosis: Boolean(ext.necrosis),
        necroticUlceration: Boolean(ext.necroticUlceration),
        nodularTumor: Boolean(ext.nodularTumor),
        congenitalTZ: Boolean(ext.congenitalTZ),
        condyloma: Boolean(ext.condyloma),
        polyp: Boolean(ext.polyp),
        inflammation: Boolean(ext.inflammation),
        stenosis: Boolean(ext.stenosis),
        congenitalAnomaly: Boolean(ext.congenitalAnomaly),
        postTreatmentAnomaly: Boolean(ext.postTreatmentAnomaly),
        endometriosisFoci: Boolean(ext.endometriosisFoci),
        otherFindings: ext.otherFindings ?? "",
        additionalDiagnoses: cleanAdditional,
      },
      schillerTest: vals.schillerTest,
      cervicalBiopsyTaken: vals.cervicalBiopsyTaken,
      biopsyClockHours: vals.cervicalBiopsyTaken
        ? vals.biopsyClockHours
        : [],
      cie10Code: vals.cie10Code,
      diagnosis: vals.diagnosis,
      planRecommendations: vals.planRecommendations,
    };
  };

  const addAdditionalDiagnosis = () => {
    const current = form.getValues("extendedFindings.additionalDiagnoses") ?? [];
    if (current.length >= 8) {
      toast.error("Máximo 8 diagnósticos adicionales.");
      return;
    }
    const next: ColposcopyAdditionalDiagnosisRecord[] = [
      ...current,
      { diagnosis: "", cie10Code: "" },
    ];
    form.setValue("extendedFindings.additionalDiagnoses", next, {
      shouldDirty: true,
    });
  };

  const updateAdditionalDiagnosis = (
    index: number,
    diagnosis: string,
    cie10Code: string
  ) => {
    const current = form.getValues("extendedFindings.additionalDiagnoses") ?? [];
    const next = current.map((item, idx) =>
      idx === index ? { diagnosis, cie10Code } : item
    );
    form.setValue("extendedFindings.additionalDiagnoses", next, {
      shouldDirty: true,
    });
  };

  const removeAdditionalDiagnosis = (index: number) => {
    const current = form.getValues("extendedFindings.additionalDiagnoses") ?? [];
    const next = current.filter((_, idx) => idx !== index);
    form.setValue("extendedFindings.additionalDiagnoses", next, {
      shouldDirty: true,
    });
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
    const cleanedAdditional = (values.extendedFindings.additionalDiagnoses ?? [])
      .filter((d) => d.diagnosis.trim().length > 0)
      .map((d) => ({
        diagnosis: d.diagnosis.trim(),
        ...(d.cie10Code?.trim() ? { cie10Code: d.cie10Code.trim().toUpperCase() } : {}),
      }));

    const payload: CreateColposcopyInput = {
      ...values,
      extendedFindings: {
        ...values.extendedFindings,
        additionalDiagnoses: cleanedAdditional,
      },
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

    if (values.syncBackgroundToHistory && onBackgroundSynced) {
      const syncPatch = buildColposcopyBackgroundSyncPatch(saved.extendedFindings);
      if (Object.keys(syncPatch).length > 0) {
        onBackgroundSynced(syncPatch);
      }
    }

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
    papOptions: COLPOSCOPY_PAP_OPTIONS,
    vphOptions: COLPOSCOPY_VPH_OPTIONS,
    diagnosisPresets: COLPOSCOPY_DIAGNOSIS_PRESETS,
    captionPresets: COLPOSCOPY_CAPTION_PRESETS,
    openCreateModal,
    openEditModal,
    handleToggleClockHours,
    handleToggleBiopsyTaken,
    addAdditionalDiagnosis,
    updateAdditionalDiagnosis,
    removeAdditionalDiagnosis,
    applyClassificationSuggestion,
    applyTemplate,
    applyNormalDefaults,
    buildTemplatePayloadFromForm,
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
