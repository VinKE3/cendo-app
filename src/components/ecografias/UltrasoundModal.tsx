"use client";

import type { BaseSyntheticEvent } from "react";
import {
  Activity,
  AlertTriangle,
  Calculator,
  Camera,
  ImagePlus,
  Loader2,
  Printer,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { ClinicalImageRecord } from "@/db/schema/specialty";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import {
  ULTRASOUND_TYPE_LABELS,
  type CreateUltrasoundInput,
  type UltrasoundPreset,
  type UltrasoundReportItem,
  type UltrasoundType,
} from "@/features/ecografias/ecografias.schema";
import { toOptionalNumber } from "@/features/ecografias/hooks/use-ecografias";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
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

interface UltrasoundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientDirectoryItem;
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
  presets: UltrasoundPreset[];
  typeOptions: readonly UltrasoundType[];
  uterusPositions: readonly ("AVF" | "RVF" | "Indiferente")[];
  endometriumPatterns: readonly (
    | "Trilaminar"
    | "Secretor"
    | "Atrófico"
    | "Engrosado irregular"
  )[];
  slidingSignOptions: readonly ("Positivo" | "Negativo" | "Parcial")[];
  biradsOptions: readonly (
    | "BI-RADS 1"
    | "BI-RADS 2"
    | "BI-RADS 3"
    | "BI-RADS 4A"
    | "BI-RADS 4B"
    | "BI-RADS 4C"
    | "BI-RADS 5"
  )[];
  onApplyPreset: (preset: UltrasoundPreset) => void;
  onAutoCalculateVolume: (dimsText?: string) => void;
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
  presets,
  typeOptions,
  uterusPositions,
  endometriumPatterns,
  slidingSignOptions,
  biradsOptions,
  onApplyPreset,
  onAutoCalculateVolume,
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

  const isGynMode =
    watchedUltrasoundType === "TRANSVAGINAL" ||
    watchedUltrasoundType === "PELVICA" ||
    watchedUltrasoundType === "DOPPLER";
  const isBreastMode = watchedUltrasoundType === "MAMA_BILATERAL";
  const isObstetricMode =
    watchedUltrasoundType === "OBSTETRICA_1T" ||
    watchedUltrasoundType === "OBSTETRICA_2T_3T";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            {editingItem
              ? "Editar Informe Ecográfico Especializado"
              : "Nueva Ecografía Especializada CENDO"}
          </DialogTitle>
          <DialogDescription>
            Paciente: <strong>{patient.fullName}</strong> • {patient.documentType}{" "}
            {patient.documentNumber} ({patient.age} años)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Presets Clínicos CENDO en 1 Clic */}
          <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" />
                Plantillas Diagnósticas Rápidas CENDO (1 clic)
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                Protocolo IDEA / MUSA / BI-RADS
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onApplyPreset(preset)}
                  className={cn(
                    "cursor-pointer rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    watchedUltrasoundType === preset.ultrasoundType
                      ? "border-primary/40 bg-card text-foreground hover:bg-primary/10"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 1. Datos Generales & Modalidad */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-12">
            <div className="space-y-1.5 sm:col-span-6">
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

            <div className="space-y-1.5 sm:col-span-3">
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

            <div className="space-y-1.5 sm:col-span-12">
              <label
                htmlFor="eco-indication"
                className="block text-xs font-semibold text-foreground"
              >
                Indicación Clínica / Motivo de Estudio *
              </label>
              <Input
                id="eco-indication"
                placeholder="Ej. Dismenorrea severa, mapeo ecográfico de endometriosis..."
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
                    {...register("findings.uterusPosition")}
                  >
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
                    placeholder="72 x 42 x 48 mm"
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
                    {...register("findings.endometriumPattern")}
                  >
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
                    Signo Deslizamiento (Sliding Sign)
                  </label>
                  <select
                    id="sliding-sign"
                    className={selectClassName}
                    {...register("findings.slidingSign")}
                  >
                    {slidingSignOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
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

                <div className="space-y-1.5 sm:col-span-6">
                  <label
                    htmlFor="ovary-r"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Ovario Derecho (OD)
                  </label>
                  <Input
                    id="ovary-r"
                    placeholder="28 x 19 mm, folículos normales"
                    {...register("findings.rightOvaryDimensions")}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-6">
                  <label
                    htmlFor="ovary-l"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Ovario Izquierdo (OI)
                  </label>
                  <Input
                    id="ovary-l"
                    placeholder="27 x 18 mm, estroma conservado"
                    {...register("findings.leftOvaryDimensions")}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-6">
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

                <div className="space-y-1.5 sm:col-span-12">
                  <label
                    htmlFor="endo-foci"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Focos de Endometriosis Profunda / Tabique Rectovaginal / Notas Anexiales
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
            <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="border-b border-border pb-2 text-xs font-bold tracking-wider text-primary uppercase">
                Evaluación Ecográfica Mamaria Bilateral (ACR BI-RADS)
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="space-y-1.5 sm:col-span-8">
                  <label
                    htmlFor="breast-pattern"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Patrón Fibroglandular y Planos
                  </label>
                  <Input
                    id="breast-pattern"
                    {...register("findings.breastPattern")}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-4">
                  <label
                    htmlFor="birads"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Categoría ACR BI-RADS
                  </label>
                  <select
                    id="birads"
                    className={selectClassName}
                    {...register("findings.biradsCategory")}
                  >
                    {biradsOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-6">
                  <label
                    htmlFor="breast-r"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Mama Derecha y Axila
                  </label>
                  <Textarea
                    id="breast-r"
                    rows={3}
                    {...register("findings.rightBreastFindings")}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-6">
                  <label
                    htmlFor="breast-l"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Mama Izquierda y Axila
                  </label>
                  <Textarea
                    id="breast-l"
                    rows={3}
                    {...register("findings.leftBreastFindings")}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* 2C. Hallazgos Obstétricos */}
          {isObstetricMode ? (
            <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="border-b border-border pb-2 text-xs font-bold tracking-wider text-primary uppercase">
                Biometría & Vitalidad Fetal / Embrionaria
              </h3>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="sacs"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Sacos Gestacionales
                  </label>
                  <Input
                    id="sacs"
                    type="number"
                    min={0}
                    max={8}
                    className="font-mono"
                    {...register("findings.gestationalSacsCount", {
                      setValueAs: toOptionalNumber,
                    })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="crl"
                    className="block text-xs font-semibold text-foreground"
                  >
                    LCN / CRL (mm)
                  </label>
                  <Input
                    id="crl"
                    type="number"
                    step="0.1"
                    className="font-mono"
                    {...register("findings.embryoCrownRumpLengthMm", {
                      setValueAs: toOptionalNumber,
                    })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="eg-eco"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Edad Gestacional Eco
                  </label>
                  <Input
                    id="eg-eco"
                    placeholder="7 semanas 5 días"
                    {...register("findings.gestationalAgeByEcho")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="fcf"
                    className="block text-xs font-semibold text-foreground"
                  >
                    F.C.F. Fetal (lpm)
                  </label>
                  <Input
                    id="fcf"
                    type="number"
                    min={0}
                    max={260}
                    className="font-mono"
                    {...register("findings.fetalHeartRate", {
                      setValueAs: toOptionalNumber,
                    })}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="placenta"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Implantación Placentaria / Corion
                  </label>
                  <Input
                    id="placenta"
                    placeholder="Normoinserta, sin hematomas retrocoriales"
                    {...register("findings.placentaLocation")}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="afi"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Líquido Amniótico (ILA / Pozo)
                  </label>
                  <Input
                    id="afi"
                    placeholder="Acorde para edad gestacional"
                    {...register("findings.amnioticFluidIndex")}
                  />
                </div>
              </div>
            </div>
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
  );
}
