"use client";

import type { BaseSyntheticEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  AlertTriangle,
  CheckCircle2,
  Link2,
  MessageCircle,
  Pencil,
  Pill,
  Plus,
  Printer,
  Search,
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
import type { PrescriptionItemRecord } from "@/db/schema/clinical";
import type {
  ConsultationVademecumOption,
  MedicalConsultationItem,
} from "@/features/consultas/consultas.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import {
  PRESCRIPTION_ROUTES,
  QUICK_GENERAL_INDICATIONS,
  type ClinicalDosagePreset,
  type MedicalPrescriptionItem,
} from "@/features/recetas/recetas.schema";
import type {
  MedicationBuilderState,
  PrescriptionModalFormValues,
} from "@/features/recetas/hooks/use-recetas";
import { formatPeruDateDisplay } from "@/lib/utils";
import { generatePrescriptionWhatsAppUrl } from "@/lib/whatsapp-share";

interface PrescriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientDirectoryItem;
  editingItem: MedicalPrescriptionItem | null;
  sourceConsultationLabel: string | null;
  form: UseFormReturn<PrescriptionModalFormValues>;
  isSubmitting: boolean;
  consultations: MedicalConsultationItem[];
  watchedDiagnosis: string;
  watchedCie10: string;
  watchedConsultationId: string;
  draftItems: PrescriptionItemRecord[];
  builder: MedicationBuilderState;
  onBuilderChange: (updater: (prev: MedicationBuilderState) => MedicationBuilderState) => void;
  editingItemIndex: number | null;
  vademecumSearch: string;
  onVademecumSearchChange: (val: string) => void;
  filteredVademecum: ConsultationVademecumOption[];
  dosagePresets: ClinicalDosagePreset[];
  onSelectVademecum: (med: ConsultationVademecumOption, brandIdx?: number) => void;
  onApplyDosagePreset: (preset: ClinicalDosagePreset) => void;
  onSaveBuilderItem: () => void;
  onEditDraftItem: (index: number) => void;
  onCancelEditDraftItem: () => void;
  onRemoveDraftItem: (index: number) => void;
  onAppendIndication: (text: string) => void;
  onSelectConsultationLink: (consultationId: string) => void;
  onSaveAndPrintIntent: (printAfterSave: boolean) => void;
  onSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
}

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function hasPositiveAllergy(value?: string | null): boolean {
  if (!value) return false;
  const clean = value.trim().toLowerCase();
  return (
    clean !== "" &&
    !clean.startsWith("niega") &&
    clean !== "ninguna" &&
    clean !== "ninguno" &&
    clean !== "no refiere"
  );
}

