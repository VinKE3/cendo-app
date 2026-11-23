"use client";

import { useState, type BaseSyntheticEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Link2,
  Microscope,
  Plus,
  Printer,
  Scan,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Cie10Autocomplete } from "@/components/common/Cie10Autocomplete";
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
import type { LabOrderItemRecord } from "@/db/schema/clinical";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import {
  LAB_URGENCIES,
  PATHOLOGY_SAMPLE_SUGGESTIONS,
  hasDuplicateLabTest,
  isImagingLabTemplate,
  isPathologyLabTemplate,
  type LabOrderItem,
  type LabOrderTemplateItem,
  type LabPresetPack,
  type LabTemplateType,
} from "@/features/laboratorio/laboratorio.schema";
import type { LabOrderModalFormValues } from "@/features/laboratorio/hooks/use-laboratorio";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import { cn, formatPeruDateDisplay } from "@/lib/utils";

interface LabOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientDirectoryItem;
  editingItem: LabOrderItem | null;
  draftMode?: boolean;
  editingDraftIndex?: number | null;
  lockedConsultationLabel?: string | null;
  sourceLabel: string | null;
  form: UseFormReturn<LabOrderModalFormValues>;
  isSubmitting: boolean;
  consultations: MedicalConsultationItem[];
  labTemplates: LabOrderTemplateItem[];
  categories: readonly string[];
  presetPacks: LabPresetPack[];
  instructionPresets: readonly string[];
  watchedDiagnosis: string;
  watchedCie10: string;
  watchedConsultationId: string;
  watchedTemplateType: LabTemplateType;
  watchedTemplateTitle: string;
  selectedTests: LabOrderItemRecord[];
  catalogSearch: string;
  onCatalogSearchChange: (val: string) => void;
  catalogCategory: string;
  onCatalogCategoryChange: (cat: string) => void;
  filteredCatalog: Array<{
    id: string;
    name: string;
    category: string;
    sampleType: string;
    notes?: string;
  }>;
  manualTestName: string;
  onManualTestNameChange: (val: string) => void;
  onApplyTemplate: (tmpl: LabOrderTemplateItem) => void;
  onSwitchToImaging: () => void;
  onSwitchToPathology: () => void;
  onResetToGeneral: () => void;
  onOpenManageTemplates: () => void;
  onApplyPresetPack: (pack: LabPresetPack) => void;
  onToggleCatalogTest: (test: {
    id: string;
    name: string;
    category: string;
    sampleType: string;
    notes?: string;
  }) => void;
  onAddManualTest: () => void;
  onRemoveSelectedTest: (idx: number) => void;
  onAppendInstruction: (text: string) => void;
  onSelectConsultationLink: (consultationId: string) => void;
  onSaveAndPrintIntent: (printAfterSave: boolean) => void;
  onSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
}

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function LabOrderModal({
  open,
  onOpenChange,
  patient,
  editingItem,
  draftMode = false,
  editingDraftIndex = null,
  lockedConsultationLabel = null,
  sourceLabel,
  form,
  isSubmitting,
  consultations,
  labTemplates,
  categories,
  presetPacks,
  instructionPresets,
  watchedDiagnosis,
  watchedCie10,
  watchedConsultationId,
  watchedTemplateType,
  watchedTemplateTitle,
  selectedTests,
  catalogSearch,
  onCatalogSearchChange,
  catalogCategory,
  onCatalogCategoryChange,
  filteredCatalog,
  manualTestName,
  onManualTestNameChange,
  onApplyTemplate,
  onSwitchToImaging,
  onSwitchToPathology,
  onResetToGeneral,
  onOpenManageTemplates,
  onApplyPresetPack,
  onToggleCatalogTest,
  onAddManualTest,
  onRemoveSelectedTest,
  onAppendInstruction,
  onSelectConsultationLink,
  onSaveAndPrintIntent,
  onSubmit,
}: LabOrderModalProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  const [showTemplates, setShowTemplates] = useState(false);
  const [showExtraSpecimenFields, setShowExtraSpecimenFields] = useState(false);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setShowTemplates(false);
      setShowExtraSpecimenFields(false);
    }
    onOpenChange(nextOpen);
  };

  const isImagingTemplate = isImagingLabTemplate(watchedTemplateType);
  const isPathologyTemplate = isPathologyLabTemplate(watchedTemplateType);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isImagingTemplate ? (
              <Scan className="size-5 text-primary" />
            ) : isPathologyTemplate ? (
              <Microscope className="size-5 text-primary" />
            ) : (
              <FlaskConical className="size-5 text-primary" />
            )}
            {editingItem
              ? isImagingTemplate
                ? "Editar Orden de Exámenes de Imágenes"
                : isPathologyTemplate
                  ? "Editar Solicitud de Anatomía Patológica"
                  : "Editar Orden de Exámenes de Laboratorio"
              : isImagingTemplate
                ? "Nueva Orden de Exámenes de Imágenes"
                : isPathologyTemplate
                  ? "Nueva Solicitud de Anatomía Patológica"
                  : "Nueva Orden de Exámenes de Laboratorio"}
          </DialogTitle>
          <DialogDescription>
            Paciente:{" "}
            <strong className="text-foreground">{patient.fullName}</strong> •{" "}
            {patient.documentType} {patient.documentNumber} • {patient.age} años
          </DialogDescription>
        </DialogHeader>

        {sourceLabel ? (
          <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-primary">
            <Sparkles className="size-3.5 shrink-0" />
            <span className="font-medium">{sourceLabel}</span>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Selector de Modo Principal en 3 vías: Laboratorio vs Imágenes vs Anatomía Patológica */}
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-muted/30 p-1.5 sm:grid-cols-3">
            <button
              type="button"
              onClick={onResetToGeneral}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all",
                !isImagingTemplate && !isPathologyTemplate
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              )}
            >
              <FlaskConical className="size-4" />
              <span>Exámenes de Laboratorio</span>
            </button>
            <button
              type="button"
              onClick={onSwitchToImaging}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all",
                isImagingTemplate
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              )}
            >
              <Scan className="size-4" />
              <span>Exámenes de Imágenes</span>
            </button>
            <button
              type="button"
              onClick={onSwitchToPathology}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all",
                isPathologyTemplate
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              )}
            >
              <Microscope className="size-4" />
              <span>Anatomía Patológica</span>
            </button>
          </div>
          {/* Bloque 1: Tipo de formato, Fecha, Urgencia, Vínculo */}
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="space-y-1.5 sm:col-span-3">
                <label htmlFor="lab-date" className="block text-xs font-medium">
                  Fecha de Emisión *
                </label>
                <Input
                  id="lab-date"
                  type="date"
                  className="bg-card font-mono"
                  {...register("orderDate")}
                />
                {errors.orderDate ? (
                  <p className="text-xs text-destructive">
                    {errors.orderDate.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <label htmlFor="lab-urgency" className="block text-xs font-medium">
                  Prioridad
                </label>
                <select
                  id="lab-urgency"
                  className={selectClassName}
                  {...register("urgency")}
                >
                  {LAB_URGENCIES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-6">
                <label
                  htmlFor="lab-cons"
                  className="flex items-center gap-1.5 text-xs font-medium"
                >
                  <Link2 className="size-3.5 text-primary" />
                  {lockedConsultationLabel
                    ? "Consulta Vinculada"
                    : "Vincular con Consulta (Opcional)"}
                </label>
                {lockedConsultationLabel ? (
                  <div className="flex min-h-8 items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary">
                    <Link2 className="size-3.5 shrink-0" />
                    <span className="truncate">{lockedConsultationLabel}</span>
                  </div>
                ) : (
                  <select
                    id="lab-cons"
                    value={watchedConsultationId}
                    onChange={(e) => onSelectConsultationLink(e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Orden independiente (sin vínculo directo)</option>
                    {consultations.map((c) => (
                      <option key={c.id} value={c.id}>
                        {formatPeruDateDisplay(c.consultationDate)} — {c.diagnosis}{" "}
                        {c.cie10Code ? `(${c.cie10Code})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <Cie10Autocomplete
              diagnosis={watchedDiagnosis}
              cie10Code={watchedCie10}
              onChange={(diag, code) => {
                setValue("diagnosis", diag, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
                setValue("cie10Code", code, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
              diagnosisError={errors.diagnosis?.message}
              required
            />
          </div>

          {/* Bloque 2: Toggle compacto de Modalidad y Plantillas CENDO (colapsado por defecto) */}
          <div className="rounded-xl border border-border bg-muted/20 px-3.5 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-expanded={showTemplates}
                  onClick={() => setShowTemplates((prev) => !prev)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  <Microscope className="size-3.5 text-primary" />
                  <span>Plantillas y Perfiles</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    ({labTemplates.length + presetPacks.length})
                  </span>
                  {showTemplates ? (
                    <ChevronUp className="size-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  )}
                </button>

                {isImagingTemplate ? (
                  <Badge variant="secondary" className="text-[10.5px]">
                    Modo Exámenes de Imágenes
                  </Badge>
                ) : isPathologyTemplate ? (
                  <Badge variant="secondary" className="text-[10.5px]">
                    Modo Remisión: {watchedTemplateTitle || watchedTemplateType}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10.5px]">
                    Modo Laboratorio Clínico
                  </Badge>
                )}
              </div>

              {isPathologyTemplate || isImagingTemplate ? (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={onResetToGeneral}
                >
                  Cambiar a Laboratorio
                </Button>
              ) : null}
            </div>

            {showTemplates ? (
              <div className="mt-3 space-y-3 border-t border-border pt-3">
                {/* Plantillas de Patología (ocultas en modo Imágenes) */}
                {!isImagingTemplate ? (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="block text-[11px] font-medium text-muted-foreground">
                        Plantillas de Remisión / Muestras Especializadas (activa
                        cadena de custodia):
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={onOpenManageTemplates}
                      >
                        <Settings className="size-3" />
                        Gestionar Plantillas
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {labTemplates.map((tmpl) => (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => {
                            onApplyTemplate(tmpl);
                            setShowTemplates(false);
                          }}
                          className={cn(
                            "cursor-pointer rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                            watchedTemplateTitle === tmpl.title
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                          )}
                        >
                          {tmpl.title}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Perfiles Clínicos Rápidos */}
                <div
                  className={cn(
                    "space-y-1",
                    !isImagingTemplate && "border-t border-border pt-2"
                  )}
                >
                  <span className="block text-[11px] font-medium text-muted-foreground">
                    {isImagingTemplate
                      ? "Perfiles de Diagnóstico por Imágenes (1 clic):"
                      : "Perfiles Diagnósticos CENDO (1 clic para sumar análisis):"}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {presetPacks.map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => {
                          onApplyPresetPack(pack);
                          setShowTemplates(false);
                        }}
                        title={pack.description}
                        className="cursor-pointer rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        + {pack.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Bloque 2.5: Solicitud de Anatomía Patológica (Solo cuando templateType !== GENERAL) */}
          {isPathologyTemplate ? (
            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase">
                  <Microscope className="size-4" />
                  Solicitud de Anatomía Patológica
                </h3>
                <Badge variant="outline" className="bg-card text-[10px]">
                  Formato CENDO
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="space-y-1 sm:col-span-6">
                  <label className="block text-[11px] font-medium">
                    Muestra <span className="text-destructive">*</span>
                  </label>
                  <Input
                    list="pathology-sample-suggestions"
                    className="bg-card"
                    placeholder="Ej. Citología de Cérvix, Biopsia de Cérvix H12..."
                    {...register("anatomicalSite")}
                  />
                  <datalist id="pathology-sample-suggestions">
                    {PATHOLOGY_SAMPLE_SUGGESTIONS.map((sample) => (
                      <option key={sample} value={sample} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1 sm:col-span-3">
                  <label className="block text-[11px] font-medium">
                    Fecha de Toma de Muestra
                  </label>
                  <Input
                    type="date"
                    className="bg-card font-mono"
                    {...register("sampleObtainedAt")}
                  />
                </div>

                <div className="space-y-1 sm:col-span-3">
                  <label className="block text-[11px] font-medium">
                    Fecha de Última Regla (FUR)
                  </label>
                  <Input
                    type="text"
                    className="bg-card font-mono"
                    placeholder="DD/MM/AAAA o YYYY-MM-DD"
                    {...register("furDate")}
                  />
                </div>

                <div className="space-y-1 sm:col-span-5">
                  <label className="block text-[11px] font-medium">
                    Médico Solicitante
                  </label>
                  <Input
                    type="text"
                    className="bg-card"
                    placeholder="DR. PATRICK JOSÉ JACINTO GOMERO"
                    {...register("requestingDoctor")}
                  />
                </div>

                <div className="space-y-1 sm:col-span-7">
                  <label className="block text-[11px] font-medium">
                    Datos Clínicos
                  </label>
                  <Input
                    type="text"
                    className="bg-card"
                    placeholder="Ej. Ninguno, o hallazgos relevantes para patología..."
                    {...register("clinicalFindings")}
                  />
                </div>
              </div>

              <div className="border-t border-primary/20 pt-2">
                <button
                  type="button"
                  aria-expanded={showExtraSpecimenFields}
                  onClick={() => setShowExtraSpecimenFields((prev) => !prev)}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
                >
                  {showExtraSpecimenFields ? (
                    <ChevronUp className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )}
                  <span>
                    + Detalles opcionales de muestra (Fijador, N° frascos,
                    Paridad, MAC)
                  </span>
                </button>

                {showExtraSpecimenFields ? (
                  <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-12">
                    <div className="space-y-1 sm:col-span-4">
                      <label className="block text-[11px] font-medium">
                        Fijador / Medio de Transporte
                      </label>
                      <Input className="bg-card" {...register("fixative")} />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="block text-[11px] font-medium">
                        N° Frascos
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        className="bg-card font-mono"
                        {...register("containerCount", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-6">
                      <label className="block text-[11px] font-medium">
                        Aspecto Macroscópico
                      </label>
                      <Input
                        className="bg-card"
                        placeholder="Ej. Zona acetoblanca densa..."
                        {...register("cervixAspect")}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-4">
                      <label className="block text-[11px] font-medium">
                        Paridad
                      </label>
                      <Input
                        className="bg-card font-mono"
                        placeholder="G0P0000"
                        {...register("obstetricParity")}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-8">
                      <label className="block text-[11px] font-medium">
                        MAC
                      </label>
                      <Input
                        className="bg-card"
                        {...register("contraceptiveMethod")}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Bloque 3: Catálogo de Exámenes + Lista Seleccionada */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Catálogo */}
            <div className="space-y-2.5 rounded-xl border border-border bg-muted/20 p-3.5 lg:col-span-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold text-foreground uppercase">
                    Catálogo de Exámenes ({filteredCatalog.length})
                  </h3>
                  {isPathologyTemplate ? (
                    <p className="text-[10.5px] text-muted-foreground">
                      Opcional si ya especificó la Muestra arriba.
                    </p>
                  ) : null}
                </div>
                <select
                  aria-label="Filtrar categoría"
                  value={catalogCategory}
                  onChange={(e) => onCatalogCategoryChange(e.target.value)}
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="Todas">Todas las categorías</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute top-2 left-2.5 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => onCatalogSearchChange(e.target.value)}
                  placeholder={
                    isImagingTemplate
                      ? "Buscar estudio (ej. Transvaginal, Mamografía, RMN)..."
                      : "Buscar análisis (ej. CA-125, PAP, Hemograma)..."
                  }
                  className="bg-card pl-8 text-xs"
                />
              </div>

              <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                {filteredCatalog.map((test) => {
                  const isAdded = hasDuplicateLabTest(selectedTests, test.name);
                  return (
                    <button
                      key={test.id}
                      type="button"
                      onClick={() => onToggleCatalogTest(test)}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors",
                        isAdded
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:border-primary/40"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{test.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {test.category} • {test.sampleType}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] font-bold">
                        {isAdded ? "✓ Añadido" : "+ Añadir"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Agregar examen manual al catálogo */}
              <div className="flex gap-1.5 border-t border-border pt-2">
                <Input
                  type="text"
                  value={manualTestName}
                  onChange={(e) => onManualTestNameChange(e.target.value)}
                  placeholder={
                    isImagingTemplate
                      ? "Añadir estudio por imagen específico..."
                      : "Añadir examen específico a la lista..."
                  }
                  className="bg-card text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onAddManualTest();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAddManualTest}
                >
                  <Plus className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Exámenes Seleccionados */}
            <div className="space-y-3 rounded-xl border border-border bg-card p-3.5 lg:col-span-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-foreground uppercase">
                  Estudios en la Orden ({selectedTests.length})
                </h3>
                {selectedTests.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground">
                    Seleccione exámenes o complete texto libre abajo
                  </span>
                ) : null}
              </div>

              <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                {selectedTests.length > 0 ? (
                  selectedTests.map((it, idx) => (
                    <div
                      key={it.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-border bg-muted/20 px-2.5 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">
                          <span className="mr-1.5 font-mono text-primary">
                            {idx + 1}.
                          </span>
                          {it.testName}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {it.category}
                          {it.sampleType ? ` • ${it.sampleType}` : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onRemoveSelectedTest(idx)}
                        aria-label="Quitar análisis"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                    Aún no hay exámenes marcados del catálogo.
                  </div>
                )}
              </div>

              <div className="space-y-1.5 border-t border-border pt-2.5">
                <label
                  htmlFor="lab-custom-tests"
                  className="block text-xs font-medium"
                >
                  {isImagingTemplate
                    ? "Estudios por Imágenes Adicionales / Detalles"
                    : "Exámenes Complementarios / Notas Adicionales"}
                </label>
                <Textarea
                  id="lab-custom-tests"
                  rows={2}
                  placeholder={
                    isImagingTemplate
                      ? "Ej. Evaluar foco en tabique rectovaginal, contraste EV..."
                      : "Ej. Perfil tiroideo adicional o indicaciones específicas..."
                  }
                  {...register("customTests")}
                />
              </div>
            </div>
          </div>

          {/* Bloque 4: Indicaciones para la paciente */}
          <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="lab-instr" className="block text-xs font-medium">
                Indicaciones de Preparación / Remisión
              </label>
              <select
                aria-label="Insertar indicación rápida"
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) onAppendInstruction(val);
                }}
                className="h-7 max-w-[260px] rounded-md border border-input bg-card px-2 text-xs text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="">+ Insertar indicación rápida...</option>
                {instructionPresets.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>
            </div>
            <Textarea
              id="lab-instr"
              rows={2}
              {...register("patientInstructions")}
            />
          </div>

          <DialogFooter className="flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            {!draftMode ? (
              <Button
                type="submit"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onSaveAndPrintIntent(true)}
              >
                <Printer className="size-4" />
                Guardar e Imprimir A4
              </Button>
            ) : null}
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={() => onSaveAndPrintIntent(false)}
            >
              <CheckCircle2 className="size-4" />
              {isSubmitting
                ? "Guardando..."
                : draftMode
                  ? editingDraftIndex !== null
                    ? "Actualizar Orden en Consulta"
                    : "Asociar Orden a Consulta"
                  : editingItem
                    ? "Guardar Cambios"
                    : "Emitir Orden"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
