"use client";

import type { BaseSyntheticEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  Activity,
  AlertTriangle,
  Calendar,
  FlaskConical,
  HeartPulse,
  Pencil,
  Pill,
  Printer,
  Sparkles,
  Stethoscope,
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
import type {
  ConsultationActiveAppointment,
  ConsultationLabTemplateOption,
  ConsultationVademecumOption,
  MedicalConsultationItem,
} from "@/features/consultas/consultas.schema";
import type { ConsultationModalFormValues } from "@/features/consultas/hooks/use-consultas";
import type { LabOrderItem } from "@/features/laboratorio/laboratorio.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import type { MedicalPrescriptionItem } from "@/features/recetas/recetas.schema";
import { cn, formatPeruDateDisplay } from "@/lib/utils";

interface ConsultationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientDirectoryItem;
  editingItem: MedicalConsultationItem | null;
  lastConsultation: MedicalConsultationItem | null;
  form: UseFormReturn<ConsultationModalFormValues>;
  isSubmitting: boolean;
  activeAppointments: ConsultationActiveAppointment[];
  consultationReasons: string[];
  onOpenManageReasons?: () => void;
  vademecumOptions: ConsultationVademecumOption[];
  labTemplates: ConsultationLabTemplateOption[];
  liveBmi: number;
  bmiMeta: { label: string; tone: "normal" | "warning" | "destructive" };
  vitalAlerts: Array<{ label: string; tone: "warning" | "destructive" }>;
  watchedDiagnosis: string;
  watchedCie10: string;
  watchedAppointmentId: string;
  watchedAuxExams: string;
  watchedRxNotes: string;
  onSelectReasonPreset: (reason: string) => void;
  onFillNormalPhysicalExam: () => void;
  onAppendLabTemplate: (templateId: string) => void;
  onAppendMedication: (medId: string) => void;
  linkedLabOrders?: LabOrderItem[];
  onViewLinkedLabOrder?: (ord: LabOrderItem) => void;
  onEditLinkedLabOrder?: (ord: LabOrderItem) => void;
  onEmitLabOrderFromConsultation?: (cons: MedicalConsultationItem) => void;
  linkedPrescriptions?: MedicalPrescriptionItem[];
  onViewLinkedPrescription?: (rx: MedicalPrescriptionItem) => void;
  onEditLinkedPrescription?: (rx: MedicalPrescriptionItem) => void;
  onEmitPrescriptionFromConsultation?: (cons: MedicalConsultationItem) => void;
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
    clean !== "no refiere"
  );
}

