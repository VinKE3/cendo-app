"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarPlus,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CatalogCategoryItem } from "@/features/catalog-categories/catalog-categories.schema";
import {
  getVitalSignAlerts,
  type ConsultationFormContext,
  type MedicalConsultationItem,
} from "@/features/consultas/consultas.schema";
import {
  useConsultas,
  type ConsultationCountsDelta,
} from "@/features/consultas/hooks/use-consultas";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import { formatPeruDateDisplay } from "@/lib/utils";
import { generateConsultationWhatsAppUrl } from "@/lib/whatsapp-share";
import { ConsultationModal } from "./ConsultationModal";
import { ConsultationPrintModal } from "./ConsultationPrintModal";

interface TabConsultasProps {
  patient: PatientDirectoryItem;
  initialConsultations: MedicalConsultationItem[];
  initialReasons: CatalogCategoryItem[];
  formContext: ConsultationFormContext;
  canEdit: boolean;
  canDelete: boolean;
  onCountsChange?: (delta: ConsultationCountsDelta) => void;
}

export function TabConsultas({
  patient,
  initialConsultations,
  initialReasons,
  formContext,
  canEdit,
  canDelete,
  onCountsChange,
}: TabConsultasProps) {
  const {
    items,
    totalCount,
    filteredCount,
    lastConsultation,
    pagination,
    search,
    setSearch,
    consultationReasons,
    reasonManager,
    dialogOpen,
    setDialogOpen,
    editingItem,
    form,
    isSubmitting,
    activeAppointments,
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
    setSaveAndPrintIntent,
    openCreateModal,
    openEditModal,
    fillNormalPhysicalExam,
    selectReasonPreset,
    appendLabTemplate,
    appendVademecumMedication,
    onSubmit,
    printingItem,
    setPrintingItem,
    showCoverPage,
    setShowCoverPage,
    deleteTarget,
    setDeleteTarget,
    deletingId,
    requestDelete,
    confirmDelete,
  } = useConsultas({
    patient,
    initialConsultations,
    initialReasons,
    formContext,
    onCountsChange,
  });

  return (
    <div className="space-y-4">
      <Card className="border border-border bg-card">
        <CardHeader className="flex flex-col justify-between gap-3 border-b border-border sm:flex-row sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Stethoscope className="size-4 text-primary" />
              Consultas Ginecológicas Estructuradas
              <Badge variant="outline" className="font-mono text-[10px]">
                {totalCount}
              </Badge>
            </CardTitle>
            <CardDescription>
              Anamnesis, signos vitales con IMC automático, examen físico dirigido,
              diagnóstico CIE-10 e impresión oficial A4.
            </CardDescription>
          </div>

          {canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => reasonManager.setOpen(true)}
              >
                <Tags className="size-3.5" />
                Gestionar Motivos
              </Button>
              <Button type="button" size="sm" onClick={openCreateModal}>
                <Plus className="size-3.5" />
                Registrar Consulta
              </Button>
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por diagnóstico, CIE-10, motivo o médico..."
              className="pl-8"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Fecha / Código</TableHead>
                  <TableHead>Motivo & Diagnóstico CIE-10</TableHead>
                  <TableHead className="w-56">Signos Vitales & IMC</TableHead>
                  <TableHead className="w-44">Médico</TableHead>
                  <TableHead className="w-44 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length > 0 ? (
                  items.map((cons) => {
                    const rowAlerts = getVitalSignAlerts(cons.vitalSigns);

                    return (
                      <TableRow key={cons.id}>
                        <TableCell className="align-top">
                          <div className="flex flex-col font-mono">
                            <span className="text-xs font-bold text-primary">
                              {formatPeruDateDisplay(cons.consultationDate)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              CONS-{cons.id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="max-w-md whitespace-normal align-top">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {cons.cie10Code ? (
                                <Badge
                                  variant="outline"
                                  className="border-primary/30 bg-primary/10 font-mono text-[10px] text-primary"
                                >
                                  {cons.cie10Code}
                                </Badge>
                              ) : null}
                              <span className="font-semibold text-foreground">
                                {cons.diagnosis}
                              </span>
                            </div>

                            <p className="text-xs text-muted-foreground">
                              <strong className="text-foreground">Motivo:</strong>{" "}
                              {cons.reasonForVisit}
                              {cons.illnessTime ? ` (${cons.illnessTime})` : ""}
                            </p>

                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              <strong className="text-foreground">Plan:</strong>{" "}
                              {cons.treatmentPlan}
                            </p>

                            {cons.nextAppointmentDate ? (
                              <Link
                                href={`/agenda?new=1&patientId=${patient.id}`}
                                className="inline-flex items-center gap-1 font-mono text-[10.5px] font-medium text-primary hover:underline"
                              >
                                <CalendarPlus className="size-3" />
                                Próximo control:{" "}
                                {formatPeruDateDisplay(cons.nextAppointmentDate)}
                              </Link>
                            ) : null}
                          </div>
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="space-y-1 font-mono text-[11px]">
                            <p className="text-foreground">
                              PA <strong>{cons.vitalSigns.bloodPressure}</strong> • FC{" "}
                              <strong>{cons.vitalSigns.heartRate}</strong>
                            </p>
                            <p className="text-muted-foreground">
                              {cons.vitalSigns.weightKg}kg • {cons.vitalSigns.heightCm}
                              cm •{" "}
                              <strong className="text-primary">
                                IMC {cons.vitalSigns.bmi}
                              </strong>
                            </p>
                            {rowAlerts.length > 0 ? (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {rowAlerts.map((al) => (
                                  <Badge
                                    key={al.label}
                                    variant={
                                      al.tone === "destructive"
                                        ? "destructive"
                                        : "outline"
                                    }
                                    className="text-[9.5px]"
                                  >
                                    <AlertTriangle className="size-2.5" />
                                    {al.label}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="text-xs">
                            <p className="font-medium text-foreground">
                              {cons.doctorName}
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              CMP {cons.doctorCmp}
                              {cons.doctorRne ? ` • RNE ${cons.doctorRne}` : ""}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="text-right align-top">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-xs"
                              onClick={() => {
                                const url = generateConsultationWhatsAppUrl({
                                  patientName: patient.fullName,
                                  patientPhone: patient.phone,
                                  consultationDate: cons.consultationDate,
                                  doctorName: cons.doctorName,
                                  doctorCmp: cons.doctorCmp,
                                  diagnosis: cons.diagnosis,
                                  cie10Code: cons.cie10Code,
                                  treatmentPlan: cons.treatmentPlan,
                                  auxiliaryExams: cons.auxiliaryExams,
                                  prescriptionNotes: cons.prescriptionNotes,
                                  nextAppointmentDate: cons.nextAppointmentDate,
                                });
                                window.open(url, "_blank", "noopener,noreferrer");
                              }}
                              aria-label="Enviar resumen por WhatsApp"
                              title="Enviar resumen por WhatsApp"
                            >
                              <MessageCircle className="size-3.5 text-success" />
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => setPrintingItem(cons)}
                            >
                              <Printer className="size-3" />
                              A4
                            </Button>

                            {canEdit ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => openEditModal(cons)}
                                aria-label="Editar consulta"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                            ) : null}

                            {canDelete ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                disabled={deletingId === cons.id}
                                onClick={() => requestDelete(cons)}
                                aria-label="Archivar consulta"
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {filteredCount === 0 && totalCount > 0
                        ? "No hay consultas que coincidan con el buscador."
                        : "Sin consultas ginecológicas registradas aún para esta paciente."}
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
            itemLabel="consultas"
          />
        </CardContent>
      </Card>

      <ConsultationModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patient={patient}
        editingItem={editingItem}
        lastConsultation={lastConsultation}
        form={form}
        isSubmitting={isSubmitting}
        activeAppointments={activeAppointments}
        consultationReasons={consultationReasons}
        onOpenManageReasons={
          canEdit ? () => reasonManager.setOpen(true) : undefined
        }
        vademecumOptions={vademecumOptions}
        labTemplates={labTemplates}
        liveBmi={liveBmi}
        bmiMeta={bmiMeta}
        vitalAlerts={vitalAlerts}
        watchedDiagnosis={watchedDiagnosis}
        watchedCie10={watchedCie10}
        watchedAppointmentId={watchedAppointmentId}
        watchedAuxExams={watchedAuxExams}
        watchedRxNotes={watchedRxNotes}
        onSelectReasonPreset={selectReasonPreset}
        onFillNormalPhysicalExam={fillNormalPhysicalExam}
        onAppendLabTemplate={appendLabTemplate}
        onAppendMedication={appendVademecumMedication}
        onSaveAndPrintIntent={setSaveAndPrintIntent}
        onSubmit={onSubmit}
      />

      <ConsultationPrintModal
        consultation={printingItem}
        patient={patient}
        showCoverPage={showCoverPage}
        onShowCoverPageChange={setShowCoverPage}
        onClose={() => setPrintingItem(null)}
      />

      <ManageCategoriesModal
        open={reasonManager.open}
        onOpenChange={reasonManager.setOpen}
        title="Gestionar Motivos de Consulta"
        description="Agregue, renombre o elimine motivos frecuentes de consulta médica. No se pueden eliminar motivos que ya estén registrados en consultas."
        placeholder="Ej. Control post-operatorio laparoscópico"
        categories={reasonManager.categories}
        newName={reasonManager.newName}
        onNewNameChange={reasonManager.setNewName}
        isCreating={reasonManager.isCreating}
        editingId={reasonManager.editingId}
        editingName={reasonManager.editingName}
        onEditingNameChange={reasonManager.setEditingName}
        busyId={reasonManager.busyId}
        onCreate={reasonManager.handleCreate}
        onStartEdit={reasonManager.startEditing}
        onCancelEdit={reasonManager.cancelEditing}
        onSaveRename={reasonManager.handleRename}
        onDelete={reasonManager.handleDelete}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar Consulta Médica</DialogTitle>
            <DialogDescription>
              ¿Confirma archivar la consulta del{" "}
              <span className="font-mono">
                {formatPeruDateDisplay(deleteTarget?.consultationDate)}
              </span>{" "}
              (Dx:{" "}
              <strong className="text-foreground">
                {deleteTarget?.diagnosis}
              </strong>
              )? La acción quedará registrada en auditoría.
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
    </div>
  );
}
