"use client";

import { useState, type BaseSyntheticEvent, type FormEvent } from "react";
import {
  AlertTriangle,
  BookmarkPlus,
  Camera,
  ChevronDown,
  ChevronUp,
  Clock,
  FileCheck2,
  ImagePlus,
  Loader2,
  Plus,
  Printer,
  Save,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { DeepPartial, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import {
  PatientBackgroundQuickPanel,
  ViewBackgroundButton,
} from "@/components/pacientes/PatientBackgroundQuickPanel";
import type { ClinicalImageRecord } from "@/db/schema/specialty";
import {
  colposcopyTemplatePayloadSchema,
  type ColposcopyClinicalTemplateItem,
  type ColposcopyTemplatePayload,
} from "@/features/clinical-templates/clinical-templates.schema";
import type {
  ColposcopyClassificationResult,
  ColposcopyReportItem,
  CreateColposcopyInput,
} from "@/features/colposcopia/colposcopia.schema";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type { UltrasoundReportItem } from "@/features/ecografias/ecografias.schema";
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import { buildClinicalImageViewUrl } from "@/lib/clinical-images";
import { cn, formatPeruDateDisplay } from "@/lib/utils";
import { Cie10Autocomplete } from "@/components/common/Cie10Autocomplete";
import { CervicalClock } from "@/components/colposcopia/CervicalClock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ColposcopyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientDirectoryItem;
  background?: PatientBackgroundItem | null;
  lastUltrasound?: UltrasoundReportItem | null;
  lastColposcopy?: ColposcopyReportItem | null;
  editingItem: ColposcopyReportItem | null;
  form: UseFormReturn<CreateColposcopyInput>;
  isSubmitting: boolean;
  isUploadingImages: boolean;
  draftImages: ClinicalImageRecord[];
  consultations: MedicalConsultationItem[];
  watchedValues: DeepPartial<CreateColposcopyInput>;
  classification: ColposcopyClassificationResult;
  templates: ColposcopyClinicalTemplateItem[];
  canEditTemplates?: boolean;
  isSavingTemplate?: boolean;
  scjOptions: readonly string[];
  tzOptions: readonly string[];
  schillerOptions: readonly string[];
  papOptions: readonly string[];
  vphOptions: readonly string[];
  diagnosisPresets: ReadonlyArray<{
    shortLabel: string;
    diagnosis: string;
    cie10Code: string;
  }>;
  captionPresets: readonly string[];
  onToggleClockHours: (hours: string[]) => void;
  onToggleBiopsyTaken: (taken: boolean) => void;
  onAddAdditionalDiagnosis: () => void;
  onUpdateAdditionalDiagnosis: (
    index: number,
    diagnosis: string,
    cie10Code: string
  ) => void;
  onRemoveAdditionalDiagnosis: (index: number) => void;
  onApplyClassificationSuggestion: () => void;
  onApplyTemplate: (template: ColposcopyClinicalTemplateItem) => void;
  onApplyNormalDefaults: () => void;
  onBuildTemplatePayload: () => ColposcopyTemplatePayload;
  onSaveAsTemplate: (
    name: string,
    description: string,
    payload: ColposcopyTemplatePayload
  ) => Promise<boolean>;
  onOpenTemplatesManager?: () => void;
  onUploadFiles: (files: FileList | null) => Promise<void>;
  onUpdateImageCaption: (index: number, caption: string) => void;
  onRemoveImage: (index: number) => Promise<void>;
  onSaveAndPrintIntent: (intent: boolean) => void;
  onSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
}

const selectClassName =
  "flex h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function CheckboxTile({
  label,
  registerProps,
}: {
  label: string;
  registerProps: ReturnType<UseFormReturn<CreateColposcopyInput>["register"]>;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-xs text-foreground transition-colors hover:bg-muted/40 select-none">
      <input
        type="checkbox"
        className="size-3.5 shrink-0 accent-primary"
        {...registerProps}
      />
      <span className="leading-tight">{label}</span>
    </label>
  );
}

