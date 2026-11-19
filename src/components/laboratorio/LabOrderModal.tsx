"use client";

import type { BaseSyntheticEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  CheckCircle2,
  FlaskConical,
  Link2,
  Microscope,
  Plus,
  Printer,
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
  LAB_INSTRUCTION_PRESETS,
  LAB_URGENCIES,
  hasDuplicateLabTest,
  type LabCatalogTest,
  type LabCategory,
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
  sourceLabel: string | null;
  form: UseFormReturn<LabOrderModalFormValues>;
  isSubmitting: boolean;
  consultations: MedicalConsultationItem[];
  labTemplates: LabOrderTemplateItem[];
  categories: readonly LabCategory[];
  presetPacks: LabPresetPack[];
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
  filteredCatalog: LabCatalogTest[];
  manualTestName: string;
  onManualTestNameChange: (val: string) => void;
  onApplyTemplate: (tmpl: LabOrderTemplateItem) => void;
  onResetToGeneral: () => void;
  onOpenManageTemplates: () => void;
  onApplyPresetPack: (pack: LabPresetPack) => void;
  onToggleCatalogTest: (test: LabCatalogTest) => void;
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
  sourceLabel,
  form,
  isSubmitting,
  consultations,
  labTemplates,
  categories,
  presetPacks,
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

  const isPathologyTemplate = watchedTemplateType !== "GENERAL";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="size-5 text-primary" />
            {editingItem
              ? "Editar Orden de Laboratorio / Patología"
              : "Nueva Orden de Laboratorio / Remisión de Muestra"}
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
                  Vincular con Consulta (Opcional)
                </label>
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

          {/* Bloque 2: Plantillas de Patología/Remisión + Perfiles Rápidos */}
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Microscope className="size-4 text-primary" />
                <span className="text-xs font-semibold text-foreground uppercase">
                  Modalidad y Plantillas CENDO
                </span>
                {isPathologyTemplate ? (
                  <Badge variant="secondary" className="text-[10.5px]">
                    Modo Remisión: {watchedTemplateTitle || watchedTemplateType}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10.5px]">
                    Modo Orden General
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {isPathologyTemplate ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={onResetToGeneral}
                  >
                    Cambiar a Orden General
                  </Button>
                ) : null}
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
            </div>

            {/* Plantillas de Patología */}
            <div className="space-y-1">
              <span className="block text-[11px] font-medium text-muted-foreground">
                Plantillas de Remisión / Muestras Especializadas (activa cadena
                de custodia):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {labTemplates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => onApplyTemplate(tmpl)}
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

            {/* Perfiles Clínicos Rápidos */}
            <div className="space-y-1 border-t border-border pt-2">
              <span className="block text-[11px] font-medium text-muted-foreground">
                Perfiles Diagnósticos CENDO (1 clic para sumar análisis):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presetPacks.map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => onApplyPresetPack(pack)}
                    title={pack.description}
                    className="cursor-pointer rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    + {pack.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bloque 2.5: Metadatos de Muestra (Solo cuando templateType !== GENERAL) */}
          {isPathologyTemplate ? (
            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase">
                  <Microscope className="size-4" />
                  Datos de Muestra Biológica & Correlación Gineco-Obstétrica
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Pre-hidratado desde antecedentes
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="space-y-1 sm:col-span-5">
                  <label className="block text-[11px] font-medium">
                    Sitio Anatómico / Tipo de Toma
                  </label>
                  <Input
                    className="bg-card"
                    placeholder="Ej. Cérvix hora 12 y 6"
                    {...register("anatomicalSite")}
                  />
                </div>
                <div className="space-y-1 sm:col-span-4">
                  <label className="block text-[11px] font-medium">
                    Fijador / Medio de Transporte
                  </label>
                  <Input
                    className="bg-card"
                    {...register("fixative")}
                  />
                </div>
                <div className="space-y-1 sm:col-span-3">
                  <label className="block text-[11px] font-medium">
                    N° Frascos / Láminas
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    className="bg-card font-mono"
                    {...register("containerCount", { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-1 sm:col-span-4">
                  <label className="block text-[11px] font-medium">
                    Aspecto Macroscópico
                  </label>
                  <Input
                    className="bg-card"
                    placeholder="Ej. Zona acetoblanca densa..."
                    {...register("cervixAspect")}
                  />
                </div>
                <div className="space-y-1 sm:col-span-3">
                  <label className="block text-[11px] font-medium">FUR</label>
                  <Input
                    type="text"
                    className="bg-card font-mono"
                    placeholder="YYYY-MM-DD"
                    {...register("furDate")}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[11px] font-medium">
                    Paridad
                  </label>
                  <Input
                    className="bg-card font-mono"
                    placeholder="G0P0000"
                    {...register("obstetricParity")}
                  />
                </div>
                <div className="space-y-1 sm:col-span-3">
                  <label className="block text-[11px] font-medium">MAC</label>
                  <Input
                    className="bg-card"
                    {...register("contraceptiveMethod")}
                  />
                </div>

                <div className="space-y-1 sm:col-span-12">
                  <label className="block text-[11px] font-medium">
                    Observaciones Clínicas para Anatomía Patológica
                  </label>
                  <Input
                    className="bg-card"
                    placeholder="Hallazgos colposcópicos relevantes o sospecha clínica..."
                    {...register("clinicalFindings")}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Bloque 3: Catálogo de Exámenes + Lista Seleccionada */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Catálogo */}
            <div className="space-y-2.5 rounded-xl border border-border bg-muted/20 p-3.5 lg:col-span-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-foreground uppercase">
                  Catálogo de Exámenes ({filteredCatalog.length})
                </h3>
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
                  placeholder="Buscar análisis (ej. CA-125, PAP, Hemograma)..."
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
                  placeholder="Añadir examen específico a la lista..."
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
                  Exámenes Complementarios / Imágenes Adicionales
                </label>
                <Textarea
                  id="lab-custom-tests"
                  rows={2}
                  placeholder="Ej. Resonancia Magnética pélvica con protocolo de endometriosis..."
                  {...register("customTests")}
                />
              </div>
            </div>
          </div>

          {/* Bloque 4: Indicaciones para la paciente */}
          <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
            <label htmlFor="lab-instr" className="block text-xs font-medium">
              Indicaciones de Preparación / Remisión
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LAB_INSTRUCTION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onAppendInstruction(preset)}
                  className="cursor-pointer rounded-md border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  + {preset}
                </button>
              ))}
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
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onSaveAndPrintIntent(true)}
            >
              <Printer className="size-4" />
              Guardar e Imprimir A4
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={() => onSaveAndPrintIntent(false)}
            >
              <CheckCircle2 className="size-4" />
              {isSubmitting
                ? "Guardando..."
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
