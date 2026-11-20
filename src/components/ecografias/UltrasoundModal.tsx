"use client";

import { useState, type BaseSyntheticEvent, type FormEvent } from "react";
import {
  Activity,
  AlertTriangle,
  BookmarkPlus,
  Calculator,
  Camera,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  Printer,
  Save,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import {
  PatientBackgroundQuickPanel,
  ViewBackgroundButton,
} from "@/components/pacientes/PatientBackgroundQuickPanel";
import type {
  ClinicalImageRecord,
  UltrasoundBreastLesionRecord,
} from "@/db/schema/specialty";
import {
  ultrasoundTemplatePayloadSchema,
  type UltrasoundClinicalTemplateItem,
  type UltrasoundTemplatePayload,
} from "@/features/clinical-templates/clinical-templates.schema";
import type { ColposcopyReportItem } from "@/features/colposcopia/colposcopia.schema";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import {
  BIRADS_OPTIONS,
  BREAST_ACR_TYPES,
  BREAST_LESION_TYPES,
  getUltrasoundModeFlags,
  ULTRASOUND_TYPE_LABELS,
  type CreateUltrasoundInput,
  type UltrasoundReportItem,
  type UltrasoundType,
} from "@/features/ecografias/ecografias.schema";
import {
  toOptionalEnumValue,
  toOptionalNumber,
} from "@/features/ecografias/hooks/use-ecografias";
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import { buildClinicalImageViewUrl } from "@/lib/clinical-images";
import { cn, formatPeruDateDisplay } from "@/lib/utils";
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
import { UltrasoundBreastFields } from "./UltrasoundBreastFields";
import { UltrasoundObstetricFields } from "./UltrasoundObstetricFields";

interface UltrasoundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientDirectoryItem;
  background?: PatientBackgroundItem | null;
  lastUltrasound?: UltrasoundReportItem | null;
  lastColposcopy?: ColposcopyReportItem | null;
  editingItem: UltrasoundReportItem | null;
  form: UseFormReturn<CreateUltrasoundInput>;
  isSubmitting: boolean;
  isUploadingImages: boolean;
  draftImages: ClinicalImageRecord[];
  consultations: MedicalConsultationItem[];
  watchedUltrasoundType: UltrasoundType;
  watchedBirads?: string;
  watchedEndometrium?: number;
  watchedVolume?: number;
  watchedRightOvaryVolume?: number;
  watchedLeftOvaryVolume?: number;
  watchedBreastLesions: UltrasoundBreastLesionRecord[];
  watchedIncludeDoppler?: boolean;
  bppTotal: number | null;
  templates: UltrasoundClinicalTemplateItem[];
  canEditTemplates?: boolean;
  isSavingTemplate?: boolean;
  typeOptions: readonly UltrasoundType[];
  uterusPositions: readonly ("AVF" | "RVF" | "Indiferente")[];
  endometriumPatterns: readonly (
    | "Trilaminar"
    | "Secretor"
    | "Atrófico"
    | "Engrosado irregular"
  )[];
  slidingSignOptions: readonly ("Positivo" | "Negativo" | "Parcial")[];
  biradsOptions: readonly (typeof BIRADS_OPTIONS)[number][];
  breastAcrTypes: readonly (typeof BREAST_ACR_TYPES)[number][];
  breastAcrLabels: Record<(typeof BREAST_ACR_TYPES)[number], string>;
  breastLesionTypes: readonly (typeof BREAST_LESION_TYPES)[number][];
  onApplyTemplate: (template: UltrasoundClinicalTemplateItem) => void;
  onBuildTemplatePayload: () => UltrasoundTemplatePayload;
  onSaveAsTemplate: (
    name: string,
    description: string,
    payload: UltrasoundTemplatePayload
  ) => Promise<boolean>;
  onOpenTemplatesManager?: () => void;
  onAutoCalculateVolume: (dimsText?: string) => void;
  onAutoCalculateOvaryVolume: (side: "right" | "left", dimsText?: string) => void;
  onAutoCalculateHadlock: () => void;
  onAutoCalculateDoppler: () => void;
  onAddBreastLesion: (lesionType?: string) => void;
  onUpdateBreastLesion: (
    index: number,
    patch: Partial<UltrasoundBreastLesionRecord>
  ) => void;
  onRemoveBreastLesion: (index: number) => void;
  onFillStandardBreastComplement: () => void;
  onUploadFiles: (files: FileList | null) => Promise<void>;
  onUpdateImageCaption: (index: number, caption: string) => void;
  onRemoveImage: (index: number) => Promise<void>;
  onSaveAndPrintIntent: (intent: boolean) => void;
  onSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
}