export function ColposcopyModal({
  open,
  onOpenChange,
  patient,
  background,
  lastUltrasound,
  lastColposcopy,
  editingItem,
  form,
  isSubmitting,
  isUploadingImages,
  draftImages,
  consultations,
  watchedValues,
  classification,
  templates,
  canEditTemplates = false,
  isSavingTemplate = false,
  scjOptions,
  tzOptions,
  schillerOptions,
  papOptions,
  vphOptions,
  diagnosisPresets,
  captionPresets,
  onToggleClockHours,
  onToggleBiopsyTaken,
  onAddAdditionalDiagnosis,
  onUpdateAdditionalDiagnosis,
  onRemoveAdditionalDiagnosis,
  onApplyClassificationSuggestion,
  onApplyTemplate,
  onApplyNormalDefaults,
  onBuildTemplatePayload,
  onSaveAsTemplate,
  onOpenTemplatesManager,
  onUploadFiles,
  onUpdateImageCaption,
  onRemoveImage,
  onSaveAndPrintIntent,
  onSubmit,
}: ColposcopyModalProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  const [showBackground, setShowBackground] = useState(false);
  const [pendingApply, setPendingApply] = useState<
    | { kind: "normal" }
    | { kind: "template"; template: ColposcopyClinicalTemplateItem }
    | null
  >(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");

  const [openSections, setOpenSections] = useState({
    normal: true,
    abnormal: true,
    invasion: false,
    misc: false,
    biopsy: true,
    photos: true,
  });

  const handleClickNormalDefaults = () => {
    if (editingItem) {
      setPendingApply({ kind: "normal" });
      return;
    }
    onApplyNormalDefaults();
  };

  const handleTemplateChipClick = (template: ColposcopyClinicalTemplateItem) => {
    if (editingItem) {
      setPendingApply({ kind: "template", template });
      return;
    }
    onApplyTemplate(template);
  };

  const handleSaveTemplateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanName = tplName.trim();
    if (cleanName.length < 2) {
      toast.error("Ingrese un nombre de al menos 2 caracteres.");
      return;
    }
    const rawPayload = onBuildTemplatePayload();
    const parsed = colposcopyTemplatePayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ||
          "Complete diagnóstico, CIE-10 y plan antes de guardar como plantilla."
      );
      return;
    }
    const ok = await onSaveAsTemplate(cleanName, tplDesc.trim(), parsed.data);
    if (ok) {
      setSaveTemplateOpen(false);
      setTplName("");
      setTplDesc("");
    }
  };

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const biopsyTaken = Boolean(watchedValues.cervicalBiopsyTaken);
  const selectedClockHours = (watchedValues.biopsyClockHours ?? []).filter(
    (h): h is NonNullable<typeof h> => typeof h === "string"
  );
  const adequateColpo = watchedValues.adequateColposcopy ?? true;
  const extWatched = watchedValues.extendedFindings ?? {};
  const papResult = extWatched.papResult ?? "";
  const vphResult = extWatched.vphResult ?? "";
  const additionalDiagnoses = extWatched.additionalDiagnoses ?? [];

  const invasionPositiveCount = [
    watchedValues.atypicalVessels,
    extWatched.fragileVessels,
    extWatched.irregularSurface,
    extWatched.exophyticLesion,
    extWatched.necrosis,
    extWatched.necroticUlceration,
    extWatched.nodularTumor,
  ].filter(Boolean).length;

  const miscPositiveCount = [
    extWatched.congenitalTZ,
    extWatched.condyloma,
    extWatched.polyp,
    extWatched.inflammation,
    extWatched.stenosis,
    extWatched.congenitalAnomaly,
    extWatched.postTreatmentAnomaly,
    extWatched.endometriosisFoci,
  ].filter(Boolean).length;

  const badgeToneClass =
    classification.tone === "destructive"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : classification.tone === "warning"
        ? "border-warning/40 bg-warning/10 text-warning"
        : "border-success/40 bg-success/10 text-success";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:pr-8">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2">
                  <FileCheck2 className="size-5 text-primary" />
                  {editingItem
                    ? "Editar Evaluación Colposcópica (IFCPC 2011)"
                    : "Nueva Colposcopía Digital (IFCPC 2011)"}
                </DialogTitle>
                <DialogDescription>
                  Paciente: <strong>{patient.fullName}</strong> •{" "}
                  {patient.documentType} {patient.documentNumber} ({patient.age}{" "}
                  años)
                </DialogDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ViewBackgroundButton
                  open={showBackground}
                  onToggle={() => setShowBackground((prev) => !prev)}
                  background={background}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleClickNormalDefaults}
                  title="Marca hallazgos benignos/normales en 1 clic sin modificar fecha ni fotos"
                >
                  <Sparkles className="size-3.5" />
                  Marcar Normales
                </Button>
              </div>
            </div>
          </DialogHeader>

          <PatientBackgroundQuickPanel
            open={showBackground}
            patient={patient}
            background={background}
            lastUltrasound={lastUltrasound}
            lastColposcopy={lastColposcopy}
          />

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Barra de Plantillas Diagnósticas Editables */}
            <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase">
                  <Sparkles className="size-3.5" />
                  Cargar Plantilla Diagnóstica (1 clic)
                </span>
                {canEditTemplates ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => setSaveTemplateOpen(true)}
                      className="bg-card"
                    >
                      <BookmarkPlus className="size-3.5 text-primary" />
                      Guardar como plantilla
                    </Button>
                    {onOpenTemplatesManager ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={onOpenTemplatesManager}
                        className="bg-card"
                      >
                        <Settings className="size-3.5" />
                        Gestionar
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {templates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleTemplateChipClick(tmpl)}
                    className="cursor-pointer rounded-md border border-primary/30 bg-card px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-primary/10"
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>
          {/* Clasificador IFCPC Automático */}
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3",
              badgeToneClass
            )}
          >
            <div className="space-y-0.5">
              <span className="block font-mono text-[10px] font-bold tracking-wider uppercase opacity-80">
                Impresión Colposcópica IFCPC en Tiempo Real
              </span>
              <p className="text-sm font-bold">{classification.label}</p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onApplyClassificationSuggestion}
              className="bg-card text-foreground"
            >
              <Sparkles className="size-3.5 text-primary" />
              Sugerir Diagnóstico & CIE-10 ({classification.suggestedCie10})
            </Button>
          </div>

          {/* 1. Información Complementaria (Antecedentes, PAP y Test VPH) */}
          <div className="space-y-3 rounded-xl border border-primary/25 bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <h3 className="text-xs font-bold tracking-wider text-primary uppercase">
                1. Información Complementaria • Antecedentes, PAP y VPH
              </h3>
              <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-foreground select-none">
                <input
                  type="checkbox"
                  className="size-3.5 accent-primary"
                  {...register("syncBackgroundToHistory")}
                />
                <span>Actualizar también en Historia Clínica</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              <div className="space-y-1">
                <label
                  htmlFor="colpo-nps"
                  className="block text-[11px] font-semibold text-foreground"
                >
                  N° Parejas Sexuales (NPS)
                </label>
                <Input
                  id="colpo-nps"
                  placeholder="Ej. 2"
                  className="h-8 font-mono text-xs"
                  {...register("extendedFindings.nps")}
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="colpo-irs"
                  className="block text-[11px] font-semibold text-foreground"
                >
                  IRS (Inicio Sexual)
                </label>
                <Input
                  id="colpo-irs"
                  placeholder="Ej. 18"
                  className="h-8 font-mono text-xs"
                  {...register("extendedFindings.irs")}
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="colpo-fur"
                  className="block text-[11px] font-semibold text-foreground"
                >
                  FUR
                </label>
                <Input
                  id="colpo-fur"
                  type="date"
                  className="h-8 font-mono text-xs"
                  {...register("extendedFindings.fur")}
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="colpo-formula"
                  className="block text-[11px] font-semibold text-foreground"
                >
                  Fórmula Obstétrica
                </label>
                <Input
                  id="colpo-formula"
                  placeholder="G0 P0000"
                  className="h-8 font-mono text-xs uppercase"
                  {...register("extendedFindings.obstetricFormula")}
                />
              </div>

              <div className="col-span-2 space-y-1 sm:col-span-1">
                <label
                  htmlFor="colpo-mac"
                  className="block text-[11px] font-semibold text-foreground"
                >
                  MAC (Anticonceptivo)
                </label>
                <Input
                  id="colpo-mac"
                  placeholder="Ninguno / DIU..."
                  className="h-8 text-xs"
                  {...register("extendedFindings.mac")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 border-t border-border/70 pt-3 lg:grid-cols-12">
              <div className="space-y-1.5 lg:col-span-7">
                <span className="block text-[11px] font-semibold text-foreground">
                  Resultado de Papanicolaou (PAP)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {papOptions.map((opt) => {
                    const active = papResult === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setValue(
                            "extendedFindings.papResult",
                            active ? "" : opt,
                            { shouldDirty: true }
                          )
                        }
                        className={cn(
                          "cursor-pointer rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted/20 text-foreground hover:bg-muted"
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                <Input
                  id="colpo-pap-other"
                  placeholder={
                    papResult === "Otros"
                      ? "Especifique otro resultado de PAP..."
                      : "Detalle o fecha del PAP previo (opcional)..."
                  }
                  className={cn(
                    "h-8 text-xs",
                    papResult === "Otros" && "border-primary/60"
                  )}
                  {...register("extendedFindings.papOther")}
                />
              </div>

              <div className="space-y-1.5 lg:col-span-5">
                <span className="block text-[11px] font-semibold text-foreground">
                  Resultado de Test de VPH
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {vphOptions.map((opt) => {
                    const active = vphResult === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const next = active ? "" : opt;
                          setValue("extendedFindings.vphResult", next, {
                            shouldDirty: true,
                          });
                          if (next !== "Positivo") {
                            setValue("extendedFindings.vphSerotype", "", {
                              shouldDirty: true,
                            });
                          }
                        }}
                        className={cn(
                          "cursor-pointer rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted/20 text-foreground hover:bg-muted"
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {vphResult === "Positivo" ? (
                  <Input
                    id="colpo-vph-serotype"
                    placeholder="Serotipo VPH (ej. 16, 18, Alto riesgo)..."
                    className="h-8 border-warning/60 bg-warning/5 font-mono text-xs"
                    {...register("extendedFindings.vphSerotype")}
                  />
                ) : (
                  <p className="text-[10.5px] text-muted-foreground">
                    Si el Test de VPH resulta positivo podrá especificar el
                    serotipo detectado.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2. Evaluación General IFCPC */}
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <h3 className="border-b border-border pb-2 text-xs font-bold tracking-wider text-primary uppercase">
              2. Evaluación General IFCPC & Zona de Transformación
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="space-y-1.5 sm:col-span-3">
                <label
                  htmlFor="colpo-date"
                  className="block text-xs font-semibold text-foreground"
                >
                  Fecha del Estudio *
                </label>
                <Input
                  id="colpo-date"
                  type="date"
                  className="font-mono"
                  {...register("reportDate")}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <label
                  htmlFor="colpo-adequate"
                  className="block text-xs font-semibold text-foreground"
                >
                  1. Colposcopía
                </label>
                <select
                  id="colpo-adequate"
                  value={adequateColpo ? "ADECUADA" : "INADECUADA"}
                  onChange={(e) =>
                    setValue(
                      "adequateColposcopy",
                      e.target.value === "ADECUADA",
                      { shouldDirty: true }
                    )
                  }
                  className={selectClassName}
                >
                  <option value="ADECUADA">Adecuada</option>
                  <option value="INADECUADA">Inadecuada</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <label
                  htmlFor="colpo-scj"
                  className="block text-xs font-semibold text-foreground"
                >
                  2. Unión Escamocolumnar (UEC)
                </label>
                <select
                  id="colpo-scj"
                  className={selectClassName}
                  {...register("squamocolumnarJunctionVisible")}
                >
                  {scjOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <label
                  htmlFor="colpo-tz"
                  className="block text-xs font-semibold text-foreground"
                >
                  3. Tipo Zona de Transformación
                </label>
                <select
                  id="colpo-tz"
                  className={selectClassName}
                  {...register("transformationZoneType")}
                >
                  {tzOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-6">
                <label
                  htmlFor="colpo-consultation"
                  className="block text-xs font-semibold text-foreground"
                >
                  Consulta Vinculada
                </label>
                <select
                  id="colpo-consultation"
                  className={selectClassName}
                  {...register("consultationId")}
                >
                  <option value="">Evaluación independiente</option>
                  {consultations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatPeruDateDisplay(c.consultationDate)} —{" "}
                      {c.diagnosis.slice(0, 32)}
                    </option>
                  ))}
                </select>
              </div>

              {!adequateColpo ? (
                <div className="space-y-1.5 sm:col-span-6">
                  <label
                    htmlFor="colpo-inadequate-reason"
                    className="block text-xs font-semibold text-warning"
                  >
                    Motivo de Colposcopía Inadecuada
                  </label>
                  <Input
                    id="colpo-inadequate-reason"
                    placeholder="Ej. Sangrado abundante, cervicitis severa, UEC en canal..."
                    {...register("extendedFindings.inadequateReason")}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* 3. Hallazgos Colposcópicos Normales */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <button
              type="button"
              onClick={() => toggleSection("normal")}
              className="flex w-full cursor-pointer items-center justify-between bg-muted/25 px-4 py-2.5 text-left"
            >
              <span className="text-xs font-bold tracking-wider text-foreground uppercase">
                3. Hallazgos Colposcópicos Normales
              </span>
              {openSections.normal ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>

            {openSections.normal ? (
              <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
                <CheckboxTile
                  label="Epitelio escamoso original: Maduro"
                  registerProps={register("matureSquamousEpithelium")}
                />
                <CheckboxTile
                  label="Epitelio escamoso original: Atrófico"
                  registerProps={register(
                    "extendedFindings.atrophicSquamousEpithelium"
                  )}
                />
                <CheckboxTile
                  label="Epitelio columnar: Ectopía"
                  registerProps={register("ectopy")}
                />
                <CheckboxTile
                  label="Metaplásico: Quiste de Naboth"
                  registerProps={register("extendedFindings.nabothCyst")}
                />
                <CheckboxTile
                  label="Aberturas y/o criptas glandulares"
                  registerProps={register("extendedFindings.cryptOpenings")}
                />
                <CheckboxTile
                  label="Deciduosis en el embarazo"
                  registerProps={register("extendedFindings.deciduosis")}
                />
              </div>
            ) : null}
          </div>

          {/* 4. Hallazgos Colposcópicos Anormales (Grado 1, Grado 2 & No Específicos) */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <button
              type="button"
              onClick={() => toggleSection("abnormal")}
              className="flex w-full cursor-pointer items-center justify-between bg-muted/25 px-4 py-2.5 text-left"
            >
              <span className="text-xs font-bold tracking-wider text-foreground uppercase">
                4. Hallazgos Colposcópicos Anormales (Grado 1 • Grado 2 • No
                Específicos / Lugol)
              </span>
              {openSections.abnormal ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>

            {openSections.abnormal ? (
              <div className="space-y-4 p-4">
                <div className="space-y-2">
                  <p className="font-mono text-[10.5px] font-bold text-warning uppercase">
                    Grado 1 (Menor)
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <CheckboxTile
                      label="Epitelio acetoblanco delgado"
                      registerProps={register("thinAcetowhiteEpithelium")}
                    />
                    <CheckboxTile
                      label="Borde irregular"
                      registerProps={register("irregularBorder")}
                    />
                    <CheckboxTile
                      label="Mosaico fino"
                      registerProps={register("fineMosaic")}
                    />
                    <CheckboxTile
                      label="Puntillado fino"
                      registerProps={register("finePunctation")}
                    />
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-3">
                  <p className="font-mono text-[10.5px] font-bold text-destructive uppercase">
                    Grado 2 (Mayor)
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <CheckboxTile
                      label="Epitelio acetoblanco denso"
                      registerProps={register("denseAcetowhiteEpithelium")}
                    />
                    <CheckboxTile
                      label="Aparición rápida acetoblanco"
                      registerProps={register(
                        "extendedFindings.rapidAcetowhite"
                      )}
                    />
                    <CheckboxTile
                      label="Orificios glandulares con bordes engrosados"
                      registerProps={register(
                        "extendedFindings.thickenedGlands"
                      )}
                    />
                    <CheckboxTile
                      label="Mosaico grueso"
                      registerProps={register("coarseMosaic")}
                    />
                    <CheckboxTile
                      label="Puntillado grueso"
                      registerProps={register("coarsePunctation")}
                    />
                    <CheckboxTile
                      label="Bordes delimitados"
                      registerProps={register("extendedFindings.sharpBorders")}
                    />
                    <CheckboxTile
                      label="Signo del límite del borde interno"
                      registerProps={register(
                        "extendedFindings.innerBorderSign"
                      )}
                    />
                    <CheckboxTile
                      label="Signo de cresta o sobreelevado"
                      registerProps={register("extendedFindings.ridgeSign")}
                    />
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-3">
                  <p className="font-mono text-[10.5px] font-bold text-primary uppercase">
                    No Específicos & Solución de Lugol
                  </p>
                  <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-12">
                    <div className="grid grid-cols-2 gap-2 sm:col-span-6">
                      <CheckboxTile
                        label="Leucoplasia (queratosis / hiperqueratosis)"
                        registerProps={register("extendedFindings.leukoplakia")}
                      />
                      <CheckboxTile
                        label="Erosión"
                        registerProps={register("extendedFindings.erosion")}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-6">
                      <label
                        htmlFor="colpo-schiller"
                        className="block text-[11px] font-semibold text-foreground"
                      >
                        Solución de Lugol (Test de Schiller)
                      </label>
                      <select
                        id="colpo-schiller"
                        className={selectClassName}
                        {...register("schillerTest")}
                      >
                        {schillerOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* 5. Sospecha de Invasión */}
          <div className="overflow-hidden rounded-xl border border-destructive/25 bg-card">
            <button
              type="button"
              onClick={() => toggleSection("invasion")}
              className="flex w-full cursor-pointer items-center justify-between bg-destructive/5 px-4 py-2.5 text-left"
            >
              <span className="flex items-center gap-2 text-xs font-bold tracking-wider text-destructive uppercase">
                <span>5. Sospecha de Invasión</span>
                {invasionPositiveCount > 0 ? (
                  <Badge variant="destructive" className="text-[10px]">
                    {invasionPositiveCount} marcados
                  </Badge>
                ) : null}
              </span>
              {openSections.invasion ? (
                <ChevronUp className="size-4 text-destructive" />
              ) : (
                <ChevronDown className="size-4 text-destructive" />
              )}
            </button>

            {openSections.invasion ? (
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <CheckboxTile
                    label="Vasos atípicos"
                    registerProps={register("atypicalVessels")}
                  />
                </div>
                <div className="space-y-2 border-t border-border pt-2.5">
                  <p className="font-mono text-[10px] font-semibold text-destructive uppercase">
                    Signos Adicionales
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <CheckboxTile
                      label="Vasos delgados"
                      registerProps={register("extendedFindings.fragileVessels")}
                    />
                    <CheckboxTile
                      label="Superficie irregular"
                      registerProps={register(
                        "extendedFindings.irregularSurface"
                      )}
                    />
                    <CheckboxTile
                      label="Lesión exofítica"
                      registerProps={register(
                        "extendedFindings.exophyticLesion"
                      )}
                    />
                    <CheckboxTile
                      label="Necrosis"
                      registerProps={register("extendedFindings.necrosis")}
                    />
                    <CheckboxTile
                      label="Ulceración necrótica"
                      registerProps={register(
                        "extendedFindings.necroticUlceration"
                      )}
                    />
                    <CheckboxTile
                      label="Tumoración nodular"
                      registerProps={register("extendedFindings.nodularTumor")}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* 6. Hallazgos Varios */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <button
              type="button"
              onClick={() => toggleSection("misc")}
              className="flex w-full cursor-pointer items-center justify-between bg-muted/25 px-4 py-2.5 text-left"
            >
              <span className="flex items-center gap-2 text-xs font-bold tracking-wider text-foreground uppercase">
                <span>6. Hallazgos Varios</span>
                {miscPositiveCount > 0 ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {miscPositiveCount} marcados
                  </Badge>
                ) : null}
              </span>
              {openSections.misc ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>

            {openSections.misc ? (
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <CheckboxTile
                    label="Zona de transformación congénita"
                    registerProps={register("extendedFindings.congenitalTZ")}
                  />
                  <CheckboxTile
                    label="Condiloma"
                    registerProps={register("extendedFindings.condyloma")}
                  />
                  <CheckboxTile
                    label="Pólipo (exocervical / endocervical)"
                    registerProps={register("extendedFindings.polyp")}
                  />
                  <CheckboxTile
                    label="Inflamación"
                    registerProps={register("extendedFindings.inflammation")}
                  />
                  <CheckboxTile
                    label="Estenosis"
                    registerProps={register("extendedFindings.stenosis")}
                  />
                  <CheckboxTile
                    label="Anomalía congénita"
                    registerProps={register(
                      "extendedFindings.congenitalAnomaly"
                    )}
                  />
                  <CheckboxTile
                    label="Anomalías pos tratamiento"
                    registerProps={register(
                      "extendedFindings.postTreatmentAnomaly"
                    )}
                  />
                  <CheckboxTile
                    label="Endometriosis"
                    registerProps={register(
                      "extendedFindings.endometriosisFoci"
                    )}
                  />
                </div>
                <div className="space-y-1 border-t border-border pt-2.5">
                  <label
                    htmlFor="colpo-other-findings"
                    className="block text-[11px] font-semibold text-foreground"
                  >
                    Otros Hallazgos / Observaciones Adicionales
                  </label>
                  <Input
                    id="colpo-other-findings"
                    placeholder="Otros hallazgos vaginales, vulvares u observaciones..."
                    {...register("extendedFindings.otherFindings")}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* 7. Biopsia Dirigida & Reloj Cervical Interactivo */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <button
              type="button"
              onClick={() => toggleSection("biopsy")}
              className="flex w-full cursor-pointer items-center justify-between bg-muted/25 px-4 py-2.5 text-left"
            >
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-foreground uppercase">
                <Clock className="size-3.5 text-primary" />
                7. Mapeo Topográfico & Biopsia Cervical Dirigida
                {biopsyTaken ? (
                  <Badge variant="destructive" className="ml-2 text-[10px]">
                    Biopsia Activa ({selectedClockHours.length} h)
                  </Badge>
                ) : null}
              </span>
              {openSections.biopsy ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>

            {openSections.biopsy ? (
              <div className="grid grid-cols-1 items-center gap-5 p-4 md:grid-cols-12">
                <div className="space-y-3 md:col-span-5">
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-3 text-xs font-semibold text-foreground select-none">
                    <span>¿Se realizó biopsia cervical dirigida?</span>
                    <input
                      type="checkbox"
                      checked={biopsyTaken}
                      onChange={(e) => onToggleBiopsyTaken(e.target.checked)}
                      className="size-4 accent-primary"
                    />
                  </label>

                  {biopsyTaken && selectedClockHours.length === 0 ? (
                    <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-[11px] text-foreground">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                      <span>
                        Seleccione en el reloj cervical las horas donde se tomó
                        la muestra para vincularlas automáticamente a la Orden de
                        Patología.
                      </span>
                    </div>
                  ) : null}

                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Al marcar una hora en el reloj se activa automáticamente la
                    toma de biopsia. Luego podrá generar la{" "}
                    <strong>Orden de Anatomía Patológica</strong> en 1 clic
                    desde la vista del estudio.
                  </p>
                </div>

                <div className="flex justify-center md:col-span-7">
                  <CervicalClock
                    selectedHours={selectedClockHours}
                    onChange={onToggleClockHours}
                    interactive
                    size="md"
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* 6. Galería Fotográfica Colposcópica Privada */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/25 px-4 py-2.5">
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-foreground uppercase">
                  <Camera className="size-3.5 text-primary" />
                  8. Galería Fotográfica Colposcópica ({draftImages.length} / 16)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Almacenamiento cifrado privado. Inicia vacía sin imágenes de
                  relleno.
                </p>
              </div>

              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15">
                {isUploadingImages ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="size-3.5" />
                )}
                <span>
                  {isUploadingImages ? "Subiendo..." : "Subir Capturas"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={isUploadingImages || draftImages.length >= 16}
                  onChange={(e) => {
                    void onUploadFiles(e.target.files);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <div className="p-4">
              {draftImages.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-center text-xs text-muted-foreground">
                  No se han adjuntado fotografías colposcópicas aún. Suba
                  capturas con Suero Fisiológico (SSF), Ácido Acético 5% o Test
                  de Schiller.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {draftImages.map((img, idx) => (
                    <div
                      key={img.storagePath}
                      className="overflow-hidden rounded-lg border border-border bg-muted/15"
                    >
                      <div className="relative aspect-[4/3] bg-card">
                        {/* eslint-disable-next-line @next/next/no-img-element -- Endpoint binario privado autenticado */}
                        <img
                          src={buildClinicalImageViewUrl(img.storagePath)}
                          alt={img.caption || `Captura colposcópica ${idx + 1}`}
                          className="size-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => void onRemoveImage(idx)}
                          title="Eliminar captura"
                          aria-label={`Eliminar captura colposcópica ${idx + 1}`}
                          className="absolute top-1.5 right-1.5 inline-flex size-7 cursor-pointer items-center justify-center rounded-md border border-border bg-card/90 text-destructive shadow-xs hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1.5 p-2.5">
                        <Input
                          value={img.caption}
                          onChange={(e) =>
                            onUpdateImageCaption(idx, e.target.value)
                          }
                          placeholder={`Epígrafe captura #${idx + 1}`}
                          className="h-7 text-xs"
                        />
                        <div className="flex flex-wrap gap-1">
                          {captionPresets.map((presetLabel) => (
                            <button
                              key={presetLabel}
                              type="button"
                              onClick={() =>
                                onUpdateImageCaption(idx, presetLabel)
                              }
                              className="cursor-pointer rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary"
                            >
                              {presetLabel}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 9. Diagnósticos Colposcópicos (1, 2, 3+ con CIE-10) y Plan */}
          <div className="space-y-3.5 rounded-xl border border-primary/25 bg-primary/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 pb-2">
              <h3 className="text-xs font-bold tracking-wider text-primary uppercase">
                9. Diagnósticos Colposcópicos (1, 2 y 3 con CIE-10) & Plan
              </h3>
              <span className="text-[10.5px] text-muted-foreground">
                Dx 1 y Dx 2 se sincronizan con la Evaluación General
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="colpo-dx1"
                  className="block text-[11px] font-semibold text-foreground"
                >
                  Diagnóstico 1 (Adecuación — sin CIE-10)
                </label>
                <select
                  id="colpo-dx1"
                  value={adequateColpo ? "ADECUADA" : "INADECUADA"}
                  onChange={(e) =>
                    setValue(
                      "adequateColposcopy",
                      e.target.value === "ADECUADA",
                      { shouldDirty: true }
                    )
                  }
                  className={selectClassName}
                >
                  <option value="ADECUADA">Colposcopía adecuada</option>
                  <option value="INADECUADA">Colposcopía inadecuada</option>
                </select>
                <p className="text-[10px] text-muted-foreground">
                  UEC: {watchedValues.squamocolumnarJunctionVisible || "Completamente visible"}
                  {!adequateColpo && extWatched.inadequateReason
                    ? ` • ${extWatched.inadequateReason}`
                    : ""}
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="colpo-dx2"
                  className="block text-[11px] font-semibold text-foreground"
                >
                  Diagnóstico 2 (Zona de Transformación — sin CIE-10)
                </label>
                <select
                  id="colpo-dx2"
                  className={selectClassName}
                  {...register("transformationZoneType")}
                >
                  {tzOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      Zona de Transformación {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-primary uppercase">
                  Selección Rápida Diagnóstico 3 (Excel CENDO)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {diagnosisPresets.map((preset) => {
                  const isSelected =
                    watchedValues.cie10Code === preset.cie10Code &&
                    watchedValues.diagnosis === preset.diagnosis;
                  return (
                    <button
                      key={preset.shortLabel}
                      type="button"
                      onClick={() => {
                        setValue("diagnosis", preset.diagnosis, {
                          shouldDirty: true,
                        });
                        setValue("cie10Code", preset.cie10Code, {
                          shouldDirty: true,
                        });
                      }}
                      className={cn(
                        "cursor-pointer rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-muted/20 text-foreground hover:border-primary/40 hover:bg-primary/10"
                      )}
                    >
                      {preset.shortLabel}
                    </button>
                  );
                })}
              </div>

              <Cie10Autocomplete
                label="Diagnóstico 3 (Principal con CIE-10)"
                inputId="colpo-dx3-cie10"
                diagnosis={watchedValues.diagnosis ?? ""}
                cie10Code={watchedValues.cie10Code ?? ""}
                onChange={(diag, code) => {
                  setValue("diagnosis", diag, { shouldDirty: true });
                  setValue("cie10Code", code, { shouldDirty: true });
                }}
                required
                diagnosisError={errors.diagnosis?.message}
              />
            </div>

            {additionalDiagnoses.map((addItem, idx) => (
              <div
                key={`colpo-add-dx-${idx}`}
                className="space-y-2 rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-primary uppercase">
                    Diagnóstico {4 + idx} (Adicional)
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => onRemoveAdditionalDiagnosis(idx)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    Quitar
                  </Button>
                </div>
                <Cie10Autocomplete
                  label={`Diagnóstico ${4 + idx} (con CIE-10)`}
                  inputId={`colpo-dx-add-${idx}`}
                  diagnosis={addItem?.diagnosis ?? ""}
                  cie10Code={addItem?.cie10Code ?? ""}
                  onChange={(diag, code) =>
                    onUpdateAdditionalDiagnosis(idx, diag, code)
                  }
                />
              </div>
            ))}

            <div className="flex justify-start">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddAdditionalDiagnosis}
                className="bg-card"
              >
                <Plus className="size-3.5 text-primary" />
                Agregar otro diagnóstico
              </Button>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="colpo-plan"
                className="block text-xs font-semibold text-foreground"
              >
                Plan Terapéutico & Recomendaciones *
              </label>
              <Textarea
                id="colpo-plan"
                rows={3}
                {...register("planRecommendations")}
              />
              {errors.planRecommendations ? (
                <p className="text-xs text-destructive">
                  {errors.planRecommendations.message}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || isUploadingImages}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="outline"
              onClick={() => onSaveAndPrintIntent(true)}
              disabled={isSubmitting || isUploadingImages}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Printer className="size-4" />
              )}
              Guardar e Imprimir A4
            </Button>
            <Button
              type="submit"
              onClick={() => onSaveAndPrintIntent(false)}
              disabled={isSubmitting || isUploadingImages}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {editingItem ? "Guardar Cambios" : "Registrar Colposcopía"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Mini Dialog: Guardar estado actual como plantilla */}
    <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkPlus className="size-4 text-primary" />
            Guardar Colposcopía Actual como Plantilla
          </DialogTitle>
          <DialogDescription>
            Los criterios IFCPC, mapa horario, Schiller, diagnóstico, CIE-10 y
            plan quedarán guardados para reutilizar en futuras pacientes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSaveTemplateSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="colpo-save-tpl-name"
              className="block text-xs font-semibold text-foreground"
            >
              Nombre de la Plantilla *
            </label>
            <Input
              id="colpo-save-tpl-name"
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="Ej. Control Post-Cono LEEP Normal"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="colpo-save-tpl-desc"
              className="block text-xs font-semibold text-foreground"
            >
              Descripción Breve (Opcional)
            </label>
            <Input
              id="colpo-save-tpl-desc"
              value={tplDesc}
              onChange={(e) => setTplDesc(e.target.value)}
              placeholder="Resumen rápido"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaveTemplateOpen(false)}
              disabled={isSavingTemplate}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingTemplate}>
              {isSavingTemplate ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Guardar Plantilla
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Confirmación de sobrescritura en modo edición */}
    <Dialog
      open={Boolean(pendingApply)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setPendingApply(null);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Aplicar Sobre Evaluación en Edición?</DialogTitle>
          <DialogDescription>
            {pendingApply?.kind === "normal"
              ? "Se marcarán los hallazgos normales/benignos y su diagnóstico sugerido. "
              : `Se reemplazarán los hallazgos actuales por la plantilla "${pendingApply?.template.name ?? ""}". `}
            La fecha del estudio, consulta vinculada y fotografías subidas se
            mantendrán intactas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPendingApply(null)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!pendingApply) return;
              if (pendingApply.kind === "normal") {
                onApplyNormalDefaults();
              } else {
                onApplyTemplate(pendingApply.template);
              }
              setPendingApply(null);
            }}
          >
            Sí, Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}
