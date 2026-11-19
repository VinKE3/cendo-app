"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Stethoscope,
  Tags,
  Trash2,
} from "lucide-react";
import { ManageCategoriesModal } from "@/components/common/ManageCategoriesModal";
import { TablePagination } from "@/components/common/TablePagination";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUSES,
  formatMinutesToTime,
  parseTimeToMinutes,
  type AgendaAppointmentItem,
  type AgendaDoctorOption,
  type AgendaPatientOption,
  type AppointmentStatus,
} from "@/features/agenda/agenda.schema";
import type { CatalogCategoryItem } from "@/features/catalog-categories/catalog-categories.schema";
import {
  useAgenda,
  type AgendaViewMode,
} from "@/features/agenda/hooks/use-agenda";
import {
  downloadIcsForAppleCalendar,
  generateGoogleCalendarUrl,
} from "@/lib/calendar-export";
import {
  cn,
  formatPeruDateDisplay,
  formatPeruDateText,
  shiftPeruDate,
} from "@/lib/utils";
import { AppointmentModal } from "./AppointmentModal";

interface AgendaViewProps {
  initialAppointments: AgendaAppointmentItem[];
  initialAppointmentTypes: CatalogCategoryItem[];
  doctors: AgendaDoctorOption[];
  initialPatients: AgendaPatientOption[];
  currentDoctorId: string;
  canEdit: boolean;
  canDelete: boolean;
}

const STATUS_BADGE_CLASS: Record<AppointmentStatus, string> = {
  PENDIENTE: "border-border bg-muted/60 text-muted-foreground",
  CONFIRMADA: "border-success/40 bg-success/10 text-success",
  EN_ESPERA: "border-warning/50 bg-warning/15 text-foreground",
  ATENDIDA: "border-primary/40 bg-primary/10 text-primary",
  CANCELADA: "border-destructive/40 bg-destructive/10 text-destructive",
  NO_ASISTIO: "border-border bg-muted text-muted-foreground",
};

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

