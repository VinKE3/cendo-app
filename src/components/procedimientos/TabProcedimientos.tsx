"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  FlaskConical,
  Loader2,
  MessageCircle,
  Pencil,
  Pill,
  Plus,
  Printer,
  Scissors,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { ClinicalTemplatesManagerModal } from "@/components/chequeos/ClinicalTemplatesManagerModal";
import { TablePagination } from "@/components/common/TablePagination";
import { MinorProcedureModal } from "@/components/procedimientos/MinorProcedureModal";
import { MinorProcedurePrintModal } from "@/components/procedimientos/MinorProcedurePrintModal";
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
import type { ClinicalTemplateItem } from "@/features/clinical-templates/clinical-templates.schema";
import { useClinicalTemplates } from "@/features/clinical-templates/hooks/use-clinical-templates";
import type { ColposcopyReportItem } from "@/features/colposcopia/colposcopia.schema";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type { UltrasoundReportItem } from "@/features/ecografias/ecografias.schema";
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import { useProcedimientos } from "@/features/procedimientos/hooks/use-procedimientos";
import {
  isContraceptiveDeviceProcedure,
  PROCEDURE_TYPE_LABELS,
  PROCEDURE_TYPE_SHORT_LABELS,
  type MinorProcedureItem,
} from "@/features/procedimientos/procedimientos.schema";
import { cn, formatPeruDateDisplay } from "@/lib/utils";
import { generateMinorProcedureWhatsAppUrl } from "@/lib/whatsapp-share";

interface TabProcedimientosProps {
  patient: PatientDirectoryItem;
  background?: PatientBackgroundItem | null;
  procedures: MinorProcedureItem[];
  onProceduresChange: (next: MinorProcedureItem[]) => void;
  consultations: MedicalConsultationItem[];
  ultrasounds: UltrasoundReportItem[];
  colposcopies: ColposcopyReportItem[];
  initialClinicalTemplates: ClinicalTemplateItem[];
  canEdit: boolean;
  canDelete: boolean;
  onEmitPathologyOrderFromProcedure?: (proc: MinorProcedureItem) => void;
  onEmitPrescriptionFromProcedure?: (proc: MinorProcedureItem) => void;
  onMacSynced?: (newMac: string) => void;
}

