"use client";

import { useState, type BaseSyntheticEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CalendarPlus,
  Clock,
  FlaskConical,
  HeartPulse,
  Pencil,
  Pill,
  Plus,
  Printer,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { Cie10Autocomplete } from "@/components/common/Cie10Autocomplete";
import {
  PatientBackgroundQuickPanel,
  ViewBackgroundButton,
} from "@/components/pacientes/PatientBackgroundQuickPanel";
import type { ColposcopyReportItem } from "@/features/colposcopia/colposcopia.schema";
import type { UltrasoundReportItem } from "@/features/ecografias/ecografias.schema";
import {
  APPOINTMENT_TYPES,
  APPOINTMENT_TYPE_LABELS,
} from "@/features/agenda/agenda.schema";
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
  DraftLabOrderForConsultation,
  DraftPrescriptionForConsultation,
  MedicalConsultationItem,
} from "@/features/consultas/consultas.schema";
import type { ConsultationModalFormValues } from "@/features/consultas/hooks/use-consultas";
import type { LabOrderItem } from "@/features/laboratorio/laboratorio.schema";
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import type { MedicalPrescriptionItem } from "@/features/recetas/recetas.schema";
import { cn, formatPeruDateDisplay } from "@/lib/utils";

interface ConsultationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientDirectoryItem;
  background?: PatientBackgroundItem | null;
  lastUltrasound?: UltrasoundReportItem | null;
  lastColposcopy?: ColposcopyReportItem | null;
  editingItem: MedicalConsultationItem | null;
  lastConsultation: MedicalConsultationItem | null;
  form: UseFormReturn<ConsultationModalFormValues>;
  isSubmitting: boolean;
  activeAppointments: ConsultationActiveAppointment[];
  consultationReasons: string[];
  onOpenManageReasons?: () => void;
  liveBmi: number;
  bmiMeta: { label: string; tone: "normal" | "warning" | "destructive" };
  vitalAlerts: Array<{ label: string; tone: "warning" | "destructive" }>;
  watchedDiagnosis: string;
  watchedCie10: string;
  watchedAppointmentId: string;
  watchedAuxExams: string;
  watchedRxNotes: string;
  watchedNextDate: string;
  watchedScheduleNext: boolean;
  draftLabOrders: DraftLabOrderForConsultation[];
  draftPrescriptions: DraftPrescriptionForConsultation[];
  onSelectReasonPreset: (reason: string) => void;
  onFillNormalPhysicalExam: () => void;
  onOpenAddLabOrderModal: () => void;
  onOpenEditDraftLabOrder: (
    draft: DraftLabOrderForConsultation,
    index: number
  ) => void;
  onRemoveDraftLabOrder: (index: number) => void;
  onOpenAddPrescriptionModal: () => void;
  onOpenEditDraftPrescription: (
    draft: DraftPrescriptionForConsultation,
    index: number
  ) => void;
  onRemoveDraftPrescription: (index: number) => void;
  onApplyQuickNextDate: (
    offset: { days?: number; months?: number } | null
  ) => void;
  onToggleScheduleNextAppointment: (checked: boolean) => void;
  linkedLabOrders?: LabOrderItem[];
  onViewLinkedLabOrder?: (ord: LabOrderItem) => void;
  onEditLinkedLabOrder?: (ord: LabOrderItem) => void;
  linkedPrescriptions?: MedicalPrescriptionItem[];
  onViewLinkedPrescription?: (rx: MedicalPrescriptionItem) => void;
  onEditLinkedPrescription?: (rx: MedicalPrescriptionItem) => void;
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
  background,
  lastUltrasound,
  lastColposcopy,
  editingItem,
  lastConsultation,
  form,
  isSubmitting,
  activeAppointments,
  consultationReasons,
  onOpenManageReasons,
  liveBmi,
  bmiMeta,
  vitalAlerts,
  watchedDiagnosis,
  watchedCie10,
  watchedAppointmentId,
  watchedAuxExams,
  watchedRxNotes,
  watchedNextDate,
  watchedScheduleNext,
  draftLabOrders,
  draftPrescriptions,
  onSelectReasonPreset,
  onFillNormalPhysicalExam,
  onOpenAddLabOrderModal,
  onOpenEditDraftLabOrder,
  onRemoveDraftLabOrder,
  onOpenAddPrescriptionModal,
  onOpenEditDraftPrescription,
  onRemoveDraftPrescription,
  onApplyQuickNextDate,
  onToggleScheduleNextAppointment,
  linkedLabOrders = [],
  onViewLinkedLabOrder,
  onEditLinkedLabOrder,
  linkedPrescriptions = [],
  onViewLinkedPrescription,
  onEditLinkedPrescription,
  onSaveAndPrintIntent,
  onSubmit,
}: ConsultationModalProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  const [showBackground, setShowBackground] = useState(false);
  const allergyAlert = hasPositiveAllergy(patient.medicalAllergies);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:pr-8">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2">
                <Stethoscope className="size-4 text-primary" />
                {editingItem
                  ? "Editar Consulta Ginecológica"
                  : "Nueva Consulta Ginecológica Estructurada"}
              </DialogTitle>
              <DialogDescription>
                Paciente:{" "}
                <strong className="text-foreground">{patient.fullName}</strong> •{" "}
                <span className="font-mono">
                  {patient.documentType} {patient.documentNumber}
                </span>{" "}
                • {patient.age} años
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
                  placeholder="72"
                  className="bg-card font-mono text-xs"
                  {...register("heartRate")}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="vs-rr" className="block text-[11px] font-medium">
                  F.R. (rpm)
                </label>
                <Input
                  id="vs-rr"
                  type="number"
                  placeholder="18"
                  className="bg-card font-mono text-xs"
                  {...register("respiratoryRate")}
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
                  placeholder="36.5"
                  className="bg-card font-mono text-xs"
                  {...register("temperature")}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="vs-spo2" className="block text-[11px] font-medium">
                  SatO2 (%)
                </label>
                <Input
                  id="vs-spo2"
                  type="number"
                  placeholder="98"
                  className="bg-card font-mono text-xs"
                  {...register("oxygenSaturation")}
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
                  placeholder="58.0"
                  className="bg-card font-mono text-xs"
                  {...register("weightKg")}
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
                  placeholder="162"
                  className="bg-card font-mono text-xs"
                  {...register("heightCm")}
                />
              </div>

              <div className="flex flex-col justify-center rounded-lg border border-border bg-card px-2.5 py-1.5">
                <span className="font-mono text-[9.5px] font-semibold text-muted-foreground uppercase">
                  IMC OMS
                </span>
                <span className="font-mono text-xs font-bold text-primary">
                  {liveBmi > 0 ? `${liveBmi} kg/m²` : "—"}
                </span>
                <span
                  className={cn(
                    "truncate text-[10px] font-medium",
                    liveBmi <= 0
                      ? "text-muted-foreground"
                      : bmiMeta.tone === "destructive"
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
            errors.respiratoryRate ||
            errors.temperature ||
            errors.oxygenSaturation ||
            errors.weightKg ||
            errors.heightCm ? (
              <p className="text-xs text-destructive">
                {errors.bloodPressure?.message ||
                  errors.heartRate?.message ||
                  errors.respiratoryRate?.message ||
                  errors.temperature?.message ||
                  errors.oxygenSaturation?.message ||
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
                  placeholder="Ej. Paciente en buen estado general, lúcida, orientada, hidratada y afebril..."
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
                  placeholder="Ej. Mamas simétricas, sin nódulos palpables ni secreción por pezón..."
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
                  placeholder="Ej. Genitales externos de morfología habitual, sin lesiones..."
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
                  placeholder="Ej. Vagina elástica normotrófica; cérvix central, epitelio liso..."
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
                  placeholder="Ej. Útero de tamaño y consistencia conservados, móvil, anexos no palpables..."
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
                placeholder="Ej. 1. Indicaciones generales de manejo clínico. 2. Signos de alarma y evaluación con resultados..."
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

            {/* Exámenes Auxiliares / Órdenes de Laboratorio */}
            <div className="space-y-2.5 rounded-lg border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <FlaskConical className="size-3.5 text-primary" />
                    Exámenes Auxiliares / Laboratorio
                  </span>
                  {editingItem && linkedLabOrders.length > 0 ? (
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {linkedLabOrders.length} emitida(s)
                    </Badge>
                  ) : !editingItem && draftLabOrders.length > 0 ? (
                    <Badge variant="outline" className="border-primary/40 bg-primary/10 font-mono text-[10px] text-primary">
                      {draftLabOrders.length} por emitir
                    </Badge>
                  ) : null}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={onOpenAddLabOrderModal}
                >
                  <Plus className="size-3" />
                  Añadir Orden de Laboratorio
                </Button>
              </div>

              {editingItem ? (
                linkedLabOrders.length > 0 ? (
                  <div className="space-y-2">
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
                                onClick={() => onViewLinkedLabOrder(ord)}
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
                                onClick={() => onEditLinkedLabOrder(ord)}
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
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Sin orden de laboratorio estructurada emitida para esta consulta. Use{" "}
                    <strong>+ Añadir Orden de Laboratorio</strong> para generarla sin salir.
                  </p>
                )
              ) : draftLabOrders.length > 0 ? (
                <div className="space-y-2">
                  {draftLabOrders.map((draft, idx) => (
                    <div
                      key={`draft-lab-${idx}`}
                      className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="font-mono text-[10px]">
                            ORDEN EN BORRADOR #{idx + 1}
                          </Badge>
                          <Badge
                            variant={
                              draft.urgency === "Urgente"
                                ? "destructive"
                                : "secondary"
                            }
                            className="font-mono text-[10px]"
                          >
                            {draft.urgency}
                          </Badge>
                          {draft.templateTitle ? (
                            <span className="font-medium text-foreground">
                              {draft.templateTitle}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => onOpenEditDraftLabOrder(draft, idx)}
                          >
                            <Pencil className="size-3" />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => onRemoveDraftLabOrder(idx)}
                            aria-label="Quitar orden borrador"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {draft.items.map((it) => (
                          <Badge
                            key={it.id}
                            variant="outline"
                            className="bg-card text-[10.5px] font-normal"
                          >
                            {it.testName}
                          </Badge>
                        ))}
                        {draft.customTests ? (
                          <Badge
                            variant="secondary"
                            className="text-[10.5px] italic"
                          >
                            + {draft.customTests}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  No ha agregado órdenes de laboratorio. Use{" "}
                  <strong>+ Añadir Orden de Laboratorio</strong> para abrir el catálogo completo y asociarlas al guardar.
                </p>
              )}

              <details className="rounded-md border border-border bg-muted/10 p-2 text-xs">
                <summary className="flex cursor-pointer items-center justify-between gap-2 font-medium text-muted-foreground select-none hover:text-foreground">
                  <span>+ Nota rápida sin orden oficial (texto libre)</span>
                  {watchedAuxExams.trim() ? (
                    <Badge variant="outline" className="text-[10px]">
                      Con texto
                    </Badge>
                  ) : null}
                </summary>
                <div className="pt-2">
                  <Textarea
                    id="cons-aux"
                    rows={2}
                    placeholder="Opcional: resumen o nota breve sin emitir orden estructurada..."
                    {...register("auxiliaryExams")}
                  />
                </div>
              </details>
            </div>

            {/* Recetas / Medicación */}
            <div className="space-y-2.5 rounded-lg border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Pill className="size-3.5 text-primary" />
                    Recetas Médicas / Indicaciones Farmacológicas (Rp/)
                  </span>
                  {editingItem && linkedPrescriptions.length > 0 ? (
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {linkedPrescriptions.length} emitida(s)
                    </Badge>
                  ) : !editingItem && draftPrescriptions.length > 0 ? (
                    <Badge variant="outline" className="border-primary/40 bg-primary/10 font-mono text-[10px] text-primary">
                      {draftPrescriptions.length} por emitir
                    </Badge>
                  ) : null}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={onOpenAddPrescriptionModal}
                >
                  <Plus className="size-3" />
                  Añadir Receta Médica
                </Button>
              </div>

              {editingItem ? (
                linkedPrescriptions.length > 0 ? (
                  <div className="space-y-2">
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
                                onClick={() => onViewLinkedPrescription(rx)}
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
                                onClick={() => onEditLinkedPrescription(rx)}
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
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Sin receta estructurada emitida para esta consulta. Use{" "}
                    <strong>+ Añadir Receta Médica</strong> para prescribir sin salir.
                  </p>
                )
              ) : draftPrescriptions.length > 0 ? (
                <div className="space-y-2">
                  {draftPrescriptions.map((draft, idx) => (
                    <div
                      key={`draft-rx-${idx}`}
                      className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="font-mono text-[10px]">
                            RECETA EN BORRADOR #{idx + 1}
                          </Badge>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {draft.items.length} fármaco(s)
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => onOpenEditDraftPrescription(draft, idx)}
                          >
                            <Pencil className="size-3" />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => onRemoveDraftPrescription(idx)}
                            aria-label="Quitar receta borrador"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      <ul className="space-y-1 text-xs">
                        {draft.items.map((item, mIdx) => (
                          <li key={item.id} className="leading-snug text-foreground">
                            <span className="font-mono font-bold text-primary">
                              {mIdx + 1}.
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
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  No ha agregado recetas médicas. Use{" "}
                  <strong>+ Añadir Receta Médica</strong> para elegir fármacos del vademécum y emitirla automáticamente al guardar.
                </p>
              )}

              <details className="rounded-md border border-border bg-muted/10 p-2 text-xs">
                <summary className="flex cursor-pointer items-center justify-between gap-2 font-medium text-muted-foreground select-none hover:text-foreground">
                  <span>+ Nota farmacológica sin receta oficial (texto libre)</span>
                  {watchedRxNotes.trim() ? (
                    <Badge variant="outline" className="text-[10px]">
                      Con texto
                    </Badge>
                  ) : null}
                </summary>
                <div className="pt-2">
                  <Textarea
                    id="cons-rx"
                    rows={2}
                    placeholder="Opcional: nota terapéutica breve sin generar receta oficial..."
                    {...register("prescriptionNotes")}
                  />
                </div>
              </details>
            </div>

            {/* Próxima Cita de Control + Agendamiento Directo en Agenda */}
            <div className="space-y-3 rounded-lg border border-border bg-card p-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="cons-next-date"
                    className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
                  >
                    <CalendarPlus className="size-3.5 text-primary" />
                    Próxima Cita de Control Sugerida
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="cons-next-date"
                      type="date"
                      className="w-44 bg-card font-mono"
                      {...register("nextAppointmentDate")}
                    />
                    {watchedNextDate ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onApplyQuickNextDate(null)}
                        aria-label="Limpiar fecha de control"
                        title="Limpiar fecha de control"
                      >
                        <X className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    Atajos:
                  </span>
                  {[
                    { label: "+1 sem", offset: { days: 7 } },
                    { label: "+2 sem", offset: { days: 14 } },
                    { label: "+1 mes", offset: { months: 1 } },
                    { label: "+3 meses", offset: { months: 3 } },
                    { label: "+6 meses", offset: { months: 6 } },
                  ].map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => onApplyQuickNextDate(preset.offset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              {watchedNextDate ? (
                <div className="space-y-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-primary">
                    <input
                      type="checkbox"
                      className="size-3.5 accent-primary"
                      checked={watchedScheduleNext}
                      onChange={(e) =>
                        onToggleScheduleNextAppointment(e.target.checked)
                      }
                    />
                    <span>
                      Agendar directamente en Agenda Médica (
                      {formatPeruDateDisplay(watchedNextDate)})
                    </span>
                  </label>

                  {watchedScheduleNext ? (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                      <div className="space-y-1 sm:col-span-3">
                        <label
                          htmlFor="cons-next-time"
                          className="flex items-center gap-1 text-[11px] font-medium"
                        >
                          <Clock className="size-3 text-primary" />
                          Hora *
                        </label>
                        <Input
                          id="cons-next-time"
                          type="time"
                          className="bg-card font-mono text-xs"
                          {...register("nextAppointmentTime")}
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-3">
                        <label
                          htmlFor="cons-next-duration"
                          className="block text-[11px] font-medium"
                        >
                          Duración
                        </label>
                        <select
                          id="cons-next-duration"
                          className={cn(selectClassName, "bg-card text-xs")}
                          {...register("nextAppointmentDuration")}
                        >
                          <option value={15}>15 min</option>
                          <option value={20}>20 min</option>
                          <option value={30}>30 min</option>
                          <option value={45}>45 min</option>
                          <option value={60}>60 min</option>
                        </select>
                      </div>

                      <div className="space-y-1 sm:col-span-6">
                        <label
                          htmlFor="cons-next-type"
                          className="block text-[11px] font-medium"
                        >
                          Tipo de Atención
                        </label>
                        <select
                          id="cons-next-type"
                          className={cn(selectClassName, "bg-card text-xs")}
                          {...register("nextAppointmentType")}
                        >
                          {APPOINTMENT_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {APPOINTMENT_TYPE_LABELS[type]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1 sm:col-span-12">
                        <label
                          htmlFor="cons-next-reason"
                          className="block text-[11px] font-medium"
                        >
                          Motivo en Agenda Médica *
                        </label>
                        <Input
                          id="cons-next-reason"
                          placeholder="Ej. Reevaluación con resultados de laboratorio / control..."
                          className="bg-card text-xs"
                          {...register("nextAppointmentReason")}
                        />
                      </div>

                      <p className="text-[11px] text-muted-foreground sm:col-span-12">
                        Se verificará cruce de horarios y se registrará como{" "}
                        <strong className="text-foreground">CONFIRMADA</strong> en{" "}
                        <span className="font-mono">/agenda</span> al guardar la consulta.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {errors.nextAppointmentDate ||
              errors.nextAppointmentTime ||
              errors.nextAppointmentReason ? (
                <p className="text-xs text-destructive">
                  {errors.nextAppointmentDate?.message ||
                    errors.nextAppointmentTime?.message ||
                    errors.nextAppointmentReason?.message}
                </p>
              ) : null}
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