export function AgendaView({
  initialAppointments,
  initialAppointmentTypes,
  doctors,
  initialPatients,
  currentDoctorId,
  canEdit,
  canDelete,
}: AgendaViewProps) {
  const {
    todayStr,
    items,
    filteredCount,
    statusCounts,
    pagination,
    patients,
    appointmentTypes,
    typeManager,
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    shiftSelectedDate,
    goToToday,
    selectedDoctorId,
    setSelectedDoctorId,
    selectedStatus,
    setSelectedStatus,
    search,
    setSearch,
    dialogOpen,
    setDialogOpen,
    editingItem,
    form,
    isSubmitting,
    selectedPatientObj,
    patientSearchQuery,
    setPatientSearchQuery,
    matchingPatients,
    detectedExistingByQuickDoc,
    occupiedSlots,
    openCreateModal,
    openEditModal,
    selectRegisteredPatient,
    onSubmit,
    updatingStatusId,
    handleQuickStatusChange,
    handleSendWhatsAppReminder,
    getDoctorClinicInfo,
    postSaveAppointment,
    setPostSaveAppointment,
    deleteTarget,
    setDeleteTarget,
    deletingId,
    requestDelete,
    confirmDelete,
  } = useAgenda({
    initialAppointments,
    initialAppointmentTypes,
    doctors,
    initialPatients,
    currentDoctorId,
  });

  const viewModes: Array<{ id: AgendaViewMode; label: string }> = [
    { id: "day", label: "Día" },
    { id: "week", label: "Semana (7d)" },
    { id: "upcoming", label: "Próximas" },
  ];

  const statusPills: Array<{ id: string; label: string; count: number }> = [
    { id: "ALL", label: "Todas", count: statusCounts.ALL },
    { id: "CONFIRMADA", label: "Confirmadas", count: statusCounts.CONFIRMADA },
    { id: "EN_ESPERA", label: "En Espera", count: statusCounts.EN_ESPERA },
    { id: "PENDIENTE", label: "Pendientes", count: statusCounts.PENDIENTE },
    { id: "ATENDIDA", label: "Atendidas", count: statusCounts.ATENDIDA },
    { id: "CANCELADA", label: "Canceladas", count: statusCounts.CANCELADA },
    { id: "NO_ASISTIO", label: "No Asistió", count: statusCounts.NO_ASISTIO },
  ];

  const dateRangeLabel =
    viewMode === "day"
      ? `${formatPeruDateText(selectedDate)} • Hora Perú (UTC-5)`
      : viewMode === "week"
        ? `Semana: ${formatPeruDateDisplay(selectedDate)} – ${formatPeruDateDisplay(
            shiftPeruDate(selectedDate, 6)
          )}`
        : `Desde hoy (${formatPeruDateDisplay(todayStr)}) en adelante`;

  return (
    <div className="space-y-6">
      {/* Cabecera compacta estilo Linear / Supabase */}
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-primary" />
            <span className="font-mono text-xs text-muted-foreground">
              AGENDA CLÍNICA • {statusCounts.ALL} CITAS EN VISTA
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Agenda Médica y Turnos
          </h1>
        </div>

        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => typeManager.setOpen(true)}
            >
              <Tags className="size-4" />
              Tipos de Atención
            </Button>
            <Button type="button" onClick={() => openCreateModal()}>
              <Plus className="size-4" />
              Agendar Cita
            </Button>
          </div>
        ) : null}
      </div>

      {/* Barra de controles: rango, fecha, especialista y búsqueda */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              {viewModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setViewMode(mode.id)}
                  className={cn(
                    "cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors",
                    viewMode === mode.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {viewMode !== "upcoming" ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() =>
                    shiftSelectedDate(viewMode === "week" ? -7 : -1)
                  }
                  aria-label="Anterior"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant={selectedDate === todayStr ? "default" : "outline"}
                  size="sm"
                  onClick={goToToday}
                >
                  Hoy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() =>
                    shiftSelectedDate(viewMode === "week" ? 7 : 1)
                  }
                  aria-label="Siguiente"
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-7 w-36 font-mono text-xs"
                />
              </div>
            ) : null}

            <span className="hidden font-mono text-xs text-muted-foreground capitalize xl:inline">
              {dateRangeLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Filtrar por especialista"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="ALL">Todos los Especialistas</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.doctorTitle} {doc.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-border pt-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-1.5">
            {statusPills.map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedStatus(pill.id)}
                className={cn(
                  "cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  selectedStatus === pill.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                {pill.label}{" "}
                <span className="ml-0.5 font-mono text-[10px] opacity-80">
                  ({pill.count})
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar paciente, DNI, médico o motivo..."
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {/* Tabla Densa de Citas */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Fecha / Horario</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Tipo y Motivo</TableHead>
              <TableHead className="w-48">Especialista</TableHead>
              <TableHead className="w-40">Estado</TableHead>
              <TableHead className="w-40 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? (
              items.map((appt) => {
                const startMins = parseTimeToMinutes(appt.appointmentTime);
                const endTime = formatMinutesToTime(
                  startMins + appt.durationMinutes
                );
                const allergyAlert = hasPositiveAllergy(appt.patientAllergies);

                return (
                  <TableRow key={appt.id}>
                    <TableCell className="align-middle">
                      <div className="flex flex-col font-mono tabular-nums">
                        <span className="text-xs font-bold text-primary">
                          {appt.appointmentTime} – {endTime}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {viewMode !== "day"
                            ? `${formatPeruDateDisplay(appt.appointmentDate)} • `
                            : ""}
                          {appt.durationMinutes} min
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="max-w-xs whitespace-normal align-middle">
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={`/pacientes/${appt.patientId}`}
                            className="font-semibold text-foreground hover:text-primary hover:underline"
                          >
                            {appt.patientName}
                          </Link>
                          {allergyAlert ? (
                            <Badge
                              variant="destructive"
                              title={`Alergias: ${appt.patientAllergies}`}
                              className="text-[10px]"
                            >
                              <AlertTriangle className="size-2.5" />
                              RAM
                            </Badge>
                          ) : null}
                        </div>
                        <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                          <span>
                            {appt.patientDocumentType} {appt.patientDocumentNumber}
                          </span>
                          {appt.patientPhone ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="size-2.5" />
                              {appt.patientPhone}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="max-w-sm whitespace-normal align-middle">
                      <div className="space-y-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {appt.appointmentType}
                        </Badge>
                        <p className="line-clamp-1 text-xs text-foreground">
                          {appt.reason}
                        </p>
                        {appt.notes ? (
                          <p className="line-clamp-1 text-[11px] text-muted-foreground">
                            {appt.notes}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="align-middle">
                      <span className="text-xs font-medium text-foreground">
                        {appt.doctorName}
                      </span>
                    </TableCell>

                    <TableCell className="align-middle">
                      {canEdit ? (
                        <select
                          aria-label={`Estado de ${appt.patientName}`}
                          value={appt.status}
                          disabled={updatingStatusId === appt.id}
                          onChange={(e) =>
                            handleQuickStatusChange(
                              appt,
                              e.target.value as AppointmentStatus
                            )
                          }
                          className={cn(
                            "h-7 cursor-pointer rounded-md border px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                            STATUS_BADGE_CLASS[appt.status]
                          )}
                        >
                          {APPOINTMENT_STATUSES.map((st) => (
                            <option
                              key={st}
                              value={st}
                              className="bg-popover text-popover-foreground"
                            >
                              {APPOINTMENT_STATUS_LABELS[st]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", STATUS_BADGE_CLASS[appt.status])}
                        >
                          {APPOINTMENT_STATUS_LABELS[appt.status]}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right align-middle">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant={appt.reminderSent ? "outline" : "default"}
                          size="xs"
                          onClick={() =>
                            handleSendWhatsAppReminder(appt, canEdit)
                          }
                          title="Enviar recordatorio corto por WhatsApp con dirección"
                        >
                          <MessageCircle className="size-3" />
                          {appt.reminderSent ? "Reenviar" : "WA"}
                        </Button>

                        <Link
                          href={`/pacientes/${appt.patientId}?tab=consultas&newConsultation=1&appointmentId=${appt.id}`}
                        >
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            aria-label={`Atender consulta de ${appt.patientName}`}
                            title="Atender y registrar consulta"
                          >
                            <Stethoscope className="size-3.5 text-primary" />
                          </Button>
                        </Link>

                        <Link href={`/pacientes/${appt.patientId}`}>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            aria-label={`Abrir historia de ${appt.patientName}`}
                            title="Abrir Historia Clínica"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </Link>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label={`Más acciones para ${appt.patientName}`}
                              />
                            }
                          >
                            <MoreHorizontal className="size-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() => {
                                const url = generateGoogleCalendarUrl(
                                  {
                                    id: appt.id,
                                    patientName: appt.patientName,
                                    patientDocument: `${appt.patientDocumentType} ${appt.patientDocumentNumber}`,
                                    patientPhone: appt.patientPhone,
                                    doctorName: appt.doctorName,
                                    appointmentDate: appt.appointmentDate,
                                    appointmentTime: appt.appointmentTime,
                                    durationMinutes: appt.durationMinutes,
                                    appointmentType: appt.appointmentType,
                                    reason: appt.reason,
                                    notes: appt.notes,
                                  },
                                  getDoctorClinicInfo(appt.doctorId)
                                );
                                window.open(url, "_blank", "noopener,noreferrer");
                              }}
                            >
                              <CalendarPlus className="size-3.5" />
                              Añadir a Google Calendar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                downloadIcsForAppleCalendar(
                                  {
                                    id: appt.id,
                                    patientName: appt.patientName,
                                    patientDocument: `${appt.patientDocumentType} ${appt.patientDocumentNumber}`,
                                    patientPhone: appt.patientPhone,
                                    doctorName: appt.doctorName,
                                    appointmentDate: appt.appointmentDate,
                                    appointmentTime: appt.appointmentTime,
                                    durationMinutes: appt.durationMinutes,
                                    appointmentType: appt.appointmentType,
                                    reason: appt.reason,
                                    notes: appt.notes,
                                  },
                                  getDoctorClinicInfo(appt.doctorId)
                                )
                              }
                            >
                              <Download className="size-3.5" />
                              Descargar Apple / Outlook (.ics)
                            </DropdownMenuItem>

                            {canEdit ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openEditModal(appt)}
                                >
                                  <Pencil className="size-3.5" />
                                  Editar / Reprogramar
                                </DropdownMenuItem>
                              </>
                            ) : null}

                            {canDelete ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={deletingId === appt.id}
                                  onClick={() => requestDelete(appt)}
                                >
                                  <Trash2 className="size-3.5" />
                                  Archivar Cita
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {filteredCount === 0 && statusCounts.ALL > 0
                    ? "No hay citas que coincidan con el estado o búsqueda aplicada."
                    : "No hay citas programadas en el rango seleccionado."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        currentPage={pagination.currentPage}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        onPageChange={pagination.setCurrentPage}
        onPageSizeChange={pagination.setPageSize}
        itemLabel="citas"
      />

      {/* Modal Agendar / Editar */}
      <AppointmentModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingItem={editingItem}
        form={form}
        isSubmitting={isSubmitting}
        doctors={doctors}
        appointmentTypes={appointmentTypes}
        onOpenManageTypes={canEdit ? () => typeManager.setOpen(true) : undefined}
        patientsCount={patients.length}
        selectedPatientObj={selectedPatientObj}
        patientSearchQuery={patientSearchQuery}
        onPatientSearchQueryChange={setPatientSearchQuery}
        matchingPatients={matchingPatients}
        detectedExistingByQuickDoc={detectedExistingByQuickDoc}
        occupiedSlots={occupiedSlots}
        onSelectRegisteredPatient={selectRegisteredPatient}
        onSubmit={onSubmit}
      />

      {/* Modal Post-Agendamiento: Calendario y WhatsApp */}
      <Dialog
        open={Boolean(postSaveAppointment)}
        onOpenChange={(open) => {
          if (!open) setPostSaveAppointment(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-success" />
              Cita Confirmada en Agenda
            </DialogTitle>
            <DialogDescription>
              {postSaveAppointment ? (
                <>
                  <strong className="text-foreground">
                    {postSaveAppointment.patientName}
                  </strong>{" "}
                  •{" "}
                  <span className="font-mono">
                    {formatPeruDateDisplay(postSaveAppointment.appointmentDate)}{" "}
                    {postSaveAppointment.appointmentTime}
                  </span>{" "}
                  ({postSaveAppointment.durationMinutes} min) con{" "}
                  {postSaveAppointment.doctorName}.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          {postSaveAppointment ? (
            <div className="space-y-2">
              <Button
                type="button"
                className="w-full justify-start"
                onClick={() => {
                  const appt = postSaveAppointment;
                  setPostSaveAppointment(null);
                  void handleSendWhatsAppReminder(appt, canEdit);
                }}
              >
                <MessageCircle className="size-4" />
                Enviar Recordatorio por WhatsApp
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  const url = generateGoogleCalendarUrl(
                    {
                      id: postSaveAppointment.id,
                      patientName: postSaveAppointment.patientName,
                      patientDocument: `${postSaveAppointment.patientDocumentType} ${postSaveAppointment.patientDocumentNumber}`,
                      patientPhone: postSaveAppointment.patientPhone,
                      doctorName: postSaveAppointment.doctorName,
                      appointmentDate: postSaveAppointment.appointmentDate,
                      appointmentTime: postSaveAppointment.appointmentTime,
                      durationMinutes: postSaveAppointment.durationMinutes,
                      appointmentType: postSaveAppointment.appointmentType,
                      reason: postSaveAppointment.reason,
                      notes: postSaveAppointment.notes,
                    },
                    getDoctorClinicInfo(postSaveAppointment.doctorId)
                  );
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
              >
                <ExternalLink className="size-4" />
                Añadir a Google Calendar
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() =>
                  downloadIcsForAppleCalendar(
                    {
                      id: postSaveAppointment.id,
                      patientName: postSaveAppointment.patientName,
                      patientDocument: `${postSaveAppointment.patientDocumentType} ${postSaveAppointment.patientDocumentNumber}`,
                      patientPhone: postSaveAppointment.patientPhone,
                      doctorName: postSaveAppointment.doctorName,
                      appointmentDate: postSaveAppointment.appointmentDate,
                      appointmentTime: postSaveAppointment.appointmentTime,
                      durationMinutes: postSaveAppointment.durationMinutes,
                      appointmentType: postSaveAppointment.appointmentType,
                      reason: postSaveAppointment.reason,
                      notes: postSaveAppointment.notes,
                    },
                    getDoctorClinicInfo(postSaveAppointment.doctorId)
                  )
                }
              >
                <Download className="size-4" />
                Descargar para Apple Calendar / Outlook (.ics)
              </Button>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPostSaveAppointment(null)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación de Archivo / Eliminación */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar Cita Médica</DialogTitle>
            <DialogDescription>
              ¿Confirma archivar la cita de{" "}
              <strong className="text-foreground">
                {deleteTarget?.patientName}
              </strong>{" "}
              programada para el{" "}
              <span className="font-mono">
                {formatPeruDateDisplay(deleteTarget?.appointmentDate)}{" "}
                {deleteTarget?.appointmentTime}
              </span>
              ? El horario quedará liberado de inmediato y la acción quedará
              auditada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={Boolean(deletingId)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={Boolean(deletingId)}
            >
              {deletingId ? "Archivando..." : "Confirmar Archivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManageCategoriesModal
        open={typeManager.open}
        onOpenChange={typeManager.setOpen}
        title="Gestionar Tipos de Atención"
        description="Agregue, renombre o elimine tipos de atención para las citas de la Agenda. No se pueden eliminar tipos que ya tengan citas asignadas."
        placeholder="Ej. Ecografía 4D / Doppler Materno"
        categories={typeManager.categories}
        newName={typeManager.newName}
        onNewNameChange={typeManager.setNewName}
        isCreating={typeManager.isCreating}
        editingId={typeManager.editingId}
        editingName={typeManager.editingName}
        onEditingNameChange={typeManager.setEditingName}
        busyId={typeManager.busyId}
        onCreate={typeManager.handleCreate}
        onStartEdit={typeManager.startEditing}
        onCancelEdit={typeManager.cancelEditing}
        onSaveRename={typeManager.handleRename}
        onDelete={typeManager.handleDelete}
      />
    </div>
  );
}
