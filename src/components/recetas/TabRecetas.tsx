"use client";

import { useImperativeHandle, type Ref } from "react";
import {
  CopyPlus,
  Link2,
  MessageCircle,
  Pencil,
  Pill,
  Plus,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
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
import type {
  ConsultationVademecumOption,
  MedicalConsultationItem,
} from "@/features/consultas/consultas.schema";
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import { useRecetas } from "@/features/recetas/hooks/use-recetas";
import type { MedicalPrescriptionItem } from "@/features/recetas/recetas.schema";
import { formatPeruDateDisplay } from "@/lib/utils";
import { generatePrescriptionWhatsAppUrl } from "@/lib/whatsapp-share";
import { PrescriptionModal } from "./PrescriptionModal";
import { PrescriptionPrintModal } from "./PrescriptionPrintModal";

export interface TabRecetasHandle {
  openFromConsultation: (consultation: MedicalConsultationItem) => void;
  openPrintPreview: (prescription: MedicalPrescriptionItem) => void;
  openEdit: (prescription: MedicalPrescriptionItem) => void;
}

interface TabRecetasProps {
  ref?: Ref<TabRecetasHandle>;
  patient: PatientDirectoryItem;
  background?: PatientBackgroundItem | null;
  prescriptions: MedicalPrescriptionItem[];
  onPrescriptionsChange: (next: MedicalPrescriptionItem[]) => void;
  vademecumOptions: ConsultationVademecumOption[];
  consultations: MedicalConsultationItem[];
  canEdit: boolean;
  canDelete: boolean;
}

export function TabRecetas({
  ref,
  patient,
  background,
  prescriptions,
  onPrescriptionsChange,
  vademecumOptions,
  consultations,
  canEdit,
  canDelete,
}: TabRecetasProps) {
  const {
    items,
    totalCount,
    filteredCount,
    pagination,
    search,
    setSearch,
    dialogOpen,
    setDialogOpen,
    editingItem,
    sourceConsultationLabel,
    form,
    isSubmitting,
    watchedDiagnosis,
    watchedCie10,
    watchedConsultationId,
    draftItems,
    builder,
    setBuilder,
    editingItemIndex,
    vademecumSearch,
    setVademecumSearch,
    filteredVademecum,
    dosagePresets,
    openCreateModal,
    openEditModal,
    openDuplicateModal,
    openFromConsultation,
    selectVademecumMedication,
    applyDosagePreset,
    saveBuilderItem,
    startEditDraftItem,
    cancelEditDraftItem,
    removeDraftItem,
    appendGeneralIndication,
    handleSelectConsultationLink,
    setSaveAndPrintIntent,
    onSubmit,
    printingItem,
    setPrintingItem,
    showCoverPage,
    setShowCoverPage,
    paperFormat,
    setPaperFormat,
    deleteTarget,
    setDeleteTarget,
    deletingId,
    confirmDelete,
  } = useRecetas({
    patient,
    prescriptions,
    onPrescriptionsChange,
    vademecumOptions,
    consultations,
  });

  useImperativeHandle(
    ref,
    () => ({
      openFromConsultation,
      openPrintPreview: setPrintingItem,
      openEdit: openEditModal,
    }),
    [openFromConsultation, openEditModal, setPrintingItem]
  );

  return (
    <div className="space-y-4">
      <Card className="border border-border bg-card">
        <CardHeader className="flex flex-col gap-3 border-b border-border sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Pill className="size-4 text-primary" />
              Recetario Médico Oficial ({totalCount})
            </CardTitle>
            <CardDescription>
              Prescripción estructurada conectada al vademécum CENDO,
              posología ginecológica, impresión A4/A5 y envío por WhatsApp.
            </CardDescription>
          </div>

          {canEdit ? (
            <Button type="button" size="sm" onClick={openCreateModal}>
              <Plus className="size-3.5" />
              Emitir Receta
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por medicamento, diagnóstico, CIE-10 o médico..."
                className="pl-8"
              />
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {filteredCount} de {totalCount} recetas
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-36">Fecha / Código</TableHead>
                  <TableHead>Diagnóstico & CIE-10</TableHead>
                  <TableHead>Medicamentos Prescritos (Rp/)</TableHead>
                  <TableHead className="w-44">Médico Emisor</TableHead>
                  <TableHead className="w-48 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length > 0 ? (
                  items.map((rec) => {
                    const linkedCons = rec.consultationId
                      ? consultations.find((c) => c.id === rec.consultationId)
                      : null;
                    return (
                      <TableRow key={rec.id}>
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <p className="font-mono text-xs font-semibold text-foreground">
                              {formatPeruDateDisplay(rec.prescriptionDate)}
                            </p>
                            <Badge variant="outline" className="font-mono text-[10px]">
                              REC-{rec.id.slice(0, 8).toUpperCase()}
                            </Badge>
                            {rec.consultationId ? (
                              <div className="flex items-center gap-1 text-[10.5px] font-medium text-primary">
                                <Link2 className="size-3" />
                                <span>
                                  {linkedCons
                                    ? `Cons. ${formatPeruDateDisplay(linkedCons.consultationDate)}`
                                    : "Consulta vinculada"}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </TableCell>

                        <TableCell className="align-top whitespace-normal">
                          <div className="max-w-xs space-y-1">
                            <p className="text-xs font-semibold text-foreground">
                              {rec.diagnosis}
                            </p>
                            {rec.cie10Code ? (
                              <Badge variant="secondary" className="font-mono text-[10px]">
                                CIE-10: {rec.cie10Code}
                              </Badge>
                            ) : null}
                            {rec.nextAppointmentDate ? (
                              <p className="font-mono text-[10.5px] text-muted-foreground">
                                Control: {formatPeruDateDisplay(rec.nextAppointmentDate)}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>

                        <TableCell className="align-top whitespace-normal">
                          <ul className="max-w-md space-y-1 text-xs">
                            {rec.items.map((item, idx) => (
                              <li key={item.id} className="leading-snug text-foreground">
                                <span className="font-mono font-bold text-primary">
                                  {idx + 1}.
                                </span>{" "}
                                <strong>{item.medicationName}</strong>{" "}
                                <span className="text-muted-foreground">
                                  ({item.route} • {item.dosage} • {item.frequency} •{" "}
                                  {item.duration})
                                </span>
                              </li>
                            ))}
                          </ul>
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="text-xs">
                            <p className="font-medium text-foreground">
                              {rec.doctorName}
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              CMP {rec.doctorCmp}
                              {rec.doctorRne ? ` • RNE ${rec.doctorRne}` : ""}
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
                                const url = generatePrescriptionWhatsAppUrl({
                                  patientName: patient.fullName,
                                  patientPhone: patient.phone,
                                  prescriptionDate: rec.prescriptionDate,
                                  doctorName: rec.doctorName,
                                  doctorCmp: rec.doctorCmp,
                                  diagnosis: rec.diagnosis,
                                  cie10Code: rec.cie10Code,
                                  items: rec.items,
                                  generalIndications: rec.generalIndications,
                                  nextAppointmentDate: rec.nextAppointmentDate,
                                });
                                window.open(url, "_blank", "noopener,noreferrer");
                              }}
                              aria-label="Enviar receta por WhatsApp"
                              title="Enviar receta por WhatsApp"
                            >
                              <MessageCircle className="size-3.5 text-success" />
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => setPrintingItem(rec)}
                            >
                              <Printer className="size-3" />
                              A4/A5
                            </Button>

                            {canEdit ? (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => openDuplicateModal(rec)}
                                  aria-label="Renovar / duplicar receta"
                                  title="Renovar / duplicar receta"
                                >
                                  <CopyPlus className="size-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => openEditModal(rec)}
                                  aria-label="Editar receta"
                                  title="Editar receta"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              </>
                            ) : null}

                            {canDelete ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                disabled={deletingId === rec.id}
                                onClick={() => setDeleteTarget(rec)}
                                aria-label="Archivar receta"
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
                        ? "No hay recetas que coincidan con el buscador."
                        : "Sin recetas médicas emitidas aún para esta paciente."}
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
            itemLabel="recetas"
          />
        </CardContent>
      </Card>

      <PrescriptionModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patient={patient}
        background={background}
        editingItem={editingItem}
        sourceConsultationLabel={sourceConsultationLabel}
        form={form}
        isSubmitting={isSubmitting}
        consultations={consultations}
        watchedDiagnosis={watchedDiagnosis}
        watchedCie10={watchedCie10}
        watchedConsultationId={watchedConsultationId}
        draftItems={draftItems}
        builder={builder}
        onBuilderChange={setBuilder}
        editingItemIndex={editingItemIndex}
        vademecumSearch={vademecumSearch}
        onVademecumSearchChange={setVademecumSearch}
        filteredVademecum={filteredVademecum}
        dosagePresets={dosagePresets}
        onSelectVademecum={selectVademecumMedication}
        onApplyDosagePreset={applyDosagePreset}
        onSaveBuilderItem={saveBuilderItem}
        onEditDraftItem={startEditDraftItem}
        onCancelEditDraftItem={cancelEditDraftItem}
        onRemoveDraftItem={removeDraftItem}
        onAppendIndication={appendGeneralIndication}
        onSelectConsultationLink={handleSelectConsultationLink}
        onSaveAndPrintIntent={setSaveAndPrintIntent}
        onSubmit={onSubmit}
      />

      <PrescriptionPrintModal
        prescription={printingItem}
        patient={patient}
        patientAllergies={patient.medicalAllergies}
        showCoverPage={showCoverPage}
        onShowCoverPageChange={setShowCoverPage}
        paperFormat={paperFormat}
        onPaperFormatChange={setPaperFormat}
        canEdit={canEdit}
        onEdit={openEditModal}
        onClose={() => setPrintingItem(null)}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar Receta Médica</DialogTitle>
            <DialogDescription>
              ¿Confirma archivar la receta del{" "}
              <span className="font-mono">
                {formatPeruDateDisplay(deleteTarget?.prescriptionDate)}
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