export function PrescriptionModal({
  open,
  onOpenChange,
  patient,
  editingItem,
  sourceConsultationLabel,
  form,
  isSubmitting,
  consultations,
  watchedDiagnosis,
  watchedCie10,
  watchedConsultationId,
  draftItems,
  builder,
  onBuilderChange,
  editingItemIndex,
  vademecumSearch,
  onVademecumSearchChange,
  filteredVademecum,
  dosagePresets,
  onSelectVademecum,
  onApplyDosagePreset,
  onSaveBuilderItem,
  onEditDraftItem,
  onCancelEditDraftItem,
  onRemoveDraftItem,
  onAppendIndication,
  onSelectConsultationLink,
  onSaveAndPrintIntent,
  onSubmit,
}: PrescriptionModalProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  const showAllergies = hasPositiveAllergy(patient.medicalAllergies);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="size-5 text-primary" />
            {editingItem
              ? "Editar Receta Médica Oficial"
              : "Emitir Nueva Receta Médica Oficial (CENDO)"}
          </DialogTitle>
          <DialogDescription>
            Paciente:{" "}
            <strong className="text-foreground">{patient.fullName}</strong> •{" "}
            {patient.documentType} {patient.documentNumber} • {patient.age} años
          </DialogDescription>
        </DialogHeader>

        {/* Alerta de Alergias / RAMs */}
        {showAllergies ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <span className="font-bold uppercase">
                Alerta de Alergias / RAMs registradas:{" "}
              </span>
              <span className="font-medium">{patient.medicalAllergies}</span>
            </div>
          </div>
        ) : null}

        {sourceConsultationLabel ? (
          <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-primary">
            <Sparkles className="size-3.5 shrink-0" />
            <span className="font-medium">{sourceConsultationLabel}</span>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Bloque 1: Fecha, Vínculo con Consulta y Diagnóstico */}
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="space-y-1.5 sm:col-span-4">
                <label htmlFor="rx-date" className="block text-xs font-medium">
                  Fecha de Emisión *
                </label>
                <Input
                  id="rx-date"
                  type="date"
                  className="bg-card font-mono"
                  {...register("prescriptionDate")}
                />
                {errors.prescriptionDate ? (
                  <p className="text-xs text-destructive">
                    {errors.prescriptionDate.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5 sm:col-span-8">
                <label
                  htmlFor="rx-consultation"
                  className="flex items-center gap-1.5 text-xs font-medium"
                >
                  <Link2 className="size-3.5 text-primary" />
                  Vincular con Consulta Médica (Opcional)
                </label>
                <select
                  id="rx-consultation"
                  value={watchedConsultationId}
                  onChange={(e) => onSelectConsultationLink(e.target.value)}
                  className={selectClassName}
                >
                  <option value="">Receta independiente (sin vínculo directo)</option>
                  {consultations.map((cons) => (
                    <option key={cons.id} value={cons.id}>
                      {formatPeruDateDisplay(cons.consultationDate)} — {cons.diagnosis}{" "}
                      {cons.cie10Code ? `(${cons.cie10Code})` : ""}
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

          {/* Bloque 2: Selector de Vademécum + Constructor Posológico */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Vademécum Real */}
            <div className="space-y-2.5 rounded-xl border border-border bg-muted/20 p-3.5 lg:col-span-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-foreground uppercase">
                  Vademécum CENDO ({filteredVademecum.length})
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Clic para cargar dosis
                </span>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute top-2 left-2.5 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={vademecumSearch}
                  onChange={(e) => onVademecumSearchChange(e.target.value)}
                  placeholder="Buscar genérico, marca o grupo..."
                  className="bg-card pl-8 text-xs"
                />
              </div>

              <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {filteredVademecum.length > 0 ? (
                  filteredVademecum.map((med) => (
                    <div
                      key={med.id}
                      className="space-y-1.5 rounded-lg border border-border bg-card p-2.5 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectVademecum(med)}
                        className="flex w-full cursor-pointer items-start justify-between gap-2 text-left hover:text-primary"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">
                            {med.genericName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {med.therapeuticGroup}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          Genérico
                        </Badge>
                      </button>

                      {med.commercialBrands.length > 0 ? (
                        <div className="flex flex-wrap gap-1 border-t border-border pt-1.5">
                          {med.commercialBrands.map((brand, bIdx) => (
                            <button
                              key={`${med.id}-${brand.brandName}-${bIdx}`}
                              type="button"
                              onClick={() => onSelectVademecum(med, bIdx)}
                              className="cursor-pointer rounded border border-border bg-muted/40 px-2 py-0.5 text-[10.5px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                              title={`${brand.laboratory} • ${brand.presentation}`}
                            >
                              {brand.brandName} ({brand.presentation})
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Sin coincidencias en vademécum. Puede escribir el fármaco
                    manualmente en el constructor.
                  </p>
                )}
              </div>
            </div>

            {/* Constructor Estructurado del Medicamento */}
            <div className="space-y-3 rounded-xl border border-border bg-card p-4 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-foreground uppercase">
                  {editingItemIndex !== null
                    ? `Editando Medicamento #${editingItemIndex + 1}`
                    : "Agregar Medicamento al Rp/"}
                </h3>
                {editingItemIndex !== null ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={onCancelEditDraftItem}
                  >
                    Cancelar edición
                  </Button>
                ) : null}
              </div>

              {/* Posologías frecuentes */}
              <div className="space-y-1">
                <span className="block text-[11px] font-medium text-muted-foreground">
                  Pautas Ginecológicas Rápidas (1 clic):
                </span>
                <div className="flex flex-wrap gap-1">
                  {dosagePresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onApplyDosagePreset(preset)}
                      className="cursor-pointer rounded-md border border-border bg-muted/40 px-2 py-1 text-[10.5px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                <div className="space-y-1 sm:col-span-7">
                  <label className="block text-[11px] font-medium text-foreground">
                    Medicamento (Genérico / Comercial) *
                  </label>
                  <Input
                    type="text"
                    value={builder.medicationName}
                    onChange={(e) =>
                      onBuilderChange((prev) => ({
                        ...prev,
                        medicationName: e.target.value,
                      }))
                    }
                    placeholder="Ej. Visanne 2mg (Dienogest)"
                  />
                </div>

                <div className="space-y-1 sm:col-span-5">
                  <label className="block text-[11px] font-medium text-foreground">
                    Presentación
                  </label>
                  <Input
                    type="text"
                    value={builder.presentation}
                    onChange={(e) =>
                      onBuilderChange((prev) => ({
                        ...prev,
                        presentation: e.target.value,
                      }))
                    }
                    placeholder="Caja x 28 comp / Óvulos"
                  />
                </div>

                <div className="space-y-1 sm:col-span-4">
                  <label className="block text-[11px] font-medium text-foreground">
                    Vía *
                  </label>
                  <select
                    value={builder.route}
                    onChange={(e) =>
                      onBuilderChange((prev) => ({
                        ...prev,
                        route: e.target.value,
                      }))
                    }
                    className={selectClassName}
                  >
                    {PRESCRIPTION_ROUTES.map((route) => (
                      <option key={route} value={route}>
                        {route}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-4">
                  <label className="block text-[11px] font-medium text-foreground">
                    Dosis *
                  </label>
                  <Input
                    type="text"
                    value={builder.dosage}
                    onChange={(e) =>
                      onBuilderChange((prev) => ({
                        ...prev,
                        dosage: e.target.value,
                      }))
                    }
                    placeholder="1 tableta / 1 óvulo"
                  />
                </div>

                <div className="space-y-1 sm:col-span-4">
                  <label className="block text-[11px] font-medium text-foreground">
                    Cantidad a dispensar
                  </label>
                  <Input
                    type="text"
                    value={builder.quantity}
                    onChange={(e) =>
                      onBuilderChange((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }))
                    }
                    placeholder="1 caja x 14 tab"
                  />
                </div>

                <div className="space-y-1 sm:col-span-6">
                  <label className="block text-[11px] font-medium text-foreground">
                    Frecuencia *
                  </label>
                  <Input
                    type="text"
                    value={builder.frequency}
                    onChange={(e) =>
                      onBuilderChange((prev) => ({
                        ...prev,
                        frequency: e.target.value,
                      }))
                    }
                    placeholder="Cada 12 horas después de alimentos"
                  />
                </div>

                <div className="space-y-1 sm:col-span-6">
                  <label className="block text-[11px] font-medium text-foreground">
                    Duración *
                  </label>
                  <Input
                    type="text"
                    value={builder.duration}
                    onChange={(e) =>
                      onBuilderChange((prev) => ({
                        ...prev,
                        duration: e.target.value,
                      }))
                    }
                    placeholder="Por 7 días continuos"
                  />
                </div>

                <div className="space-y-1 sm:col-span-12">
                  <label className="block text-[11px] font-medium text-foreground">
                    Indicación específica (opcional)
                  </label>
                  <Input
                    type="text"
                    value={builder.instructions}
                    onChange={(e) =>
                      onBuilderChange((prev) => ({
                        ...prev,
                        instructions: e.target.value,
                      }))
                    }
                    placeholder="Ej. Tomar a la misma hora todos los días / Abstinencia sexual"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={onSaveBuilderItem}
                >
                  <Plus className="size-3.5" />
                  {editingItemIndex !== null
                    ? "Guardar Medicamento Editado"
                    : "Añadir Medicamento a la Receta"}
                </Button>
              </div>
            </div>
          </div>

          {/* Lista de Medicamentos Agregados (Rp/) */}
          <div className="space-y-2.5 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground uppercase">
                Prescripción Actual (Rp/ • {draftItems.length} medicamento
                {draftItems.length === 1 ? "" : "s"})
              </h3>
              {draftItems.length === 0 ? (
                <span className="text-xs font-medium text-destructive">
                  Agregue al menos 1 medicamento arriba
                </span>
              ) : null}
            </div>

            {draftItems.length > 0 ? (
              <div className="space-y-2">
                {draftItems.map((it, idx) => (
                  <div
                    key={it.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border bg-card p-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded bg-primary font-mono text-[10px] font-bold text-primary-foreground">
                          {idx + 1}
                        </span>
                        <strong className="text-sm text-foreground">
                          {it.medicationName}
                        </strong>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {it.presentation}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {it.route}
                        </Badge>
                      </div>
                      <p className="pl-7 text-foreground">
                        Dosis: <strong>{it.dosage}</strong> • Frecuencia:{" "}
                        <strong>{it.frequency}</strong> • Duración:{" "}
                        <strong>{it.duration}</strong>
                        {it.quantity ? ` • Cant: ${it.quantity}` : ""}
                      </p>
                      {it.instructions ? (
                        <p className="pl-7 italic text-muted-foreground">
                          {it.instructions}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onEditDraftItem(idx)}
                        aria-label="Editar medicamento"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onRemoveDraftItem(idx)}
                        aria-label="Quitar medicamento"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-card py-6 text-center text-xs text-muted-foreground">
                Ningún medicamento añadido todavía. Seleccione del Vademécum o
                use el constructor de la derecha.
              </div>
            )}
          </div>

          {/* Bloque 3: Indicaciones Generales y Próximo Control */}
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="space-y-1.5">
              <label htmlFor="rx-general" className="block text-xs font-medium">
                Indicaciones Generales y Cuidados
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_GENERAL_INDICATIONS.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => onAppendIndication(ind)}
                    className="cursor-pointer rounded-md border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    + {ind}
                  </button>
                ))}
              </div>
              <Textarea
                id="rx-general"
                rows={2}
                placeholder="Cuidados generales, signos de alarma, dieta..."
                {...register("generalIndications")}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="rx-next-date" className="block text-xs font-medium">
                Próximo Control Ginecológico Sugerido
              </label>
              <Input
                id="rx-next-date"
                type="date"
                className="w-full bg-card font-mono sm:w-60"
                {...register("nextAppointmentDate")}
              />
              {errors.nextAppointmentDate ? (
                <p className="text-xs text-destructive">
                  {errors.nextAppointmentDate.message}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="flex-wrap justify-between gap-2 sm:justify-between">
            <div>
              {editingItem ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const values = form.getValues();
                    const url = generatePrescriptionWhatsAppUrl({
                      patientName: patient.fullName,
                      patientPhone: patient.phone,
                      prescriptionDate: values.prescriptionDate,
                      doctorName: editingItem.doctorName,
                      doctorCmp: editingItem.doctorCmp,
                      diagnosis: values.diagnosis,
                      cie10Code: values.cie10Code,
                      items: draftItems,
                      generalIndications: values.generalIndications,
                      nextAppointmentDate: values.nextAppointmentDate,
                    });
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  <MessageCircle className="size-4 text-success" />
                  WhatsApp
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                Guardar e Imprimir
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
                    : "Emitir Receta"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
