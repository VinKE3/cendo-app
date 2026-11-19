"use client";

import { useImperativeHandle, useState, type Ref } from "react";
import {
  CopyPlus,
  FlaskConical,
  Link2,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { TablePagination } from "@/components/common/TablePagination";
import { QuoteModal } from "@/components/cotizaciones/QuoteModal";
import { QuotePrintModal } from "@/components/cotizaciones/QuotePrintModal";
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
import type { ColposcopyReportItem } from "@/features/colposcopia/colposcopia.schema";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import { useCotizaciones } from "@/features/cotizaciones/hooks/use-cotizaciones";
import type { ProcedureQuoteItem } from "@/features/cotizaciones/cotizaciones.schema";
import { useLaboratorio } from "@/features/laboratorio/hooks/use-laboratorio";
import type {
  LabOrderItem,
  LabOrderTemplateItem,
} from "@/features/laboratorio/laboratorio.schema";
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import type { MinorProcedureItem } from "@/features/procedimientos/procedimientos.schema";
import type { ProcedureTariffItem } from "@/features/tarifario/tarifario.schema";
import { cn, formatCurrency, formatPeruDateDisplay } from "@/lib/utils";
import {
  generateLabOrderWhatsAppUrl,
  generateQuoteWhatsAppUrl,
} from "@/lib/whatsapp-share";
import { LabOrderModal } from "./LabOrderModal";
import { LabOrderPrintModal } from "./LabOrderPrintModal";
import { LabTemplatesManagerModal } from "./LabTemplatesManagerModal";

export interface TabLabCotizHandle {
  openLabFromConsultation: (consultation: MedicalConsultationItem) => void;
  openBiopsyFromColposcopy: (colposcopy: ColposcopyReportItem) => void;
  openPathologyFromProcedure: (procedure: MinorProcedureItem) => void;
  openLabPrintPreview: (labOrder: LabOrderItem) => void;
  openLabEdit: (labOrder: LabOrderItem) => void;
  openQuoteFromConsultation: (consultation: MedicalConsultationItem) => void;
  openQuotePrintPreview: (quote: ProcedureQuoteItem) => void;
  openQuoteEdit: (quote: ProcedureQuoteItem) => void;
}

interface TabLaboratorioCotizacionesProps {
  ref?: Ref<TabLabCotizHandle>;
  patient: PatientDirectoryItem;
  background?: PatientBackgroundItem | null;
  labOrders: LabOrderItem[];
  onLabOrdersChange: (next: LabOrderItem[]) => void;
  labTemplates: LabOrderTemplateItem[];
  onLabTemplatesChange: (next: LabOrderTemplateItem[]) => void;
  quotes: ProcedureQuoteItem[];
  onQuotesChange: (next: ProcedureQuoteItem[]) => void;
  tariffs: ProcedureTariffItem[];
  consultations: MedicalConsultationItem[];
  canEdit: boolean;
  canDelete: boolean;
}

export function TabLaboratorioCotizaciones({
  ref,
  patient,
  background,
  labOrders,
  onLabOrdersChange,
  labTemplates,
  onLabTemplatesChange,
  quotes,
  onQuotesChange,
  tariffs,
  consultations,
  canEdit,
  canDelete,
}: TabLaboratorioCotizacionesProps) {
  const [subTab, setSubTab] = useState<"laboratorio" | "cotizaciones">(
    "laboratorio"
  );

  const lab = useLaboratorio({
    patient,
    background,
    labOrders,
    onLabOrdersChange,
    labTemplates,
    onLabTemplatesChange,
    consultations,
  });

  const cotiz = useCotizaciones({
    patient,
    quotes,
    onQuotesChange,
    tariffs,
    consultations,
  });

  useImperativeHandle(
    ref,
    () => ({
      openLabFromConsultation: (cons) => {
        setSubTab("laboratorio");
        lab.openFromConsultation(cons);
      },
      openBiopsyFromColposcopy: (colpo) => {
        setSubTab("laboratorio");
        lab.openBiopsyFromColposcopy(colpo);
      },
      openPathologyFromProcedure: (proc) => {
        setSubTab("laboratorio");
        lab.openPathologyFromProcedure(proc);
      },
      openLabPrintPreview: (ord) => {
        setSubTab("laboratorio");
        lab.setPrintingItem(ord);
      },
      openLabEdit: (ord) => {
        setSubTab("laboratorio");
        lab.openEditModal(ord);
      },
      openQuoteFromConsultation: (cons) => {
        setSubTab("cotizaciones");
        cotiz.openFromConsultation(cons);
      },
      openQuotePrintPreview: (q) => {
        setSubTab("cotizaciones");
        cotiz.setPrintingItem(q);
      },
      openQuoteEdit: (q) => {
        setSubTab("cotizaciones");
        cotiz.openEditModal(q);
      },
    }),
    [lab, cotiz]
  );

  return (
    <div className="space-y-4">
      {/* Switch de Sub-Tabs a Ancho Completo */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-1.5">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setSubTab("laboratorio")}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              subTab === "laboratorio"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <FlaskConical className="size-3.5" />
            <span>Órdenes de Laboratorio & Patología</span>
            <span
              className={cn(
                "rounded px-1.5 font-mono text-[10px]",
                subTab === "laboratorio"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {lab.totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("cotizaciones")}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              subTab === "cotizaciones"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Receipt className="size-3.5" />
            <span>Presupuestos & Cotizaciones</span>
            <span
              className={cn(
                "rounded px-1.5 font-mono text-[10px]",
                subTab === "cotizaciones"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {cotiz.totalCount}
            </span>
          </button>
        </div>

        {canEdit ? (
          <div className="flex items-center gap-2">
            {subTab === "laboratorio" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => lab.setTemplateManagerOpen(true)}
                >
                  <Settings className="size-3.5" />
                  Plantillas ({labTemplates.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={lab.openCreateModal}
                >
                  <Plus className="size-3.5" />
                  Nueva Orden Lab
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={cotiz.openCreateModal}
              >
                <Plus className="size-3.5" />
                Nuevo Presupuesto
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {/* Sub-Tab 1: Órdenes de Laboratorio */}
      {subTab === "laboratorio" ? (
        <Card className="border border-border bg-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <FlaskConical className="size-4 text-primary" />
              Órdenes de Laboratorio Clínico y Remisión Patológica (
              {lab.totalCount})
            </CardTitle>
            <CardDescription>
              Análisis de laboratorio, paneles hormonales y remisiones de
              biopsias / citología con cadena de custodia e impresión A4.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={lab.search}
                  onChange={(e) => lab.setSearch(e.target.value)}
                  placeholder="Buscar por examen, diagnóstico, CIE-10 o plantilla..."
                  className="pl-8"
                />
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {lab.filteredCount} de {lab.totalCount} órdenes
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-40">Fecha / Código</TableHead>
                    <TableHead>Indicación / Diagnóstico</TableHead>
                    <TableHead>Estudios Solicitados</TableHead>
                    <TableHead className="w-44">Médico</TableHead>
                    <TableHead className="w-44 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lab.items.length > 0 ? (
                    lab.items.map((ord) => {
                      const linkedCons = ord.consultationId
                        ? consultations.find((c) => c.id === ord.consultationId)
                        : null;
                      return (
                        <TableRow key={ord.id}>
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="font-mono text-xs font-semibold text-foreground">
                                {formatPeruDateDisplay(ord.orderDate)}
                              </p>
                              <div className="flex flex-wrap items-center gap-1">
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[10px]"
                                >
                                  LAB-{ord.id.slice(0, 8).toUpperCase()}
                                </Badge>
                                <Badge
                                  variant={
                                    ord.urgency === "Urgente"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                  className="font-mono text-[9.5px]"
                                >
                                  {ord.urgency}
                                </Badge>
                              </div>
                              {ord.consultationId ? (
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
                                {ord.diagnosis}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {ord.cie10Code ? (
                                  <Badge
                                    variant="secondary"
                                    className="font-mono text-[10px]"
                                  >
                                    CIE-10: {ord.cie10Code}
                                  </Badge>
                                ) : null}
                                {ord.templateType !== "GENERAL" ? (
                                  <Badge
                                    variant="outline"
                                    className="border-primary/30 text-[10px] text-primary"
                                  >
                                    {ord.templateType}
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="align-top whitespace-normal">
                            <div className="max-w-md space-y-1 text-xs">
                              <div className="flex flex-wrap gap-1">
                                {ord.items.map((it) => (
                                  <Badge
                                    key={it.id}
                                    variant="outline"
                                    className="bg-muted/20 text-[10.5px] font-normal"
                                  >
                                    {it.testName}
                                  </Badge>
                                ))}
                              </div>
                              {ord.customTests ? (
                                <p className="text-[11px] italic text-muted-foreground">
                                  + {ord.customTests}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>

                          <TableCell className="align-top">
                            <div className="text-xs">
                              <p className="font-medium text-foreground">
                                {ord.doctorName}
                              </p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                CMP {ord.doctorCmp}
                                {ord.doctorRne ? ` • RNE ${ord.doctorRne}` : ""}
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
                                  const url = generateLabOrderWhatsAppUrl({
                                    patientName: patient.fullName,
                                    patientPhone: patient.phone,
                                    orderDate: ord.orderDate,
                                    doctorName: ord.doctorName,
                                    doctorCmp: ord.doctorCmp,
                                    diagnosis: ord.diagnosis,
                                    cie10Code: ord.cie10Code,
                                    urgency: ord.urgency,
                                    templateType: ord.templateType,
                                    items: ord.items,
                                    customTests: ord.customTests,
                                    patientInstructions: ord.patientInstructions,
                                  });
                                  window.open(url, "_blank", "noopener,noreferrer");
                                }}
                                aria-label="Enviar orden por WhatsApp"
                                title="Enviar orden por WhatsApp"
                              >
                                <MessageCircle className="size-3.5 text-success" />
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() => lab.setPrintingItem(ord)}
                              >
                                <Printer className="size-3" />
                                A4
                              </Button>

                              {canEdit ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => lab.openEditModal(ord)}
                                  aria-label="Editar orden"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              ) : null}

                              {canDelete ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={lab.deletingId === ord.id}
                                  onClick={() => lab.setDeleteTarget(ord)}
                                  aria-label="Archivar orden"
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
                        {lab.filteredCount === 0 && lab.totalCount > 0
                          ? "No hay órdenes de laboratorio que coincidan con el buscador."
                          : "Sin órdenes de laboratorio emitidas aún para esta paciente."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <TablePagination
              currentPage={lab.pagination.currentPage}
              pageSize={lab.pagination.pageSize}
              totalItems={lab.pagination.totalItems}
              onPageChange={lab.pagination.setCurrentPage}
              onPageSizeChange={lab.pagination.setPageSize}
              itemLabel="órdenes"
            />
          </CardContent>
        </Card>
      ) : (
        /* Sub-Tab 2: Presupuestos y Cotizaciones */
        <Card className="border border-border bg-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Receipt className="size-4 text-primary" />
              Presupuestos y Cotizaciones Médicas ({cotiz.totalCount})
            </CardTitle>
            <CardDescription>
              Presupuestos calculados con tarifas oficiales CENDO, control real
              de vigencia, impresión A4 y envío directo por WhatsApp.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={cotiz.search}
                  onChange={(e) => cotiz.setSearch(e.target.value)}
                  placeholder="Buscar por procedimiento, código o notas..."
                  className="pl-8"
                />
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {cotiz.filteredCount} de {cotiz.totalCount} presupuestos
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-40">Fecha / Código</TableHead>
                    <TableHead>Procedimientos Cotizados</TableHead>
                    <TableHead className="w-40">Vigencia</TableHead>
                    <TableHead className="w-36 text-right">Importe Total</TableHead>
                    <TableHead className="w-48 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cotiz.items.length > 0 ? (
                    cotiz.items.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <p className="font-mono text-xs font-semibold text-foreground">
                              {formatPeruDateDisplay(q.quoteDate)}
                            </p>
                            <Badge variant="outline" className="font-mono text-[10px]">
                              COT-{q.id.slice(0, 8).toUpperCase()}
                            </Badge>
                            {q.consultationId ? (
                              <div className="flex items-center gap-1 text-[10.5px] font-medium text-primary">
                                <Link2 className="size-3" />
                                <span>Consulta vinculada</span>
                              </div>
                            ) : null}
                          </div>
                        </TableCell>

                        <TableCell className="align-top whitespace-normal">
                          <ul className="max-w-md space-y-1 text-xs">
                            {q.items.map((it, idx) => (
                              <li key={`${it.procedureId}-${idx}`}>
                                <strong className="text-foreground">
                                  {it.name}
                                </strong>{" "}
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  ({formatCurrency(it.finalPrice)}
                                  {it.discountPercent && it.discountPercent > 0
                                    ? ` • -${it.discountPercent}%`
                                    : ""}
                                  )
                                </span>
                              </li>
                            ))}
                          </ul>
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <Badge
                              variant={q.isExpired ? "destructive" : "secondary"}
                              className="text-[10px]"
                            >
                              {q.isExpired ? "Vencido" : "Vigente"}
                            </Badge>
                            <p className="font-mono text-[10.5px] text-muted-foreground">
                              Hasta {formatPeruDateDisplay(q.validUntilDate)}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="text-right align-top">
                          <p className="font-mono text-sm font-bold text-primary">
                            {formatCurrency(q.total)}
                          </p>
                          {q.discountTotal > 0 ? (
                            <p className="font-mono text-[10px] text-muted-foreground">
                              Desc: -{formatCurrency(q.discountTotal)}
                            </p>
                          ) : null}
                        </TableCell>

                        <TableCell className="text-right align-top">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-xs"
                              onClick={() => {
                                const url = generateQuoteWhatsAppUrl({
                                  patientName: patient.fullName,
                                  patientPhone: patient.phone,
                                  quoteDate: q.quoteDate,
                                  validUntilDate: q.validUntilDate,
                                  validityDays: q.validityDays,
                                  doctorName: q.doctorName,
                                  items: q.items,
                                  subtotal: q.subtotal,
                                  discountTotal: q.discountTotal,
                                  total: q.total,
                                  paymentTerms: q.paymentTerms,
                                });
                                window.open(url, "_blank", "noopener,noreferrer");
                              }}
                              aria-label="Enviar presupuesto por WhatsApp"
                              title="Enviar presupuesto por WhatsApp"
                            >
                              <MessageCircle className="size-3.5 text-success" />
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => cotiz.setPrintingItem(q)}
                            >
                              <Printer className="size-3" />
                              A4
                            </Button>

                            {canEdit ? (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => cotiz.openDuplicateModal(q)}
                                  aria-label="Renovar presupuesto con tarifa vigente"
                                  title="Renovar / duplicar con tarifas vigentes"
                                >
                                  <CopyPlus className="size-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => cotiz.openEditModal(q)}
                                  aria-label="Editar presupuesto"
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
                                disabled={cotiz.deletingId === q.id}
                                onClick={() => cotiz.setDeleteTarget(q)}
                                aria-label="Archivar presupuesto"
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        {cotiz.filteredCount === 0 && cotiz.totalCount > 0
                          ? "No hay presupuestos que coincidan con el buscador."
                          : "Sin presupuestos médicos emitidos aún para esta paciente."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <TablePagination
              currentPage={cotiz.pagination.currentPage}
              pageSize={cotiz.pagination.pageSize}
              totalItems={cotiz.pagination.totalItems}
              onPageChange={cotiz.pagination.setCurrentPage}
              onPageSizeChange={cotiz.pagination.setPageSize}
              itemLabel="presupuestos"
            />
          </CardContent>
        </Card>
      )}

      {/* Modales de Laboratorio */}
      <LabOrderModal
        open={lab.dialogOpen}
        onOpenChange={lab.setDialogOpen}
        patient={patient}
        editingItem={lab.editingItem}
        sourceLabel={lab.sourceLabel}
        form={lab.form}
        isSubmitting={lab.isSubmitting}
        consultations={consultations}
        labTemplates={labTemplates}
        categories={lab.categories}
        presetPacks={lab.presetPacks}
        watchedDiagnosis={lab.watchedDiagnosis}
        watchedCie10={lab.watchedCie10}
        watchedConsultationId={lab.watchedConsultationId}
        watchedTemplateType={lab.watchedTemplateType}
        watchedTemplateTitle={lab.watchedTemplateTitle}
        selectedTests={lab.selectedTests}
        catalogSearch={lab.catalogSearch}
        onCatalogSearchChange={lab.setCatalogSearch}
        catalogCategory={lab.catalogCategory}
        onCatalogCategoryChange={lab.setCatalogCategory}
        filteredCatalog={lab.filteredCatalog}
        manualTestName={lab.manualTestName}
        onManualTestNameChange={lab.setManualTestName}
        onApplyTemplate={lab.applyTemplate}
        onResetToGeneral={lab.resetToGeneralOrder}
        onOpenManageTemplates={() => lab.setTemplateManagerOpen(true)}
        onApplyPresetPack={lab.applyPresetPack}
        onToggleCatalogTest={lab.addCatalogTest}
        onAddManualTest={lab.addManualTest}
        onRemoveSelectedTest={lab.removeSelectedTest}
        onAppendInstruction={lab.appendInstruction}
        onSelectConsultationLink={lab.handleSelectConsultationLink}
        onSaveAndPrintIntent={lab.setSaveAndPrintIntent}
        onSubmit={lab.onSubmit}
      />

      <LabTemplatesManagerModal
        open={lab.templateManagerOpen}
        onOpenChange={lab.setTemplateManagerOpen}
        templates={labTemplates}
        onSelectTemplate={lab.dialogOpen ? lab.applyTemplate : undefined}
        onCreateTemplate={lab.handleCreateTemplate}
        onUpdateTemplate={lab.handleUpdateTemplate}
        onDeleteTemplate={lab.handleDeleteTemplate}
      />

      <LabOrderPrintModal
        labOrder={lab.printingItem}
        patient={patient}
        showCoverPage={lab.showCoverPage}
        onShowCoverPageChange={lab.setShowCoverPage}
        canEdit={canEdit}
        onEdit={lab.openEditModal}
        onClose={() => lab.setPrintingItem(null)}
      />

      <Dialog
        open={Boolean(lab.deleteTarget)}
        onOpenChange={(open) => {
          if (!open) lab.setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar Orden de Laboratorio</DialogTitle>
            <DialogDescription>
              ¿Confirma archivar la orden del{" "}
              <span className="font-mono">
                {formatPeruDateDisplay(lab.deleteTarget?.orderDate)}
              </span>{" "}
              (Dx:{" "}
              <strong className="text-foreground">
                {lab.deleteTarget?.diagnosis}
              </strong>
              )?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => lab.setDeleteTarget(null)}
              disabled={Boolean(lab.deletingId)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={lab.confirmDelete}
              disabled={Boolean(lab.deletingId)}
            >
              {lab.deletingId ? "Archivando..." : "Confirmar Archivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modales de Cotizaciones */}
      <QuoteModal
        open={cotiz.dialogOpen}
        onOpenChange={cotiz.setDialogOpen}
        patient={patient}
        editingItem={cotiz.editingItem}
        sourceLabel={cotiz.sourceLabel}
        form={cotiz.form}
        isSubmitting={cotiz.isSubmitting}
        consultations={consultations}
        watchedConsultationId={cotiz.watchedConsultationId}
        computedValidUntilDate={cotiz.computedValidUntilDate}
        validityOptions={cotiz.validityOptions}
        draftItems={cotiz.draftItems}
        financials={cotiz.financials}
        tariffSearch={cotiz.tariffSearch}
        onTariffSearchChange={cotiz.setTariffSearch}
        filteredTariffs={cotiz.filteredTariffs}
        customDraft={cotiz.customDraft}
        onCustomDraftChange={cotiz.setCustomDraft}
        onAddTariff={cotiz.addTariffItem}
        onAddCustom={cotiz.addCustomItem}
        onUpdateDiscount={cotiz.updateItemDiscount}
        onRemoveItem={cotiz.removeDraftItem}
        onSaveAndPrintIntent={cotiz.setSaveAndPrintIntent}
        onSubmit={cotiz.onSubmit}
      />

      <QuotePrintModal
        quote={cotiz.printingItem}
        patient={patient}
        showCoverPage={cotiz.showCoverPage}
        onShowCoverPageChange={cotiz.setShowCoverPage}
        canEdit={canEdit}
        onEdit={cotiz.openEditModal}
        onClose={() => cotiz.setPrintingItem(null)}
      />

      <Dialog
        open={Boolean(cotiz.deleteTarget)}
        onOpenChange={(open) => {
          if (!open) cotiz.setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar Presupuesto Médico</DialogTitle>
            <DialogDescription>
              ¿Confirma archivar el presupuesto del{" "}
              <span className="font-mono">
                {formatPeruDateDisplay(cotiz.deleteTarget?.quoteDate)}
              </span>{" "}
              por{" "}
              <strong className="text-foreground">
                {cotiz.deleteTarget ? formatCurrency(cotiz.deleteTarget.total) : ""}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => cotiz.setDeleteTarget(null)}
              disabled={Boolean(cotiz.deletingId)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={cotiz.confirmDelete}
              disabled={Boolean(cotiz.deletingId)}
            >
              {cotiz.deletingId ? "Archivando..." : "Confirmar Archivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