export function TabProcedimientos({
  patient,
  background,
  procedures,
  onProceduresChange,
  consultations,
  ultrasounds,
  colposcopies,
  initialClinicalTemplates,
  canEdit,
  canDelete,
  onEmitPathologyOrderFromProcedure,
  onEmitPrescriptionFromProcedure,
  onMacSynced,
}: TabProcedimientosProps) {
  const [templatesManagerOpen, setTemplatesManagerOpen] = useState(false);
  const templateStore = useClinicalTemplates(initialClinicalTemplates);

  const lastUltrasound = ultrasounds[0] ?? null;
  const lastColposcopy = colposcopies[0] ?? null;

  const proc = useProcedimientos({
    patientId: patient.id,
    procedures,
    onProceduresChange,
    consultations,
    lastColposcopy,
    templates: templateStore.procedureTemplates,
    onCreateTemplate: templateStore.createTemplate,
    onMacSynced,
  });

  const pathologyPendingCount = procedures.filter(
    (p) =>
      p.procedureDetails.specimenSentToPathology &&
      (p.procedureDetails.pathologyStatus ?? "PENDIENTE") === "PENDIENTE"
  ).length;

  const pathologyReceivedCount = procedures.filter(
    (p) =>
      p.procedureDetails.specimenSentToPathology &&
      p.procedureDetails.pathologyStatus === "RECIBIDO"
  ).length;

  const deviceProceduresCount = procedures.filter((p) =>
    isContraceptiveDeviceProcedure(p.procedureType)
  ).length;

  return (
    <div className="space-y-4">
      {/* KPIs Rápidos de Procedimientos Menores */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border border-border bg-card">
          <CardContent className="flex items-center justify-between pt-4 pb-4">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                Procedimientos Realizados
              </p>
              <p className="mt-0.5 font-mono text-xl font-bold text-foreground">
                {proc.totalCount}
              </p>
            </div>
            <Scissors className="size-5 text-primary" />
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardContent className="flex items-center justify-between pt-4 pb-4">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                Muestras en Patología (Pend. / Recib.)
              </p>
              <p className="mt-0.5 font-mono text-xl font-bold text-foreground">
                <span
                  className={cn(
                    pathologyPendingCount > 0
                      ? "text-warning"
                      : "text-foreground"
                  )}
                >
                  {pathologyPendingCount}
                </span>{" "}
                /{" "}
                <span className="text-success">{pathologyReceivedCount}</span>
              </p>
            </div>
            <FlaskConical className="size-5 text-primary" />
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardContent className="flex items-center justify-between pt-4 pb-4">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                Dispositivos (DIU / Implantes)
              </p>
              <p className="mt-0.5 font-mono text-xl font-bold text-foreground">
                {deviceProceduresCount}
              </p>
            </div>
            <ShieldCheck className="size-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      {/* Tabla Principal de Procedimientos Menores */}
      <Card className="border border-border bg-card">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Scissors className="size-4 text-primary" />
                Procedimientos Menores & Protocolos de Biopsia en Consultorio
              </CardTitle>
              <CardDescription>
                Biopsia cervical dirigida, Biopsia endometrial Pipelle, Cono
                LEEP, Polipectomía, DIU/SIU e Implantes subdérmicos con
                trazabilidad de patología.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
                <Input
                  value={proc.search}
                  onChange={(e) => proc.setSearch(e.target.value)}
                  placeholder="Buscar procedimiento, CIE-10..."
                  className="h-8 pl-8 text-xs"
                />
              </div>

              {canEdit ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setTemplatesManagerOpen(true)}
                  >
                    <Settings className="size-3.5" />
                    Plantillas
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => proc.openCreateModal()}
                  >
                    <Plus className="size-3.5" />
                    Registrar Procedimiento
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {proc.filteredCount === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
              <Scissors className="mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">
                {proc.totalCount === 0
                  ? "Aún no hay procedimientos menores registrados."
                  : "Sin coincidencias para el filtro aplicado."}
              </p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                Registre protocolos operatorios de biopsias cervicales,
                endometriales (Pipelle), Cono LEEP o colocación/retiro de DIU e
                implantes subdérmicos.
              </p>
              {canEdit && proc.totalCount === 0 ? (
                <Button
                  type="button"
                  size="sm"
                  className="mt-3"
                  onClick={() => proc.openCreateModal()}
                >
                  <Plus className="size-3.5" />
                  Registrar Primer Procedimiento
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs">
                        Fecha / Procedimiento
                      </TableHead>
                      <TableHead className="text-xs">
                        Diagnóstico Post-Op / CIE-10
                      </TableHead>
                      <TableHead className="text-xs">
                        Anestesia / Hemostasia
                      </TableHead>
                      <TableHead className="text-xs">
                        Patología / Dispositivo
                      </TableHead>
                      <TableHead className="text-right text-xs">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proc.items.map((item) => {
                      const det = item.procedureDetails;
                      const isDevice = isContraceptiveDeviceProcedure(
                        item.procedureType
                      );
                      const pathStatus =
                        det.pathologyStatus ??
                        (det.specimenSentToPathology
                          ? "PENDIENTE"
                          : "NO_APLICA");
                      const waUrl = generateMinorProcedureWhatsAppUrl({
                        patientName: patient.fullName,
                        patientPhone: patient.phone,
                        procedureDate: item.procedureDate,
                        doctorName: item.doctorName,
                        doctorCmp: item.doctorCmp,
                        procedureTypeLabel:
                          PROCEDURE_TYPE_LABELS[item.procedureType] ||
                          item.procedureType,
                        postOpDiagnosis: item.postOpDiagnosis,
                        cie10Code: item.cie10Code,
                        anesthesiaType: item.anesthesiaType,
                        specimenSentToPathology: det.specimenSentToPathology,
                        specimenDescription: det.specimenDescription,
                        deviceInfo: det.deviceInfo,
                        postOpIndications: item.postOpIndications,
                        medicationsPrescribed: item.medicationsPrescribed,
                        nextControlDate: item.nextControlDate,
                      });

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="align-top text-xs">
                            <div className="font-mono font-semibold text-foreground">
                              {formatPeruDateDisplay(item.procedureDate)}
                            </div>
                            <Badge
                              variant="outline"
                              className="mt-1 border-primary/30 bg-primary/10 text-[10px] font-semibold text-primary"
                            >
                              {PROCEDURE_TYPE_SHORT_LABELS[
                                item.procedureType
                              ] || item.procedureType}
                            </Badge>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {item.doctorName}
                            </p>
                          </TableCell>

                          <TableCell className="max-w-xs align-top text-xs">
                            <p className="line-clamp-2 font-semibold text-foreground">
                              {item.postOpDiagnosis}
                            </p>
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                              Pre-Op: {item.preOpDiagnosis}
                            </p>
                            {item.cie10Code ? (
                              <Badge
                                variant="outline"
                                className="mt-1 font-mono text-[10px]"
                              >
                                CIE-10: {item.cie10Code}
                              </Badge>
                            ) : null}
                          </TableCell>

                          <TableCell className="align-top text-xs">
                            <p className="font-medium text-foreground">
                              {item.anesthesiaType}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Hemostasia: {det.hemostasisMethod}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Sangrado: {det.bleedingAmount}
                            </p>
                          </TableCell>

                          <TableCell className="max-w-xs align-top text-xs">
                            {det.specimenSentToPathology ? (
                              <div className="space-y-1">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "gap-1 text-[10px]",
                                    pathStatus === "RECIBIDO"
                                      ? "border-success/40 bg-success/10 text-success"
                                      : "border-warning/40 bg-warning/15 text-foreground"
                                  )}
                                >
                                  {pathStatus === "RECIBIDO" ? (
                                    <CheckCircle2 className="size-3" />
                                  ) : (
                                    <Clock className="size-3" />
                                  )}
                                  {pathStatus === "RECIBIDO"
                                    ? "Patología: Recibido"
                                    : "Patología: Pendiente"}
                                </Badge>
                                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                                  {det.pathologyResultNotes ||
                                    det.specimenDescription ||
                                    "Muestra en formol 10%"}
                                </p>
                              </div>
                            ) : isDevice && det.deviceInfo ? (
                              <div className="space-y-1">
                                <Badge
                                  variant="outline"
                                  className="border-primary/30 bg-primary/10 text-[10px] text-primary"
                                >
                                  Dispositivo
                                </Badge>
                                <p className="line-clamp-2 text-[11px] font-medium text-foreground">
                                  {det.deviceInfo}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                No requiere patología
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="text-right align-top">
                            <div className="inline-flex items-center justify-end gap-1">
                              {canEdit &&
                              det.specimenSentToPathology &&
                              onEmitPathologyOrderFromProcedure ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="xs"
                                  title="Emitir Orden de Anatomía Patológica pre-llenada"
                                  onClick={() =>
                                    onEmitPathologyOrderFromProcedure(item)
                                  }
                                >
                                  <FlaskConical className="size-3.5 text-primary" />
                                  <span className="hidden xl:inline">
                                    Patología
                                  </span>
                                </Button>
                              ) : null}

                              {canEdit && onEmitPrescriptionFromProcedure ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  title="Emitir Receta Post-Op"
                                  onClick={() =>
                                    onEmitPrescriptionFromProcedure(item)
                                  }
                                >
                                  <Pill className="size-3.5 text-primary" />
                                </Button>
                              ) : null}

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                title="Vista Previa / Imprimir Protocolo A4"
                                onClick={() => proc.setPrintingItem(item)}
                              >
                                <Printer className="size-3.5" />
                              </Button>

                              {waUrl ? (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Enviar indicaciones postoperatorias por WhatsApp"
                                >
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    className="text-success hover:text-success"
                                  >
                                    <MessageCircle className="size-3.5" />
                                  </Button>
                                </a>
                              ) : null}

                              {canEdit ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  title="Editar Procedimiento"
                                  onClick={() => proc.openEditModal(item)}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              ) : null}

                              {canDelete ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  title="Archivar Procedimiento"
                                  onClick={() => proc.setDeleteTarget(item)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <TablePagination
                currentPage={proc.pagination.currentPage}
                totalItems={proc.filteredCount}
                pageSize={proc.pagination.pageSize}
                onPageChange={proc.pagination.setCurrentPage}
                onPageSizeChange={proc.pagination.setPageSize}
                itemLabel="procedimientos menores"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Creación / Edición */}
      <MinorProcedureModal
        open={proc.dialogOpen}
        onOpenChange={proc.setDialogOpen}
        editingItem={proc.editingItem}
        patient={patient}
        background={background}
        lastUltrasound={lastUltrasound}
        lastColposcopy={lastColposcopy}
        consultations={consultations}
        form={proc.form}
        watchedValues={proc.watchedValues}
        isSubmitting={proc.isSubmitting}
        templates={templateStore.procedureTemplates}
        canEditTemplates={canEdit}
        isSavingTemplate={templateStore.isMutating}
        procedureTypes={proc.procedureTypes}
        anesthesiaOptions={proc.anesthesiaOptions}
        bleedingOptions={proc.bleedingOptions}
        hemostasisOptions={proc.hemostasisOptions}
        onSelectProcedureType={proc.handleSelectProcedureType}
        onApplyTemplate={proc.applyTemplate}
        onImportFromLastColposcopy={proc.importFromLastColposcopy}
        onBuildTemplatePayload={proc.buildTemplatePayload}
        onSaveAsTemplate={proc.saveAsTemplate}
        onOpenTemplatesManager={() => setTemplatesManagerOpen(true)}
        onSetSaveAndPrintIntent={proc.setSaveAndPrintIntent}
        onSubmit={proc.onSubmit}
      />

      {/* Modal de Vista Previa e Impresión A4 */}
      <MinorProcedurePrintModal
        procedure={proc.printingItem}
        patient={patient}
        showCoverPage={proc.showCoverPage}
        onShowCoverPageChange={proc.setShowCoverPage}
        canEdit={canEdit}
        onEdit={proc.openEditModal}
        onEmitPathologyOrder={onEmitPathologyOrderFromProcedure}
        onEmitPrescription={onEmitPrescriptionFromProcedure}
        onClose={() => proc.setPrintingItem(null)}
      />

      {/* Confirmación de Archivado */}
      <Dialog
        open={Boolean(proc.deleteTarget)}
        onOpenChange={(open) => {
          if (!open) proc.setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Archivar Procedimiento Menor?</DialogTitle>
            <DialogDescription>
              Se archivará el protocolo de{" "}
              <strong>
                {proc.deleteTarget
                  ? PROCEDURE_TYPE_LABELS[proc.deleteTarget.procedureType]
                  : ""}
              </strong>{" "}
              del{" "}
              <strong>
                {proc.deleteTarget
                  ? formatPeruDateDisplay(proc.deleteTarget.procedureDate)
                  : ""}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => proc.setDeleteTarget(null)}
              disabled={Boolean(proc.deletingId)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void proc.confirmDelete()}
              disabled={Boolean(proc.deletingId)}
            >
              {proc.deletingId ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Sí, Archivar Procedimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gestor de Plantillas de Procedimientos Menores */}
      <ClinicalTemplatesManagerModal
        open={templatesManagerOpen}
        onOpenChange={setTemplatesManagerOpen}
        scope="PROCEDURE"
        templates={templateStore.procedureTemplates}
        canDeleteOfficial={canDelete}
        isMutating={templateStore.isMutating}
        onApplyTemplate={
          proc.dialogOpen
            ? (tmpl) => {
                if (tmpl.scope === "PROCEDURE") {
                  proc.applyTemplate(tmpl);
                }
              }
            : undefined
        }
        onCreateTemplate={templateStore.createTemplate}
        onUpdateTemplate={templateStore.updateTemplate}
        onDeleteTemplate={templateStore.deleteTemplate}
        onRestoreOfficialTemplates={templateStore.restoreOfficialTemplates}
      />
    </div>
  );
}