const selectClassName =
  "flex h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function UltrasoundModal({
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
  watchedUltrasoundType,
  watchedBirads,
  watchedEndometrium,
  watchedVolume,
  watchedRightOvaryVolume,
  watchedLeftOvaryVolume,
  watchedBreastLesions,
  watchedIncludeDoppler,
  bppTotal,
  templates,
  canEditTemplates = false,
  isSavingTemplate = false,
  typeOptions,
  uterusPositions,
  endometriumPatterns,
  slidingSignOptions,
  biradsOptions,
  breastAcrTypes,
  breastAcrLabels,
  breastLesionTypes,
  onApplyTemplate,
  onBuildTemplatePayload,
  onSaveAsTemplate,
  onOpenTemplatesManager,
  onAutoCalculateVolume,
  onAutoCalculateOvaryVolume,
  onAutoCalculateHadlock,
  onAutoCalculateDoppler,
  onAddBreastLesion,
  onUpdateBreastLesion,
  onRemoveBreastLesion,
  onFillStandardBreastComplement,
  onUploadFiles,
  onUpdateImageCaption,
  onRemoveImage,
  onSaveAndPrintIntent,
  onSubmit,
}: UltrasoundModalProps) {
  const {
    register,
    formState: { errors },
  } = form;

  const [showBackground, setShowBackground] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [pendingTemplate, setPendingTemplate] =
    useState<UltrasoundClinicalTemplateItem | null>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setShowTemplates(false);
    }
    onOpenChange(nextOpen);
  };

  const orderedTemplates = [...templates].sort((a, b) => {
    const aMatch = a.payload.ultrasoundType === watchedUltrasoundType ? 0 : 1;
    const bMatch = b.payload.ultrasoundType === watchedUltrasoundType ? 0 : 1;
    return aMatch - bMatch;
  });

  const handleTemplateChipClick = (template: UltrasoundClinicalTemplateItem) => {
    if (editingItem) {
      setPendingTemplate(template);
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
    const parsed = ultrasoundTemplatePayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ||
          "Complete al menos la indicación y conclusión antes de guardar como plantilla."
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

  const modeFlags = getUltrasoundModeFlags(watchedUltrasoundType);
  const { isGynMode, isBreastMode, isAnyObstetricMode } = modeFlags;

  const highBiradsAlert =
    isBreastMode &&
    Boolean(watchedBirads) &&
    watchedBirads !== "BI-RADS 1" &&
    watchedBirads !== "BI-RADS 2";

  const highEndometriumAlert =
    isGynMode &&
    typeof watchedEndometrium === "number" &&
    Number.isFinite(watchedEndometrium) &&
    watchedEndometrium >= 15;

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:pr-8">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2">
                  <Activity className="size-5 text-primary" />
                  {editingItem
                    ? "Editar Informe Ecográfico Especializado"
                    : "Nueva Ecografía Especializada CENDO"}
                </DialogTitle>
                <DialogDescription>
                  Paciente: <strong>{patient.fullName}</strong> •{" "}
                  {patient.documentType} {patient.documentNumber} ({patient.age}{" "}
                  años)
                </DialogDescription>
              </div>
              <ViewBackgroundButton
                open={showBackground}
                onToggle={() => setShowBackground((prev) => !prev)}
                background={background}
              />
            </div>
          </DialogHeader>

          <PatientBackgroundQuickPanel
            open={showBackground}
            patient={patient}
            background={background}
            lastUltrasound={lastUltrasound}
            lastColposcopy={lastColposcopy}
          />

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Plantillas Clínicas Editables CENDO (colapsadas por defecto) */}
            <div className="rounded-xl border border-border bg-muted/20 px-3.5 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  aria-expanded={showTemplates}
                  onClick={() => setShowTemplates((prev) => !prev)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  <Sparkles className="size-3.5 text-primary" />
                  <span>Plantillas Diagnósticas CENDO</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    ({orderedTemplates.length})
                  </span>
                  {showTemplates ? (
                    <ChevronUp className="size-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  )}
                </button>

                <div className="flex flex-wrap items-center gap-1.5">
                  {canEditTemplates ? (
                    <>
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
                    </>
                  ) : (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      Formatos CENDO
                    </span>
                  )}
                </div>
              </div>

              {showTemplates ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border pt-2.5">
                  {orderedTemplates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleTemplateChipClick(tmpl)}
                      className={cn(
                        "cursor-pointer rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        watchedUltrasoundType === tmpl.payload.ultrasoundType
                          ? "border-primary/40 bg-card text-foreground hover:bg-primary/10"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tmpl.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

          {/* 1. Datos Generales & Modalidad */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-12">
            <div className="space-y-1.5 sm:col-span-5">
              <label
                htmlFor="eco-type"
                className="block text-xs font-semibold text-foreground"
              >
                Modalidad Ecográfica *
              </label>
              <select
                id="eco-type"
                className={selectClassName}
                {...register("ultrasoundType")}
              >
                {typeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {ULTRASOUND_TYPE_LABELS[opt]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-3">
              <label
                htmlFor="eco-date"
                className="block text-xs font-semibold text-foreground"
              >
                Fecha del Examen *
              </label>
              <Input
                id="eco-date"
                type="date"
                className="font-mono"
                {...register("reportDate")}
              />
              {errors.reportDate ? (
                <p className="text-xs text-destructive">
                  {errors.reportDate.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5 sm:col-span-4">
              <label
                htmlFor="eco-consultation"
                className="block text-xs font-semibold text-foreground"
              >
                Consulta Vinculada
              </label>
              <select
                id="eco-consultation"
                className={selectClassName}
                {...register("consultationId")}
              >
                <option value="">Estudio independiente</option>
                {consultations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatPeruDateDisplay(c.consultationDate)} —{" "}
                    {c.diagnosis.slice(0, 32)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-5">
              <label
                htmlFor="eco-referring"
                className="block text-xs font-semibold text-foreground"
              >
                Indicación / Médico Solicitante
              </label>
              <Input
                id="eco-referring"
                placeholder="Ej. Dr. Patrick Jacinto / Médico referente"
                {...register("findings.referringDoctor")}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-7">
              <label
                htmlFor="eco-indication"
                className="block text-xs font-semibold text-foreground"
              >
                Motivo del Estudio *
              </label>
              <Input
                id="eco-indication"
                placeholder="Ej. Control ginecológico preventivo, dismenorrea, tamizaje..."
                {...register("indication")}
              />
              {errors.indication ? (
                <p className="text-xs text-destructive">
                  {errors.indication.message}
                </p>
              ) : null}
            </div>
          </div>

          {/* Alertas Clínicas Automáticas */}
          {highBiradsAlert ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <div>
                <strong className="font-bold">
                  Alerta Mamaria ({watchedBirads}):
                </strong>{" "}
                Considere precisar dimensiones nodulares, márgenes y seguimiento /
                biopsia core según categoría ACR BI-RADS.
              </div>
            </div>
          ) : null}

          {highEndometriumAlert ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <div>
                <strong className="font-bold">
                  Engrosamiento Endometrial ({watchedEndometrium} mm):
                </strong>{" "}
                Correlacionar con fase del ciclo menstrual, estatus menopáusico
                y descartar pólipo o hiperplasia endometrial.
              </div>
            </div>
          ) : null}

          {/* 2A. Hallazgos Ginecológicos + Protocolo IDEA */}
          {isGynMode ? (
            <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <h3 className="text-xs font-bold tracking-wider text-primary uppercase">
                  Biometría Uterina, Anexos & Mapeo IDEA de Endometriosis
                </h3>
                {typeof watchedVolume === "number" ? (
                  <Badge variant="outline" className="font-mono text-xs">
                    Volumen Uterino: {watchedVolume} cc
                  </Badge>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="space-y-1.5 sm:col-span-3">
                  <label
                    htmlFor="uterus-pos"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Posición del Útero
                  </label>
                  <select
                    id="uterus-pos"
                    className={selectClassName}
                    {...register("findings.uterusPosition", {
                      setValueAs: toOptionalEnumValue,
                    })}
                  >
                    <option value="">Seleccione...</option>
                    {uterusPositions.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="uterus-dim"
                      className="block text-xs font-semibold text-foreground"
                    >
                      Dimensiones Uterinas (mm)
                    </label>
                    <button
                      type="button"
                      onClick={() => onAutoCalculateVolume()}
                      className="inline-flex cursor-pointer items-center gap-1 font-mono text-[10.5px] font-semibold text-primary hover:underline"
                    >
                      <Calculator className="size-3" />
                      Calcular cc
                    </button>
                  </div>
                  <Input
                    id="uterus-dim"
                    placeholder="70 x 40 x 46 mm"
                    className="font-mono"
                    {...register("findings.uterusDimensions", {
                      onBlur: (e) =>
                        onAutoCalculateVolume(
                          (e.target as HTMLInputElement).value
                        ),
                    })}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-4">
                  <label
                    htmlFor="uterus-vol"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Volumen Elipsoide (cc)
                  </label>
                  <Input
                    id="uterus-vol"
                    type="number"
                    step="0.1"
                    placeholder="67.4"
                    className="font-mono"
                    {...register("findings.uterusVolumeCc", {
                      setValueAs: toOptionalNumber,
                    })}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-4">
                  <label
                    htmlFor="endo-mm"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Grosor Endometrial (mm)
                  </label>
                  <Input
                    id="endo-mm"
                    type="number"
                    step="0.1"
                    placeholder="6.5"
                    className="font-mono"
                    {...register("findings.endometriumThicknessMm", {
                      setValueAs: toOptionalNumber,
                    })}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-4">
                  <label
                    htmlFor="endo-pat"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Patrón Endometrial
                  </label>
                  <select
                    id="endo-pat"
                    className={selectClassName}
                    {...register("findings.endometriumPattern", {
                      setValueAs: toOptionalEnumValue,
                    })}
                  >
                    <option value="">Seleccione...</option>
                    {endometriumPatterns.map((pat) => (
                      <option key={pat} value={pat}>
                        {pat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-4">
                  <label
                    htmlFor="sliding-sign"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Signo Deslizamiento (IDEA)
                  </label>
                  <select
                    id="sliding-sign"
                    className={selectClassName}
                    {...register("findings.slidingSign", {
                      setValueAs: toOptionalEnumValue,
                    })}
                  >
                    <option value="">No evaluado</option>
                    {slidingSignOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-3">
                  <label
                    htmlFor="gyn-cervix-mm"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Cérvix (mm)
                  </label>
                  <Input
                    id="gyn-cervix-mm"
                    type="number"
                    step="0.5"
                    placeholder="33"
                    className="font-mono"
                    {...register("findings.cervixLengthMm", {
                      setValueAs: toOptionalNumber,
                    })}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-4">
                  <label
                    htmlFor="gyn-cervix-status"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Morfología Cervical
                  </label>
                  <Input
                    id="gyn-cervix-status"
                    placeholder="Morfología conservada"
                    {...register("findings.cervixStatus")}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-5">
                  <label
                    htmlFor="gyn-ut-pain"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Dolor a la Ecopulsión Uterina
                  </label>
                  <Input
                    id="gyn-ut-pain"
                    placeholder="No evidencia de dolor a la ecopulsión"
                    {...register("findings.uterusEcopulsionPain")}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-12">
                  <label
                    htmlFor="myometrium"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Miometrio y Zona de Unión (MUSA)
                  </label>
                  <Textarea
                    id="myometrium"
                    rows={2}
                    placeholder="Homogeneidad miometrial, presencia de miomas (clasificación FIGO) o signos de adenomiosis..."
                    {...register("findings.myometriumStatus")}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-4">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="ovary-r"
                      className="block text-xs font-semibold text-foreground"
                    >
                      Ovario Derecho (mm)
                    </label>
                    <button
                      type="button"
                      onClick={() => onAutoCalculateOvaryVolume("right")}
                      className="inline-flex cursor-pointer items-center gap-1 font-mono text-[10.5px] font-semibold text-primary hover:underline"
                    >
                      <Calculator className="size-3" />
                      Calc cc
                    </button>
                  </div>
                  <Input
                    id="ovary-r"
                    placeholder="28 x 19 x 20 mm"
                    {...register("findings.rightOvaryDimensions", {
                      onBlur: (e) =>
                        onAutoCalculateOvaryVolume(
                          "right",
                          (e.target as HTMLInputElement).value
                        ),
                    })}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="ovary-r-vol"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Vol. OD (cc)
                  </label>
                  <Input
                    id="ovary-r-vol"
                    type="number"
                    step="0.1"
                    placeholder={
                      typeof watchedRightOvaryVolume === "number"
                        ? String(watchedRightOvaryVolume)
                        : "5.6"
                    }
                    className="font-mono"
                    {...register("findings.rightOvaryVolumeCc", {
                      setValueAs: toOptionalNumber,
                    })}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-4">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="ovary-l"
                      className="block text-xs font-semibold text-foreground"
                    >
                      Ovario Izquierdo (mm)
                    </label>
                    <button
                      type="button"
                      onClick={() => onAutoCalculateOvaryVolume("left")}
                      className="inline-flex cursor-pointer items-center gap-1 font-mono text-[10.5px] font-semibold text-primary hover:underline"
                    >
                      <Calculator className="size-3" />
                      Calc cc
                    </button>
                  </div>
                  <Input
                    id="ovary-l"
                    placeholder="27 x 18 x 19 mm"
                    {...register("findings.leftOvaryDimensions", {
                      onBlur: (e) =>
                        onAutoCalculateOvaryVolume(
                          "left",
                          (e.target as HTMLInputElement).value
                        ),
                    })}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="ovary-l-vol"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Vol. OI (cc)
                  </label>
                  <Input
                    id="ovary-l-vol"
                    type="number"
                    step="0.1"
                    placeholder={
                      typeof watchedLeftOvaryVolume === "number"
                        ? String(watchedLeftOvaryVolume)
                        : "4.8"
                    }
                    className="font-mono"
                    {...register("findings.leftOvaryVolumeCc", {
                      setValueAs: toOptionalNumber,
                    })}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-4">
                  <label
                    htmlFor="peri-ov-fluid"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Líquido Peri-ovárico
                  </label>
                  <Input
                    id="peri-ov-fluid"
                    placeholder="Ausencia de líquido peri-ovárico"
                    {...register("findings.periOvarianFluid")}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-4">
                  <label
                    htmlFor="ov-pain"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Dolor Ecopulsión Anexial
                  </label>
                  <Input
                    id="ov-pain"
                    placeholder="No evidencia de dolor a la ecopulsión"
                    {...register("findings.ovaryEcopulsionPain")}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-4">
                  <label
                    htmlFor="douglas"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Fondo de Saco de Douglas
                  </label>
                  <Input
                    id="douglas"
                    placeholder="Libre de colecciones líquidas"
                    {...register("findings.douglasPouch")}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-6">
                  <label
                    htmlFor="uterosacrals"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Ligamentos Uterosacros (Mapeo IDEA)
                  </label>
                  <Input
                    id="uterosacrals"
                    placeholder="Libres, sin engrosamientos nodulares"
                    {...register("findings.uterosacralLigaments")}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-6">
                  <label
                    htmlFor="ovaries-notes"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Características Parénquima / Folículos Ováricos
                  </label>
                  <Input
                    id="ovaries-notes"
                    placeholder="Localización lateral al útero, parénquima homogéneo, folículos..."
                    {...register("findings.ovariesNotes")}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-12">
                  <label
                    htmlFor="endo-foci"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Focos de Endometriosis Profunda / Tabique Rectovaginal (Opcional)
                  </label>
                  <Input
                    id="endo-foci"
                    placeholder="Describir implantes profundos, endometriomas o adherencias ováricas..."
                    {...register("findings.endometriosisFoci")}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* 2B. Hallazgos Mamarios BI-RADS */}
          {isBreastMode ? (
            <UltrasoundBreastFields
              form={form}
              selectClassName={selectClassName}
              biradsOptions={biradsOptions}
              breastAcrTypes={breastAcrTypes}
              breastAcrLabels={breastAcrLabels}
              lesionTypes={breastLesionTypes}
              lesions={watchedBreastLesions}
              onAddLesion={onAddBreastLesion}
              onUpdateLesion={onUpdateBreastLesion}
              onRemoveLesion={onRemoveBreastLesion}
              onFillStandardComplement={onFillStandardBreastComplement}
            />
          ) : null}

          {/* 2C. Hallazgos Obstétricos (I T, Genética, II-III T, Morfológica & Doppler) */}
          {isAnyObstetricMode ? (
            <UltrasoundObstetricFields
              form={form}
              selectClassName={selectClassName}
              modeFlags={modeFlags}
              uterusPositions={uterusPositions}
              uterusVolume={watchedVolume}
              rightOvaryVolume={watchedRightOvaryVolume}
              leftOvaryVolume={watchedLeftOvaryVolume}
              includeDoppler={watchedIncludeDoppler}
              bppTotal={bppTotal}
              onAutoCalculateUterusVolume={onAutoCalculateVolume}
              onAutoCalculateOvaryVolume={onAutoCalculateOvaryVolume}
              onAutoCalculateHadlock={onAutoCalculateHadlock}
              onAutoCalculateDoppler={onAutoCalculateDoppler}
            />
          ) : null}

          {/* 3. Galería Fotográfica Ecográfica Privada */}
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-foreground uppercase">
                  <Camera className="size-3.5 text-primary" />
                  Capturas Ecográficas ({draftImages.length} / 16)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Almacenamiento cifrado en bucket privado. Se comprimen
                  automáticamente y se anexan en hojas fotográficas A4 al
                  imprimir.
                </p>
              </div>

              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15">
                {isUploadingImages ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="size-3.5" />
                )}
                <span>
                  {isUploadingImages ? "Subiendo..." : "Agregar Capturas"}
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

            {draftImages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-center text-xs text-muted-foreground">
                No se han adjuntado capturas ecográficas en este informe. Puede
                subir imágenes directamente del ecógrafo (JPG, PNG o WebP).
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {draftImages.map((img, idx) => (
                  <div
                    key={img.storagePath}
                    className="overflow-hidden rounded-lg border border-border bg-muted/20"
                  >
                    <div className="relative aspect-[4/3] bg-card">
                      {/* eslint-disable-next-line @next/next/no-img-element -- Endpoint binario privado autenticado */}
                      <img
                        src={buildClinicalImageViewUrl(img.storagePath)}
                        alt={img.caption || `Captura ${idx + 1}`}
                        className="size-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => void onRemoveImage(idx)}
                        title="Eliminar captura"
                        aria-label={`Eliminar captura ${idx + 1}`}
                        className="absolute top-1.5 right-1.5 inline-flex size-7 cursor-pointer items-center justify-center rounded-md border border-border bg-card/90 text-destructive shadow-xs hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <div className="p-2">
                      <Input
                        value={img.caption}
                        onChange={(e) =>
                          onUpdateImageCaption(idx, e.target.value)
                        }
                        placeholder={`Descripción captura #${idx + 1}`}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Conclusión y Recomendaciones */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
            <div className="space-y-1.5">
              <label
                htmlFor="eco-conclusion"
                className="block text-xs font-semibold text-foreground"
              >
                Conclusión Diagnóstica *
              </label>
              <Textarea
                id="eco-conclusion"
                rows={3}
                placeholder="1. Conclusión ecográfica principal..."
                {...register("conclusion")}
              />
              {errors.conclusion ? (
                <p className="text-xs text-destructive">
                  {errors.conclusion.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="eco-recs"
                className="block text-xs font-semibold text-foreground"
              >
                Recomendaciones y Plan Clínico
              </label>
              <Textarea
                id="eco-recs"
                rows={2}
                placeholder="Control periódico, estudios complementarios..."
                {...register("recommendations")}
              />
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
              {editingItem ? "Guardar Cambios" : "Registrar Ecografía"}
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
            Guardar Informe Actual como Plantilla
          </DialogTitle>
          <DialogDescription>
            La modalidad, indicación, hallazgos, conclusión y recomendaciones
            actuales quedarán disponibles para cualquier paciente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSaveTemplateSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="eco-save-tpl-name"
              className="block text-xs font-semibold text-foreground"
            >
              Nombre de la Plantilla *
            </label>
            <Input
              id="eco-save-tpl-name"
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="Ej. DIU Normoinserto / Control Folículos"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="eco-save-tpl-desc"
              className="block text-xs font-semibold text-foreground"
            >
              Descripción Breve (Opcional)
            </label>
            <Input
              id="eco-save-tpl-desc"
              value={tplDesc}
              onChange={(e) => setTplDesc(e.target.value)}
              placeholder="Indicaciones o detalle rápido"
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
      open={Boolean(pendingTemplate)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setPendingTemplate(null);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Aplicar Plantilla Sobre Informe en Edición?</DialogTitle>
          <DialogDescription>
            Se reemplazarán la modalidad, hallazgos y conclusión actuales por la
            plantilla{" "}
            <strong className="text-foreground">{pendingTemplate?.name}</strong>.
            La fecha del examen, consulta vinculada y fotografías subidas se
            conservarán intactas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPendingTemplate(null)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (pendingTemplate) {
                onApplyTemplate(pendingTemplate);
                setPendingTemplate(null);
              }
            }}
          >
            Sí, Aplicar Plantilla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}