export function ConsultationModal({
  open,
  onOpenChange,
  patient,
  editingItem,
  lastConsultation,
  form,
  isSubmitting,
  activeAppointments,
  consultationReasons,
  onOpenManageReasons,
  vademecumOptions,
  labTemplates,
  liveBmi,
  bmiMeta,
  vitalAlerts,
  watchedDiagnosis,
  watchedCie10,
  watchedAppointmentId,
  watchedAuxExams,
  watchedRxNotes,
  onSelectReasonPreset,
  onFillNormalPhysicalExam,
  onAppendLabTemplate,
  onAppendMedication,
  linkedLabOrders = [],
  onViewLinkedLabOrder,
  onEditLinkedLabOrder,
  onEmitLabOrderFromConsultation,
  linkedPrescriptions = [],
  onViewLinkedPrescription,
  onEditLinkedPrescription,
  onEmitPrescriptionFromConsultation,
  onSaveAndPrintIntent,
  onSubmit,
}: ConsultationModalProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  const allergyAlert = hasPositiveAllergy(patient.medicalAllergies);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="size-4 text-primary" />
            {editingItem
              ? "Editar Consulta Ginecológica"
              : "Nueva Consulta Ginecológica Estructurada"}
          </DialogTitle>
          <DialogDescription>
            Paciente: <strong className="text-foreground">{patient.fullName}</strong> •{" "}
            <span className="font-mono">
              {patient.documentType} {patient.documentNumber}
            </span>{" "}
            • {patient.age} años
          </DialogDescription>
        </DialogHeader>

        <form id="consultation-form" onSubmit={onSubmit} className="space-y-5">
          {/* Alerta de alergias + resumen última consulta */}
          <div className="flex flex-wrap items-center gap-2">
            {allergyAlert ? (
              <Badge variant="destructive" className="px-2.5 py-1 text-xs">
                <AlertTriangle className="size-3.5" />
                RAM / Alergia registrada: {patient.medicalAllergies}
              </Badge>
            ) : null}

            {!editingItem && lastConsultation ? (
              <div className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
                Última atención (
                <span className="font-mono">
                  {formatPeruDateDisplay(lastConsultation.consultationDate)}
                </span>
                ):{" "}
                <strong className="text-foreground">
                  {lastConsultation.diagnosis}
                </strong>
                {lastConsultation.cie10Code
                  ? ` [${lastConsultation.cie10Code}]`
                  : ""}
              </div>
            ) : null}
          </div>

          {/* Vínculo con Agenda */}
          {activeAppointments.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-12 sm:items-center">
              <div className="space-y-1 sm:col-span-7">
                <label
                  htmlFor="cons-appointment"
                  className="flex items-center gap-1.5 text-xs font-medium"
                >
                  <Calendar className="size-3.5 text-primary" />
                  Vincular con Cita de Agenda (opcional)
                </label>
                <select
                  id="cons-appointment"
                  className={selectClassName}
                  {...register("appointmentId")}
                >
                  <option value="">Sin cita vinculada (atención directa)</option>
                  {activeAppointments.map((appt) => (
                    <option key={appt.id} value={appt.id}>
                      {formatPeruDateDisplay(appt.appointmentDate)}{" "}
                      {appt.appointmentTime} • {appt.status} — {appt.reason}
                    </option>
                  ))}
                </select>
              </div>

              {!editingItem && watchedAppointmentId ? (
                <label className="flex cursor-pointer items-center gap-2 pt-4 text-xs font-medium text-foreground sm:col-span-5">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    {...register("markAppointmentAttended")}
                  />
                  <span>Marcar cita como ATENDIDA al guardar</span>
                </label>
              ) : null}
            </div>
          ) : null}

          {/* 1. Anamnesis & Motivo de Consulta */}
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="text-xs font-bold tracking-wider text-primary uppercase">
              1. Anamnesis & Motivo de Consulta
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="space-y-1.5 sm:col-span-4">
                <label htmlFor="cons-date" className="block text-xs font-medium">
                  Fecha de Atención <span className="text-destructive">*</span>
                </label>
                <Input
                  id="cons-date"
                  type="date"
                  className="bg-card font-mono"
                  {...register("consultationDate")}
                />
                {errors.consultationDate ? (
                  <p className="text-xs text-destructive">
                    {errors.consultationDate.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5 sm:col-span-8">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="cons-reason-preset"
                    className="block text-xs font-medium"
                  >
                    Motivos Frecuentes (1 clic)
                  </label>
                  {onOpenManageReasons ? (
                    <button
                      type="button"
                      onClick={onOpenManageReasons}
                      className="cursor-pointer text-[11px] font-medium text-primary hover:underline"
                    >
                      Gestionar motivos
                    </button>
                  ) : null}
                </div>
                <select
                  id="cons-reason-preset"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      onSelectReasonPreset(e.target.value);
                    }
                  }}
                  className={selectClassName}
                >
                  <option value="" disabled>
                    Seleccione un motivo frecuente para rellenar...
                  </option>
                  {consultationReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-8">
                <label htmlFor="cons-reason" className="block text-xs font-medium">
                  Motivo de Consulta <span className="text-destructive">*</span>
                </label>
                <Input
                  id="cons-reason"
                  placeholder="Ej. Dolor pélvico crónico y dismenorrea progresiva"
                  className="bg-card"
                  aria-invalid={Boolean(errors.reasonForVisit)}
                  {...register("reasonForVisit")}
                />
                {errors.reasonForVisit ? (
                  <p className="text-xs text-destructive">
                    {errors.reasonForVisit.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5 sm:col-span-4">
                <label htmlFor="cons-illness" className="block text-xs font-medium">
                  Tiempo de Enfermedad
                </label>
                <Input
                  id="cons-illness"
                  placeholder="Ej. 6 meses, 3 semanas"
                  className="bg-card"
                  {...register("illnessTime")}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-12">
                <label htmlFor="cons-symptoms" className="block text-xs font-medium">
                  Síntomas y Relato Cronológico
                </label>
                <Textarea
                  id="cons-symptoms"
                  rows={2}
                  placeholder="Detalle cronología, escala EVA, características del sangrado o flujo..."
                  className="bg-card"
                  {...register("symptoms")}
                />
              </div>
            </div>
          </div>

          {/* 2. Signos Vitales y Antropometría */}
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-primary uppercase">
                <HeartPulse className="size-3.5" />
                2. Signos Vitales & Antropometría
              </h3>

              {vitalAlerts.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {vitalAlerts.map((al) => (
                    <Badge
                      key={al.label}
                      variant={
                        al.tone === "destructive" ? "destructive" : "outline"
                      }
                      className={cn(
                        "font-mono text-[10px]",
                        al.tone === "warning" &&
                          "border-warning/60 bg-warning/15 text-foreground"
                      )}
                    >
                      <AlertTriangle className="size-2.5" />
                      {al.label}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-8">
              <div className="space-y-1">
                <label htmlFor="vs-bp" className="block text-[11px] font-medium">
                  P.A. (mmHg)
                </label>
                <Input
                  id="vs-bp"
                  placeholder="110/70"
                  className="bg-card font-mono text-xs"
                  {...register("bloodPressure")}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="vs-hr" className="block text-[11px] font-medium">
                  F.C. (lpm)
                </label>
                <Input
                  id="vs-hr"
                  type="number"
                  className="bg-card font-mono text-xs"
                  {...register("heartRate", { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="vs-rr" className="block text-[11px] font-medium">
                  F.R. (rpm)
                </label>
                <Input
                  id="vs-rr"
                  type="number"
                  className="bg-card font-mono text-xs"
                  {...register("respiratoryRate", { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="vs-temp" className="block text-[11px] font-medium">
                  Temp (°C)
                </label>
                <Input
                  id="vs-temp"
                  type="number"
                  step="0.1"
                  className="bg-card font-mono text-xs"
                  {...register("temperature", { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="vs-spo2" className="block text-[11px] font-medium">
                  SatO2 (%)
                </label>
                <Input
                  id="vs-spo2"
                  type="number"
                  className="bg-card font-mono text-xs"
                  {...register("oxygenSaturation", { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="vs-weight" className="block text-[11px] font-medium">
                  Peso (kg)
                </label>
                <Input
                  id="vs-weight"
                  type="number"
                  step="0.1"
                  className="bg-card font-mono text-xs"
                  {...register("weightKg", { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="vs-height" className="block text-[11px] font-medium">
                  Talla (cm)
                </label>
                <Input
                  id="vs-height"
                  type="number"
                  step="0.5"
                  className="bg-card font-mono text-xs"
                  {...register("heightCm", { valueAsNumber: true })}
                />
              </div>

              <div className="flex flex-col justify-center rounded-lg border border-border bg-card px-2.5 py-1.5">
                <span className="font-mono text-[9.5px] font-semibold text-muted-foreground uppercase">
                  IMC OMS
                </span>
                <span className="font-mono text-xs font-bold text-primary">
                  {liveBmi} kg/m²
                </span>
                <span
                  className={cn(
                    "truncate text-[10px] font-medium",
                    bmiMeta.tone === "destructive"
                      ? "text-destructive"
                      : bmiMeta.tone === "warning"
                        ? "text-warning"
                        : "text-success"
                  )}
                >
                  {bmiMeta.label}
                </span>
              </div>
            </div>

            {errors.bloodPressure ||
            errors.heartRate ||
            errors.temperature ||
            errors.weightKg ||
            errors.heightCm ? (
              <p className="text-xs text-destructive">
                {errors.bloodPressure?.message ||
                  errors.heartRate?.message ||
                  errors.temperature?.message ||
                  errors.weightKg?.message ||
                  errors.heightCm?.message}
              </p>
            ) : null}
          </div>

          {/* 3. Examen Físico Ginecológico Dirigido */}
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-primary uppercase">
                <Activity className="size-3.5" />
                3. Examen Físico Ginecológico Dirigido
              </h3>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={onFillNormalPhysicalExam}
              >
                <Sparkles className="size-3" />
                Rellenar Normalidad (1 Clic)
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="pe-general" className="block text-xs font-medium">
                  Examen General
                </label>
                <Textarea
                  id="pe-general"
                  rows={2}
                  className="bg-card"
                  {...register("generalExam")}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="pe-breasts" className="block text-xs font-medium">
                  Examen de Mamas (Bilateral)
                </label>
                <Textarea
                  id="pe-breasts"
                  rows={2}
                  className="bg-card"
                  {...register("breastsExam")}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="pe-genitalia" className="block text-xs font-medium">
                  Genitales Externos
                </label>
                <Input
                  id="pe-genitalia"
                  className="bg-card"
                  {...register("externalGenitalia")}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="pe-spec" className="block text-xs font-medium">
                  Especuloscopía (Vagina & Cérvix)
                </label>
                <Input
                  id="pe-spec"
                  className="bg-card"
                  {...register("speculoscopy")}
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="pe-bimanual" className="block text-xs font-medium">
                  Tacto Bimanual (Útero & Anexos)
                </label>
                <Input
                  id="pe-bimanual"
                  className="bg-card"
                  {...register("bimanualPalpation")}
                />
              </div>
            </div>
          </div>

          {/* 4. Diagnóstico CIE-10, Plan, Exámenes Auxiliares & Receta */}
          <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="text-xs font-bold tracking-wider text-primary uppercase">
              4. Diagnóstico CIE-10 & Plan Terapéutico
            </h3>

            <Cie10Autocomplete
              diagnosis={watchedDiagnosis}
              cie10Code={watchedCie10}
              onChange={(diag, code) => {
                setValue("diagnosis", diag, { shouldValidate: true });
                setValue("cie10Code", code, { shouldValidate: true });
              }}
              required
              diagnosisError={errors.diagnosis?.message}
            />

            <div className="space-y-1.5">
              <label htmlFor="cons-plan" className="block text-xs font-medium">
                Plan de Trabajo / Indicaciones <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="cons-plan"
                rows={3}
                className="bg-card"
                aria-invalid={Boolean(errors.treatmentPlan)}
                {...register("treatmentPlan")}
              />
              {errors.treatmentPlan ? (
                <p className="text-xs text-destructive">
                  {errors.treatmentPlan.message}
                </p>
              ) : null}
            </div>

            {/* Exámenes Auxiliares + Plantillas Lab o Vista de Órdenes Vinculadas */}
            <div className="space-y-2.5 rounded-lg border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="cons-aux"
                  className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
                >
                  <FlaskConical className="size-3.5 text-primary" />
                  Exámenes Auxiliares / Laboratorio
                </label>

                {editingItem && linkedLabOrders.length > 0 ? (
                  <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
                    Orden oficial emitida ({linkedLabOrders.length})
                  </Badge>
                ) : (
                  <select
                    aria-label="Añadir plantilla de laboratorio"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) onAppendLabTemplate(e.target.value);
                    }}
                    className="h-7 max-w-xs rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none"
                  >
                    <option value="" disabled>
                      + Añadir plantilla de laboratorio...
                    </option>
                    {labTemplates.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {editingItem && linkedLabOrders.length > 0 ? (
                <div className="space-y-2.5">
                  {linkedLabOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="space-y-2 rounded-lg border border-border bg-muted/20 p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            LAB-{ord.id.slice(0, 8).toUpperCase()}
                          </Badge>
                          <Badge
                            variant={
                              ord.urgency === "Urgente"
                                ? "destructive"
                                : "secondary"
                            }
                            className="font-mono text-[10px]"
                          >
                            {ord.urgency}
                          </Badge>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {formatPeruDateDisplay(ord.orderDate)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {onViewLinkedLabOrder ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => {
                                onOpenChange(false);
                                onViewLinkedLabOrder(ord);
                              }}
                            >
                              <Printer className="size-3" />
                              Imprimir
                            </Button>
                          ) : null}

                          {onEditLinkedLabOrder ? (
                            <Button
                              type="button"
                              variant="default"
                              size="xs"
                              onClick={() => {
                                onOpenChange(false);
                                onEditLinkedLabOrder(ord);
                              }}
                            >
                              <Pencil className="size-3" />
                              Editar Orden
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {ord.items.map((it) => (
                          <Badge
                            key={it.id}
                            variant="outline"
                            className="bg-card text-[10.5px] font-normal"
                          >
                            {it.testName}
                          </Badge>
                        ))}
                        {ord.customTests ? (
                          <Badge
                            variant="secondary"
                            className="text-[10.5px] italic"
                          >
                            + {ord.customTests}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {onEmitLabOrderFromConsultation ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px] text-muted-foreground">
                      <span>
                        ¿Requiere otra orden separada (ej. biopsia / patología aparte)?
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          const currentValues = form.getValues();
                          onOpenChange(false);
                          onEmitLabOrderFromConsultation({
                            ...editingItem,
                            diagnosis:
                              currentValues.diagnosis.trim() || editingItem.diagnosis,
                            cie10Code:
                              currentValues.cie10Code.trim() || editingItem.cie10Code,
                            auxiliaryExams: "",
                            nextAppointmentDate: currentValues.nextAppointmentDate,
                          });
                        }}
                      >
                        <FlaskConical className="size-3" />
                        + Orden adicional
                      </Button>
                    </div>
                  ) : null}

                  {watchedAuxExams.trim() ? (
                    <details className="rounded-md border border-border bg-muted/10 p-2 text-xs">
                      <summary className="cursor-pointer font-medium text-muted-foreground select-none hover:text-foreground">
                        Notas previas registradas en consulta
                      </summary>
                      <div className="pt-2">
                        <Textarea
                          id="cons-aux"
                          rows={2}
                          {...register("auxiliaryExams")}
                        />
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : (
                <>
                  <Textarea
                    id="cons-aux"
                    rows={2}
                    placeholder="Dejar en blanco si no solicita exámenes auxiliares..."
                    {...register("auxiliaryExams")}
                  />

                  {!editingItem && watchedAuxExams.trim() ? (
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-primary">
                      <input
                        type="checkbox"
                        className="size-3.5 accent-primary"
                        {...register("generateLabOrder")}
                      />
                      <span>
                        Generar Orden de Laboratorio vinculada automáticamente al guardar
                      </span>
                    </label>
                  ) : null}

                  {editingItem && onEmitLabOrderFromConsultation ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                      <span className="text-[11px] text-muted-foreground">
                        Sin orden de laboratorio estructurada emitida para esta consulta.
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          const currentValues = form.getValues();
                          onOpenChange(false);
                          onEmitLabOrderFromConsultation({
                            ...editingItem,
                            diagnosis:
                              currentValues.diagnosis.trim() || editingItem.diagnosis,
                            cie10Code:
                              currentValues.cie10Code.trim() || editingItem.cie10Code,
                            auxiliaryExams: currentValues.auxiliaryExams,
                            nextAppointmentDate: currentValues.nextAppointmentDate,
                          });
                        }}
                      >
                        <FlaskConical className="size-3" />
                        Emitir Orden de Laboratorio
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {/* Medicación / Rp + Vademécum o Vista de Receta Vinculada */}
            <div className="space-y-2.5 rounded-lg border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="cons-rx"
                  className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
                >
                  <Pill className="size-3.5 text-primary" />
                  Receta / Indicaciones Farmacológicas (Rp/)
                </label>

                {editingItem && linkedPrescriptions.length > 0 ? (
                  <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
                    Receta oficial emitida ({linkedPrescriptions.length})
                  </Badge>
                ) : (
                  <select
                    aria-label="Añadir fármaco del vademécum"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) onAppendMedication(e.target.value);
                    }}
                    className="h-7 max-w-xs rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none"
                  >
                    <option value="" disabled>
                      + Añadir fármaco del vademécum...
                    </option>
                    {vademecumOptions.map((med) => (
                      <option key={med.id} value={med.id}>
                        {med.genericName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {editingItem && linkedPrescriptions.length > 0 ? (
                <div className="space-y-2.5">
                  {linkedPrescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      className="space-y-2 rounded-lg border border-border bg-muted/20 p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            REC-{rx.id.slice(0, 8).toUpperCase()}
                          </Badge>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {formatPeruDateDisplay(rx.prescriptionDate)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {onViewLinkedPrescription ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => {
                                onOpenChange(false);
                                onViewLinkedPrescription(rx);
                              }}
                            >
                              <Printer className="size-3" />
                              Imprimir
                            </Button>
                          ) : null}

                          {onEditLinkedPrescription ? (
                            <Button
                              type="button"
                              variant="default"
                              size="xs"
                              onClick={() => {
                                onOpenChange(false);
                                onEditLinkedPrescription(rx);
                              }}
                            >
                              <Pencil className="size-3" />
                              Editar Receta
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      <ul className="space-y-1 text-xs">
                        {rx.items.map((item, idx) => (
                          <li key={item.id} className="leading-snug text-foreground">
                            <span className="font-mono font-bold text-primary">
                              {idx + 1}.
                            </span>{" "}
                            <strong>{item.medicationName}</strong>{" "}
                            <span className="text-muted-foreground">
                              — {item.route} • {item.dosage} • {item.frequency} •{" "}
                              {item.duration}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {onEmitPrescriptionFromConsultation ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px] text-muted-foreground">
                      <span>
                        ¿Requiere receta aparte (ej. pareja o fármaco retenido en farmacia)?
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          const currentValues = form.getValues();
                          onOpenChange(false);
                          onEmitPrescriptionFromConsultation({
                            ...editingItem,
                            diagnosis:
                              currentValues.diagnosis.trim() || editingItem.diagnosis,
                            cie10Code:
                              currentValues.cie10Code.trim() || editingItem.cie10Code,
                            prescriptionNotes: "",
                            nextAppointmentDate: currentValues.nextAppointmentDate,
                          });
                        }}
                      >
                        <Pill className="size-3" />
                        + Receta adicional
                      </Button>
                    </div>
                  ) : null}

                  {watchedRxNotes.trim() ? (
                    <details className="rounded-md border border-border bg-muted/10 p-2 text-xs">
                      <summary className="cursor-pointer font-medium text-muted-foreground select-none hover:text-foreground">
                        Notas previas registradas en consulta
                      </summary>
                      <div className="pt-2">
                        <Textarea
                          id="cons-rx"
                          rows={2}
                          {...register("prescriptionNotes")}
                        />
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : (
                <>
                  <Textarea
                    id="cons-rx"
                    rows={2}
                    placeholder="Dejar en blanco si no prescribe medicación..."
                    {...register("prescriptionNotes")}
                  />

                  {!editingItem && watchedRxNotes.trim() ? (
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-primary">
                      <input
                        type="checkbox"
                        className="size-3.5 accent-primary"
                        {...register("generatePrescription")}
                      />
                      <span>
                        Generar Receta Médica vinculada automáticamente al guardar
                      </span>
                    </label>
                  ) : null}

                  {editingItem && onEmitPrescriptionFromConsultation ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                      <span className="text-[11px] text-muted-foreground">
                        Sin receta estructurada emitida para esta consulta.
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          const currentValues = form.getValues();
                          onOpenChange(false);
                          onEmitPrescriptionFromConsultation({
                            ...editingItem,
                            diagnosis:
                              currentValues.diagnosis.trim() || editingItem.diagnosis,
                            cie10Code:
                              currentValues.cie10Code.trim() || editingItem.cie10Code,
                            prescriptionNotes: currentValues.prescriptionNotes,
                            nextAppointmentDate: currentValues.nextAppointmentDate,
                          });
                        }}
                      >
                        <Pill className="size-3" />
                        Emitir Receta Oficial
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cons-next-date" className="block text-xs font-medium">
                Próxima Cita de Control Sugerida
              </label>
              <Input
                id="cons-next-date"
                type="date"
                className="w-full bg-card font-mono sm:w-60"
                {...register("nextAppointmentDate")}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3">
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
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => onSaveAndPrintIntent(true)}
            >
              <Printer className="size-4" />
              {isSubmitting ? "Guardando..." : "Guardar e Imprimir A4"}
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={() => onSaveAndPrintIntent(false)}
            >
              {isSubmitting
                ? "Guardando..."
                : editingItem
                  ? "Guardar Cambios"
                  : "Guardar Consulta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
