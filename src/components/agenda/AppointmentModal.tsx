"use client";

import type { BaseSyntheticEvent } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { AlertTriangle, Clock, Search, UserPlus } from "lucide-react";
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
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUSES,
  type AgendaAppointmentItem,
  type AgendaDoctorOption,
  type AgendaPatientOption,
} from "@/features/agenda/agenda.schema";
import type { AgendaModalFormValues } from "@/features/agenda/hooks/use-agenda";
import { DOCUMENT_TYPE_OPTIONS, INSURANCE_CATALOG } from "@/lib/clinical/catalogs";
import { cn } from "@/lib/utils";

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: AgendaAppointmentItem | null;
  form: UseFormReturn<AgendaModalFormValues>;
  isSubmitting: boolean;
  doctors: AgendaDoctorOption[];
  appointmentTypes: string[];
  onOpenManageTypes?: () => void;
  patientsCount: number;
  selectedPatientObj: AgendaPatientOption | null;
  patientSearchQuery: string;
  onPatientSearchQueryChange: (value: string) => void;
  matchingPatients: AgendaPatientOption[];
  detectedExistingByQuickDoc: AgendaPatientOption | null;
  occupiedSlots: Array<{ id: string; range: string; patientName: string }>;
  onSelectRegisteredPatient: (patient: AgendaPatientOption) => void;
  onSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
}

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90, 120] as const;

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function AppointmentModal({
  open,
  onOpenChange,
  editingItem,
  form,
  isSubmitting,
  doctors,
  appointmentTypes,
  onOpenManageTypes,
  patientsCount,
  selectedPatientObj,
  patientSearchQuery,
  onPatientSearchQueryChange,
  matchingPatients,
  detectedExistingByQuickDoc,
  occupiedSlots,
  onSelectRegisteredPatient,
  onSubmit,
}: AppointmentModalProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  const patientMode = useWatch({ control: form.control, name: "patientMode" });
  const quickDocType = useWatch({
    control: form.control,
    name: "quickDocumentType",
  });
  const currentAppointmentType = useWatch({
    control: form.control,
    name: "appointmentType",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Editar Cita Médica" : "Agendar Nueva Cita en CENDO"}
          </DialogTitle>
          <DialogDescription>
            Programación de turnos con validación anti-cruces en PostgreSQL (zona
            horaria America/Lima).
          </DialogDescription>
        </DialogHeader>

        <form id="appointment-form" onSubmit={onSubmit} className="space-y-4">
          {/* Bloque 1: Selección o registro rápido de paciente */}
          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                Paciente <span className="text-destructive">*</span>
              </span>

              {!editingItem ? (
                <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setValue("patientMode", "existing")}
                    className={cn(
                      "cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors",
                      patientMode === "existing"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Registrada ({patientsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setValue("patientMode", "new");
                      setValue("appointmentType", "CONSULTA_PRIMERA_VEZ");
                    }}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors",
                      patientMode === "new"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <UserPlus className="size-3" />
                    Nueva Paciente
                  </button>
                </div>
              ) : null}
            </div>

            {patientMode === "existing" || editingItem ? (
              <div className="space-y-2">
                {selectedPatientObj ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-card px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {selectedPatientObj.fullName}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {selectedPatientObj.documentType}{" "}
                        {selectedPatientObj.documentNumber} •{" "}
                        {selectedPatientObj.phone || "Sin teléfono"} •{" "}
                        {selectedPatientObj.insuranceInfo}
                      </p>
                    </div>
                    {!editingItem ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          setValue("patientId", "", { shouldValidate: true })
                        }
                      >
                        Cambiar
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={patientSearchQuery}
                        onChange={(e) => onPatientSearchQueryChange(e.target.value)}
                        placeholder="Buscar por DNI, apellidos, nombres o teléfono..."
                        className="bg-card pl-8"
                      />
                    </div>

                    <div className="max-h-36 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-card">
                      {matchingPatients.length > 0 ? (
                        matchingPatients.map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => onSelectRegisteredPatient(patient)}
                            className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-muted/60"
                          >
                            <span className="truncate font-medium text-foreground">
                              {patient.fullName}
                            </span>
                            <span className="ml-2 shrink-0 font-mono text-[11px] text-muted-foreground">
                              {patient.documentType} {patient.documentNumber}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2.5 text-xs text-muted-foreground">
                          Sin coincidencias. Puedes registrarla usando &ldquo;Nueva
                          Paciente&rdquo;.
                        </p>
                      )}
                    </div>
                  </>
                )}

                {errors.patientId ? (
                  <p className="text-xs text-destructive">{errors.patientId.message}</p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="quick-doc-type"
                      className="block text-xs font-medium"
                    >
                      Tipo Doc.
                    </label>
                    <select
                      id="quick-doc-type"
                      className={selectClassName}
                      {...register("quickDocumentType")}
                    >
                      {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="quick-doc-num"
                      className="block text-xs font-medium"
                    >
                      N° Documento <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="quick-doc-num"
                      placeholder={quickDocType === "DNI" ? "72961954" : "001234567"}
                      maxLength={quickDocType === "DNI" ? 8 : 20}
                      className="bg-card font-mono uppercase"
                      {...register("quickDocumentNumber")}
                    />
                    {errors.quickDocumentNumber ? (
                      <p className="text-xs text-destructive">
                        {errors.quickDocumentNumber.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="quick-birth"
                      className="block text-xs font-medium"
                    >
                      Fecha Nacimiento <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="quick-birth"
                      type="date"
                      className="bg-card font-mono"
                      {...register("quickBirthDate")}
                    />
                    {errors.quickBirthDate ? (
                      <p className="text-xs text-destructive">
                        {errors.quickBirthDate.message}
                      </p>
                    ) : null}
                  </div>
                </div>

                {detectedExistingByQuickDoc ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <AlertTriangle className="size-3.5 text-warning" />
                      Ya existe:{" "}
                      <strong>{detectedExistingByQuickDoc.fullName}</strong> (
                      <span className="font-mono">
                        {detectedExistingByQuickDoc.documentNumber}
                      </span>
                      )
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() =>
                        onSelectRegisteredPatient(detectedExistingByQuickDoc)
                      }
                    >
                      Usar ficha existente
                    </Button>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label
                      htmlFor="quick-lastname"
                      className="block text-xs font-medium"
                    >
                      Apellidos <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="quick-lastname"
                      placeholder="Ej. RAMOS FIGUEROA"
                      className="bg-card uppercase"
                      {...register("quickLastName")}
                    />
                    {errors.quickLastName ? (
                      <p className="text-xs text-destructive">
                        {errors.quickLastName.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="quick-firstname"
                      className="block text-xs font-medium"
                    >
                      Nombres <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="quick-firstname"
                      placeholder="Ej. LUCIANA MARÍA"
                      className="bg-card uppercase"
                      {...register("quickFirstName")}
                    />
                    {errors.quickFirstName ? (
                      <p className="text-xs text-destructive">
                        {errors.quickFirstName.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="quick-phone"
                      className="block text-xs font-medium"
                    >
                      Teléfono / WhatsApp <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="quick-phone"
                      placeholder="984 125 639"
                      className="bg-card font-mono"
                      {...register("quickPhone")}
                    />
                    {errors.quickPhone ? (
                      <p className="text-xs text-destructive">
                        {errors.quickPhone.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="quick-insurance"
                      className="block text-xs font-medium"
                    >
                      Cobertura / Seguro
                    </label>
                    <select
                      id="quick-insurance"
                      className={selectClassName}
                      {...register("quickInsuranceInfo")}
                    >
                      {INSURANCE_CATALOG.map((ins) => (
                        <option key={ins.id} value={ins.label}>
                          {ins.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bloque 2: Especialista, Fecha, Hora y Duración */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="appt-doctor" className="block text-xs font-medium">
                Especialista Tratante <span className="text-destructive">*</span>
              </label>
              <select
                id="appt-doctor"
                className={selectClassName}
                {...register("doctorId")}
              >
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.doctorTitle} {doc.fullName} — {doc.specialty}
                  </option>
                ))}
              </select>
              {errors.doctorId ? (
                <p className="text-xs text-destructive">{errors.doctorId.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="appt-date" className="block text-xs font-medium">
                Fecha <span className="text-destructive">*</span>
              </label>
              <Input
                id="appt-date"
                type="date"
                className="font-mono"
                {...register("appointmentDate")}
              />
              {errors.appointmentDate ? (
                <p className="text-xs text-destructive">
                  {errors.appointmentDate.message}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <label htmlFor="appt-time" className="block text-xs font-medium">
                  Hora (24h) <span className="text-destructive">*</span>
                </label>
                <Input
                  id="appt-time"
                  type="time"
                  className="font-mono"
                  {...register("appointmentTime")}
                />
                {errors.appointmentTime ? (
                  <p className="text-xs text-destructive">
                    {errors.appointmentTime.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="appt-duration" className="block text-xs font-medium">
                  Duración
                </label>
                <select
                  id="appt-duration"
                  className={selectClassName}
                  {...register("durationMinutes", { valueAsNumber: true })}
                >
                  {DURATION_OPTIONS.map((mins) => (
                    <option key={mins} value={mins}>
                      {mins} min
                    </option>
                  ))}
                </select>
                {errors.durationMinutes ? (
                  <p className="text-xs text-destructive">
                    {errors.durationMinutes.message}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Disponibilidad en vivo del especialista para esa fecha */}
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Clock className="size-3.5 text-primary" />
              <span>
                Horarios ocupados del especialista en la fecha seleccionada:
              </span>
            </div>
            {occupiedSlots.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {occupiedSlots.map((slot) => (
                  <Badge
                    key={slot.id}
                    variant="outline"
                    className="bg-card font-mono text-[10px]"
                    title={slot.patientName}
                  >
                    {slot.range} • {slot.patientName.split(",")[0]}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-success">
                Agenda libre en esa fecha.
              </p>
            )}
          </div>

          {/* Bloque 3: Tipo, Estado, Motivo y Notas */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="appt-type" className="block text-xs font-medium">
                  Tipo de Atención
                </label>
                {onOpenManageTypes ? (
                  <button
                    type="button"
                    onClick={onOpenManageTypes}
                    className="cursor-pointer text-[11px] font-medium text-primary hover:underline"
                  >
                    Gestionar tipos
                  </button>
                ) : null}
              </div>
              <select
                id="appt-type"
                className={selectClassName}
                {...register("appointmentType")}
              >
                {currentAppointmentType &&
                !appointmentTypes.includes(currentAppointmentType) ? (
                  <option value={currentAppointmentType}>
                    {currentAppointmentType}
                  </option>
                ) : null}
                {appointmentTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {errors.appointmentType ? (
                <p className="text-xs text-destructive">
                  {errors.appointmentType.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="appt-status" className="block text-xs font-medium">
                Estado de la Cita
              </label>
              <select
                id="appt-status"
                className={selectClassName}
                {...register("status")}
              >
                {APPOINTMENT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {APPOINTMENT_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="appt-reason" className="block text-xs font-medium">
              Motivo / Descripción Breve
            </label>
            <Input
              id="appt-reason"
              placeholder="Ej. Control ginecológico + ecografía transvaginal"
              {...register("reason")}
            />
            {errors.reason ? (
              <p className="text-xs text-destructive">{errors.reason.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="appt-notes" className="block text-xs font-medium">
              Notas de Recepción / Indicaciones
            </label>
            <Textarea
              id="appt-notes"
              rows={2}
              placeholder="Indicaciones previas, preparación de vejiga, etc."
              {...register("notes")}
            />
            {errors.notes ? (
              <p className="text-xs text-destructive">{errors.notes.message}</p>
            ) : null}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Validando..."
                : editingItem
                  ? "Guardar Cambios"
                  : "Agendar Cita"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
