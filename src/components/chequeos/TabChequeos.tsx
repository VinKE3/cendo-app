"use client";

import { useState } from "react";
import {
  Activity,
  Camera,
  FileCheck2,
  FileDown,
  FileText,
  FlaskConical,
  Layers,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { CheckupModal } from "@/components/chequeos/CheckupModal";
import { CheckupPrintModal } from "@/components/chequeos/CheckupPrintModal";
import { ClinicalTemplatesManagerModal } from "@/components/chequeos/ClinicalTemplatesManagerModal";
import { PatientPdfDropzoneCard } from "@/components/chequeos/PatientPdfDropzoneCard";
import { ColposcopyModal } from "@/components/colposcopia/ColposcopyModal";
import { ColposcopyPrintModal } from "@/components/colposcopia/ColposcopyPrintModal";
import { TablePagination } from "@/components/common/TablePagination";
import { UltrasoundModal } from "@/components/ecografias/UltrasoundModal";
import { UltrasoundPrintModal } from "@/components/ecografias/UltrasoundPrintModal";
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
import type { ClinicalCheckupItem } from "@/features/chequeos/chequeos.schema";
import { useChequeos } from "@/features/chequeos/hooks/use-chequeos";
import type {
  ClinicalTemplateItem,
  ClinicalTemplateScope,
} from "@/features/clinical-templates/clinical-templates.schema";
import { useClinicalTemplates } from "@/features/clinical-templates/hooks/use-clinical-templates";
import {
  classifyColposcopyFindings,
  type ColposcopyReportItem,
} from "@/features/colposcopia/colposcopia.schema";
import { useColposcopia } from "@/features/colposcopia/hooks/use-colposcopia";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type { PatientDocumentItem } from "@/features/documentos/documentos.schema";
import {
  ULTRASOUND_TYPE_LABELS,
  ULTRASOUND_TYPE_SHORT_LABELS,
  type UltrasoundReportItem,
} from "@/features/ecografias/ecografias.schema";
import { useEcografias } from "@/features/ecografias/hooks/use-ecografias";
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import { cn, formatPeruDateDisplay } from "@/lib/utils";
import {
  generateCheckupWhatsAppUrl,
  generateColposcopyWhatsAppUrl,
  generateUltrasoundWhatsAppUrl,
} from "@/lib/whatsapp-share";

interface TabChequeosProps {
  patient: PatientDirectoryItem;
  background?: PatientBackgroundItem | null;
  ultrasounds: UltrasoundReportItem[];
  onUltrasoundsChange: (next: UltrasoundReportItem[]) => void;
  colposcopies: ColposcopyReportItem[];
  onColposcopiesChange: (next: ColposcopyReportItem[]) => void;
  checkups: ClinicalCheckupItem[];
  onCheckupsChange: (next: ClinicalCheckupItem[]) => void;
  patientDocuments: PatientDocumentItem[];
  onPatientDocumentsChange: (next: PatientDocumentItem[]) => void;
  initialClinicalTemplates: ClinicalTemplateItem[];
  consultations: MedicalConsultationItem[];
  canEdit: boolean;
  canDelete: boolean;
  onEmitBiopsyOrderFromColposcopy?: (colpo: ColposcopyReportItem) => void;
}

export function TabChequeos({
  patient,
  background,
  ultrasounds,
  onUltrasoundsChange,
  colposcopies,
  onColposcopiesChange,
  checkups,
  onCheckupsChange,
  patientDocuments,
  onPatientDocumentsChange,
  initialClinicalTemplates,
  consultations,
  canEdit,
  canDelete,
  onEmitBiopsyOrderFromColposcopy,
}: TabChequeosProps) {
  const [subTab, setSubTab] = useState<
    "ecografias" | "colposcopia" | "integral"
  >("ecografias");
  const [templatesManagerScope, setTemplatesManagerScope] =
    useState<ClinicalTemplateScope | null>(null);

  const templateStore = useClinicalTemplates(initialClinicalTemplates);

  const eco = useEcografias({
    patientId: patient.id,
    ultrasounds,
    onUltrasoundsChange,
    consultations,
    templates: templateStore.ultrasoundTemplates,
  });

  const colpo = useColposcopia({
    patientId: patient.id,
    colposcopies,
    onColposcopiesChange,
    consultations,
    templates: templateStore.colposcopyTemplates,
  });

  const cheq = useChequeos({
    patientId: patient.id,
    checkups,
    onCheckupsChange,
    patientDocuments,
    onPatientDocumentsChange,
    ultrasounds,
    colposcopies,
    consultations,
  });

  const lastUltrasound = ultrasounds[0] ?? null;
  const lastColposcopy = colposcopies[0] ?? null;

  const photosTotal =
    ultrasounds.reduce((acc, u) => acc + u.images.length, 0) +
    colposcopies.reduce((acc, c) => acc + c.images.length, 0);

  return (
    <div className="space-y-4">
      {/* KPI Resumen Rápido */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border bg-card">
          <CardContent className="flex items-center justify-between pt-4 pb-4">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                Ecografías Especializadas
              </p>
              <p className="mt-0.5 font-mono text-xl font-bold text-foreground">
                {eco.totalCount}
              </p>
            </div>
            <Activity className="size-5 text-primary" />
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardContent className="flex items-center justify-between pt-4 pb-4">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                Colposcopías IFCPC
              </p>
              <p className="mt-0.5 font-mono text-xl font-bold text-foreground">
                {colpo.totalCount}
              </p>
            </div>
            <FileCheck2 className="size-5 text-primary" />
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardContent className="flex items-center justify-between pt-4 pb-4">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                Capturas Clínicas Privadas
              </p>
              <p className="mt-0.5 font-mono text-xl font-bold text-foreground">
                {photosTotal}
              </p>
            </div>
            <Camera className="size-5 text-primary" />
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardContent className="flex items-center justify-between pt-4 pb-4">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                Chequeos & PDFs Externos
              </p>
              <p className="mt-0.5 font-mono text-xl font-bold text-foreground">
                {cheq.totalCount} / {patientDocuments.length}
              </p>
            </div>
            <Layers className="size-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      {/* Sub-Tabs a Ancho Completo */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-1.5">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setSubTab("ecografias")}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              subTab === "ecografias"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Activity className="size-3.5" />
            <span>Ecografías (IDEA / BI-RADS)</span>
            <span
              className={cn(
                "rounded px-1.5 font-mono text-[10px]",
                subTab === "ecografias"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {eco.totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("colposcopia")}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              subTab === "colposcopia"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <FileCheck2 className="size-3.5" />
            <span>Colposcopía Digital IFCPC</span>
            <span
              className={cn(
                "rounded px-1.5 font-mono text-[10px]",
                subTab === "colposcopia"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {colpo.totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("integral")}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              subTab === "integral"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Layers className="size-3.5" />
            <span>Chequeo Integral & Dossier PDF</span>
            <span
              className={cn(
                "rounded px-1.5 font-mono text-[10px]",
                subTab === "integral"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {cheq.totalCount}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pr-1">
          {canEdit && subTab === "ecografias" ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setTemplatesManagerScope("ULTRASOUND")}
              >
                <Settings className="size-3.5" />
                Plantillas
              </Button>
              <Button type="button" size="sm" onClick={eco.openCreateModal}>
                <Plus className="size-3.5" />
                Nueva Ecografía
              </Button>
            </>
          ) : null}

          {canEdit && subTab === "colposcopia" ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setTemplatesManagerScope("COLPOSCOPY")}
              >
                <Settings className="size-3.5" />
                Plantillas
              </Button>
              <Button type="button" size="sm" onClick={colpo.openCreateModal}>
                <Plus className="size-3.5" />
                Nueva Colposcopía
              </Button>
            </>
          ) : null}

          {canEdit && subTab === "integral" ? (
            <Button type="button" size="sm" onClick={cheq.openCreateModal}>
              <Plus className="size-3.5" />
              Nuevo Chequeo
            </Button>
          ) : null}
        </div>
      </div>

      {/* SUB-TAB 1: ECOGRAFÍAS */}
      {subTab === "ecografias" ? (
        <Card className="border border-border bg-card">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  Informes de Ecografía Especializada
                </CardTitle>
                <CardDescription>
                  Transvaginal con mapeo de endometriosis (IDEA), Mamaria
                  BI-RADS, Pélvica, Obstétrica y Doppler Color.
                </CardDescription>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={eco.search}
                  onChange={(e) => eco.setSearch(e.target.value)}
                  placeholder="Buscar por modalidad, BI-RADS, conclusión..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {eco.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  {eco.search
                    ? "No hay ecografías que coincidan con la búsqueda."
                    : "Aún no se han registrado estudios ecográficos para esta paciente."}
                </p>
                {canEdit && !eco.search ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={eco.openCreateModal}
                    className="mt-3"
                  >
                    <Plus className="size-3.5" />
                    Registrar Primera Ecografía
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-28">Fecha</TableHead>
                        <TableHead className="w-44">Modalidad</TableHead>
                        <TableHead>Conclusión / Parámetros Clave</TableHead>
                        <TableHead className="w-28 text-center">
                          Capturas
                        </TableHead>
                        <TableHead className="w-44">Especialista</TableHead>
                        <TableHead className="w-40 text-right">
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eco.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs font-semibold">
                            {formatPeruDateDisplay(item.reportDate)}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge
                                variant="outline"
                                className="font-mono text-[10.5px]"
                              >
                                {ULTRASOUND_TYPE_SHORT_LABELS[
                                  item.ultrasoundType
                                ] || item.ultrasoundType}
                              </Badge>
                              {item.findings.biradsCategory ? (
                                <Badge
                                  variant={
                                    item.findings.biradsCategory !==
                                      "BI-RADS 1" &&
                                    item.findings.biradsCategory !== "BI-RADS 2"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                  className="ml-1 font-mono text-[10px]"
                                >
                                  {item.findings.biradsCategory}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="line-clamp-2 text-xs font-semibold text-foreground">
                              {item.conclusion}
                            </p>
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                              {item.indication}
                              {typeof item.findings.endometriumThicknessMm ===
                              "number"
                                ? ` • Endometrio: ${item.findings.endometriumThicknessMm} mm`
                                : ""}
                              {item.findings.gestationalAgeByEcho
                                ? ` • EG: ${item.findings.gestationalAgeByEcho}`
                                : ""}
                              {typeof item.findings.nuchalTranslucencyMm ===
                              "number"
                                ? ` • TN: ${item.findings.nuchalTranslucencyMm} mm`
                                : ""}
                              {typeof item.findings.estimatedFetalWeightGr ===
                              "number"
                                ? ` • Ponderado: ${item.findings.estimatedFetalWeightGr} g`
                                : ""}
                              {item.findings.slidingSign
                                ? ` • Sliding: ${item.findings.slidingSign}`
                                : ""}
                            </p>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px]">
                              <Camera className="size-3 text-primary" />
                              {item.images.length}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <span className="block truncate font-medium text-foreground">
                              {item.doctorName}
                            </span>
                            <span className="font-mono text-[10px]">
                              CMP {item.doctorCmp}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                title="Compartir resumen por WhatsApp"
                                onClick={() => {
                                  const url = generateUltrasoundWhatsAppUrl({
                                    patientName: patient.fullName,
                                    patientPhone: patient.phone,
                                    reportDate: item.reportDate,
                                    doctorName: item.doctorName,
                                    doctorCmp: item.doctorCmp,
                                    ultrasoundTypeLabel:
                                      ULTRASOUND_TYPE_LABELS[
                                        item.ultrasoundType
                                      ] || item.ultrasoundType,
                                    indication: item.indication,
                                    conclusion: item.conclusion,
                                    recommendations: item.recommendations,
                                    biradsCategory:
                                      item.findings.biradsCategory,
                                  });
                                  window.open(
                                    url,
                                    "_blank",
                                    "noopener,noreferrer"
                                  );
                                }}
                              >
                                <MessageCircle className="size-3.5 text-success" />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                title="Vista Previa A4 / Imprimir PDF"
                                onClick={() => eco.setPrintingItem(item)}
                              >
                                <Printer className="size-3.5 text-primary" />
                              </Button>

                              {canEdit ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  title="Editar Ecografía"
                                  onClick={() => eco.openEditModal(item)}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              ) : null}

                              {canDelete ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  title="Eliminar Ecografía"
                                  onClick={() => eco.setDeleteTarget(item)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <TablePagination
                  currentPage={eco.pagination.currentPage}
                  totalItems={eco.filteredCount}
                  pageSize={eco.pagination.pageSize}
                  onPageChange={eco.pagination.setCurrentPage}
                  onPageSizeChange={eco.pagination.setPageSize}
                  itemLabel="ecografías"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* SUB-TAB 2: COLPOSCOPÍA DIGITAL IFCPC */}
      {subTab === "colposcopia" ? (
        <Card className="border border-border bg-card">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  Evaluaciones de Colposcopía Digital (IFCPC 2011)
                </CardTitle>
                <CardDescription>
                  Matriz IFCPC completa, mapa horario cervical interactivo,
                  galería fotográfica privada y emisión directa de biopsias.
                </CardDescription>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={colpo.search}
                  onChange={(e) => colpo.setSearch(e.target.value)}
                  placeholder="Buscar por diagnóstico, CIE-10, Schiller..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {colpo.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  {colpo.search
                    ? "No hay colposcopías que coincidan con la búsqueda."
                    : "Aún no se han registrado colposcopías digitales para esta paciente."}
                </p>
                {canEdit && !colpo.search ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={colpo.openCreateModal}
                    className="mt-3"
                  >
                    <Plus className="size-3.5" />
                    Registrar Primera Colposcopía
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-28">Fecha</TableHead>
                        <TableHead className="w-40">Grado IFCPC</TableHead>
                        <TableHead>Diagnóstico & Hallazgos</TableHead>
                        <TableHead className="w-36">Biopsia / Horas</TableHead>
                        <TableHead className="w-24 text-center">
                          Fotos
                        </TableHead>
                        <TableHead className="w-48 text-right">
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {colpo.items.map((item) => {
                        const cls = classifyColposcopyFindings({
                          thinAcetowhiteEpithelium:
                            item.thinAcetowhiteEpithelium,
                          irregularBorder: item.irregularBorder,
                          fineMosaic: item.fineMosaic,
                          finePunctation: item.finePunctation,
                          denseAcetowhiteEpithelium:
                            item.denseAcetowhiteEpithelium,
                          coarseMosaic: item.coarseMosaic,
                          coarsePunctation: item.coarsePunctation,
                          atypicalVessels: item.atypicalVessels,
                          extendedFindings: item.extendedFindings,
                        });

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-xs font-semibold">
                              {formatPeruDateDisplay(item.reportDate)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  cls.tone === "destructive"
                                    ? "destructive"
                                    : "outline"
                                }
                                className={cn(
                                  "font-mono text-[10px]",
                                  cls.tone === "warning"
                                    ? "border-warning/40 bg-warning/10 text-warning"
                                    : cls.tone === "normal"
                                      ? "border-success/40 bg-success/10 text-success"
                                      : ""
                                )}
                              >
                                {cls.grade.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-md">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                                  {item.cie10Code}
                                </span>
                                <span className="line-clamp-1 text-xs font-semibold text-foreground">
                                  {item.diagnosis}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {item.transformationZoneType} • ZSC{" "}
                                {item.squamocolumnarJunctionVisible} • Schiller:{" "}
                                {item.schillerTest}
                              </p>
                            </TableCell>
                            <TableCell>
                              {item.cervicalBiopsyTaken ? (
                                <div className="flex flex-wrap gap-1">
                                  {item.biopsyClockHours.length > 0 ? (
                                    item.biopsyClockHours.map((h) => (
                                      <span
                                        key={h}
                                        className="rounded border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-destructive"
                                      >
                                        {h}h
                                      </span>
                                    ))
                                  ) : (
                                    <Badge
                                      variant="destructive"
                                      className="text-[10px]"
                                    >
                                      Sí (Dirigida)
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Sin biopsia
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px]">
                                <Camera className="size-3 text-primary" />
                                {item.images.length}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center justify-end gap-1">
                                {canEdit &&
                                item.cervicalBiopsyTaken &&
                                onEmitBiopsyOrderFromColposcopy ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    title="Emitir Orden de Anatomía Patológica (Biopsia)"
                                    onClick={() =>
                                      onEmitBiopsyOrderFromColposcopy(item)
                                    }
                                  >
                                    <FlaskConical className="size-3.5 text-primary" />
                                  </Button>
                                ) : null}

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  title="Compartir por WhatsApp"
                                  onClick={() => {
                                    const url = generateColposcopyWhatsAppUrl({
                                      patientName: patient.fullName,
                                      patientPhone: patient.phone,
                                      reportDate: item.reportDate,
                                      doctorName: item.doctorName,
                                      doctorCmp: item.doctorCmp,
                                      classificationLabel: cls.label,
                                      transformationZoneType:
                                        item.transformationZoneType,
                                      schillerTest: item.schillerTest,
                                      cervicalBiopsyTaken:
                                        item.cervicalBiopsyTaken,
                                      biopsyClockHours: item.biopsyClockHours,
                                      diagnosis: item.diagnosis,
                                      cie10Code: item.cie10Code,
                                      planRecommendations:
                                        item.planRecommendations,
                                    });
                                    window.open(
                                      url,
                                      "_blank",
                                      "noopener,noreferrer"
                                    );
                                  }}
                                >
                                  <MessageCircle className="size-3.5 text-success" />
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  title="Vista Previa A4 / Imprimir PDF"
                                  onClick={() => colpo.setPrintingItem(item)}
                                >
                                  <Printer className="size-3.5 text-primary" />
                                </Button>

                                {canEdit ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    title="Editar Colposcopía"
                                    onClick={() => colpo.openEditModal(item)}
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                ) : null}

                                {canDelete ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    title="Eliminar Colposcopía"
                                    onClick={() => colpo.setDeleteTarget(item)}
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
                  currentPage={colpo.pagination.currentPage}
                  totalItems={colpo.filteredCount}
                  pageSize={colpo.pagination.pageSize}
                  onPageChange={colpo.pagination.setCurrentPage}
                  onPageSizeChange={colpo.pagination.setPageSize}
                  itemLabel="colposcopías"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* SUB-TAB 3: CHEQUEO INTEGRAL & DOSSIER PDF */}
      {subTab === "integral" ? (
        <div className="space-y-4">
          <Card className="border border-border bg-card">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="size-4 text-primary" />
                    Chequeo Ginecológico Preventivo Integral & Dossier PDF
                    Unificado
                  </CardTitle>
                  <CardDescription>
                    Consolida{" "}
                    <strong className="font-mono">{eco.totalCount}</strong>{" "}
                    ecografías,{" "}
                    <strong className="font-mono">{colpo.totalCount}</strong>{" "}
                    colposcopías y{" "}
                    <strong className="font-mono">
                      {patientDocuments.length}
                    </strong>{" "}
                    PDFs externos de {patient.fullName} en un expediente PDF con
                    carátula oficial.
                  </CardDescription>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    value={cheq.search}
                    onChange={(e) => cheq.setSearch(e.target.value)}
                    placeholder="Buscar diagnóstico, BI-RADS..."
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {cheq.filteredCount === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
                  <Layers className="mb-2 size-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-foreground">
                    {cheq.totalCount === 0
                      ? "Aún no hay chequeos integrales registrados."
                      : "Sin coincidencias para el filtro aplicado."}
                  </p>
                  <p className="mt-1 max-w-md text-xs text-muted-foreground">
                    Desde un Chequeo Integral el médico une las ecografías,
                    colposcopías y PDFs externos (BIOLAQ PAP/VPH y placas VINNO
                    E35) en un solo Dossier PDF.
                  </p>
                  {canEdit && cheq.totalCount === 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3"
                      onClick={cheq.openCreateModal}
                    >
                      <Plus className="size-3.5" />
                      Crear Primer Chequeo Integral
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
                            Fecha / Estado
                          </TableHead>
                          <TableHead className="text-xs">
                            Piezas del Dossier PDF
                          </TableHead>
                          <TableHead className="text-xs">
                            BI-RADS / PAP / VPH
                          </TableHead>
                          <TableHead className="text-xs">
                            Conclusión / CIE-10
                          </TableHead>
                          <TableHead className="text-right text-xs">
                            Acciones
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cheq.items.map((item) => {
                          const ecoCount = item.dossierConfig.items.filter(
                            (x) => x.kind === "ULTRASOUND"
                          ).length;
                          const colpoCount = item.dossierConfig.items.filter(
                            (x) => x.kind === "COLPOSCOPY"
                          ).length;
                          const docCount = item.dossierConfig.items.filter(
                            (x) => x.kind === "DOCUMENT"
                          ).length;
                          const isComplete = item.status === "COMPLETO";
                          const waUrl = generateCheckupWhatsAppUrl({
                            patientName: patient.fullName,
                            patientPhone: patient.phone,
                            checkupDate: item.checkupDate,
                            doctorName: item.doctorName,
                            doctorCmp: item.doctorCmp,
                            reasonForConsultation: item.reasonForConsultation,
                            breastBirads: item.breastUltrasoundBirads,
                            colposcopyResult: item.colposcopyResult,
                            papResult: item.papResult,
                            vphResult: item.vphResult,
                            conclusions: item.conclusions,
                            cie10Code: item.cie10Code,
                            medicalPrescription: item.medicalPrescription,
                            dossierItemsCount: item.dossierConfig.items.length,
                          });

                          return (
                            <TableRow key={item.id}>
                              <TableCell className="align-top text-xs">
                                <div className="font-mono font-semibold text-foreground">
                                  {formatPeruDateDisplay(item.checkupDate)}
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "mt-1 text-[10px]",
                                    isComplete
                                      ? "border-success/40 bg-success/10 text-success"
                                      : "border-warning/40 bg-warning/10 text-warning"
                                  )}
                                >
                                  {isComplete ? "COMPLETO" : "EN PROCESO"}
                                </Badge>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {item.doctorName}
                                </p>
                              </TableCell>

                              <TableCell className="align-top text-xs">
                                <div className="flex flex-wrap gap-1">
                                  <Badge
                                    variant="outline"
                                    className="border-primary/30 bg-primary/10 font-mono text-[10px] text-primary"
                                  >
                                    Eco: {ecoCount}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="border-success/30 bg-success/10 font-mono text-[10px] text-success"
                                  >
                                    Colpo: {colpoCount}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="border-warning/30 bg-warning/10 font-mono text-[10px] text-warning"
                                  >
                                    PDFs: {docCount}
                                  </Badge>
                                </div>
                                <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                                  {item.dossierConfig.items.length > 0
                                    ? `${item.dossierConfig.items.length} pieza(s) enlazada(s)`
                                    : "Solo hoja clínica (sin anexos)"}
                                </p>
                              </TableCell>

                              <TableCell className="align-top text-xs">
                                <p className="font-medium text-foreground">
                                  {item.breastUltrasoundBirads || "—"}
                                </p>
                                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                                  PAP: {item.papResult || "Pendiente"}
                                </p>
                                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                                  VPH: {item.vphResult || "Pendiente"}
                                </p>
                              </TableCell>

                              <TableCell className="max-w-xs align-top text-xs">
                                <p className="line-clamp-2 font-medium text-foreground">
                                  {item.conclusions}
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

                              <TableCell className="text-right align-top">
                                <div className="inline-flex items-center justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="xs"
                                    title="Descargar Dossier PDF Unificado"
                                    onClick={() =>
                                      cheq.triggerDownloadDossier(item.id, {
                                        sig: item.dossierConfig
                                          .showDigitalSignature,
                                        cover:
                                          item.dossierConfig.includeCoverPage,
                                        summary:
                                          item.dossierConfig
                                            .includeSummarySheet,
                                      })
                                    }
                                  >
                                    <FileDown className="size-3.5 text-primary" />
                                    <span className="hidden xl:inline">
                                      Dossier PDF
                                    </span>
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    title="Vista Previa Completa / Imprimir Chequeo"
                                    onClick={() => {
                                      cheq.setShowCoverPage(
                                        item.dossierConfig.includeCoverPage
                                      );
                                      cheq.setPrintingItem(item);
                                    }}
                                  >
                                    <Printer className="size-3.5" />
                                  </Button>

                                  {waUrl ? (
                                    <a
                                      href={waUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Enviar resumen por WhatsApp"
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
                                      title="Editar Chequeo y Dossier"
                                      onClick={() => cheq.openEditModal(item)}
                                    >
                                      <Pencil className="size-3.5" />
                                    </Button>
                                  ) : null}

                                  {canDelete ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-xs"
                                      title="Archivar Chequeo"
                                      onClick={() =>
                                        cheq.setDeleteTarget(item)
                                      }
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
                    currentPage={cheq.pagination.currentPage}
                    totalItems={cheq.filteredCount}
                    pageSize={cheq.pagination.pageSize}
                    onPageChange={cheq.pagination.setCurrentPage}
                    onPageSizeChange={cheq.pagination.setPageSize}
                    itemLabel="chequeos integrales"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Repositorio de PDFs Externos accesible también por Asistente */}
          <Card className="border border-border bg-card">
            <CardHeader className="border-b border-border pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="size-4 text-warning" />
                    Placas Ecográficas (VINNO E35) & Resultados Lab Externos
                    (BIOLAQ PAP / VPH)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tanto el equipo médico como la asistente pueden cargar PDFs
                    externos al Storage privado de la paciente para luego
                    unirlos dentro de cualquier Chequeo Integral.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {patientDocuments.length} PDF(s)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <PatientPdfDropzoneCard
                documents={patientDocuments}
                isUploading={cheq.isUploadingDocument}
                deletingDocId={cheq.deletingDocId}
                canDelete={canEdit}
                onUploadPdf={(params) =>
                  cheq.uploadExternalPdf({
                    ...params,
                    attachToDraftDossier: false,
                  })
                }
                onDeletePdf={cheq.deleteExternalPdf}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* MODALES ECOGRAFÍA */}
      <UltrasoundModal
        open={eco.dialogOpen}
        onOpenChange={eco.onDialogOpenChange}
        patient={patient}
        background={background}
        lastUltrasound={lastUltrasound}
        lastColposcopy={lastColposcopy}
        editingItem={eco.editingItem}
        form={eco.form}
        isSubmitting={eco.isSubmitting}
        isUploadingImages={eco.isUploadingImages}
        draftImages={eco.draftImages}
        consultations={consultations}
        watchedUltrasoundType={eco.watchedUltrasoundType}
        watchedBirads={eco.watchedBirads}
        watchedEndometrium={eco.watchedEndometrium}
        watchedVolume={eco.watchedVolume}
        watchedRightOvaryVolume={eco.watchedRightOvaryVolume}
        watchedLeftOvaryVolume={eco.watchedLeftOvaryVolume}
        watchedBreastLesions={eco.watchedBreastLesions}
        watchedIncludeDoppler={eco.watchedIncludeDoppler}
        bppTotal={eco.bppTotal}
        templates={templateStore.ultrasoundTemplates}
        canEditTemplates={canEdit}
        isSavingTemplate={templateStore.isMutating}
        typeOptions={eco.typeOptions}
        uterusPositions={eco.uterusPositions}
        endometriumPatterns={eco.endometriumPatterns}
        slidingSignOptions={eco.slidingSignOptions}
        biradsOptions={eco.biradsOptions}
        breastAcrTypes={eco.breastAcrTypes}
        breastAcrLabels={eco.breastAcrLabels}
        breastLesionTypes={eco.breastLesionTypes}
        onApplyTemplate={eco.applyTemplate}
        onBuildTemplatePayload={eco.buildTemplatePayloadFromForm}
        onSaveAsTemplate={async (name, description, payload) => {
          const res = await templateStore.createTemplate({
            scope: "ULTRASOUND",
            subType: payload.ultrasoundType,
            name,
            description: description || null,
            payload,
          });
          return res.success;
        }}
        onOpenTemplatesManager={() => setTemplatesManagerScope("ULTRASOUND")}
        onAutoCalculateVolume={eco.autoCalculateVolume}
        onAutoCalculateOvaryVolume={eco.autoCalculateOvaryVolume}
        onAutoCalculateHadlock={eco.autoCalculateHadlockEfw}
        onAutoCalculateDoppler={eco.autoCalculateDopplerIndices}
        onAddBreastLesion={eco.addBreastLesion}
        onUpdateBreastLesion={eco.updateBreastLesion}
        onRemoveBreastLesion={eco.removeBreastLesion}
        onFillStandardBreastComplement={eco.fillStandardBreastComplement}
        onUploadFiles={eco.handleUploadFiles}
        onUpdateImageCaption={eco.updateDraftImageCaption}
        onRemoveImage={eco.removeDraftImage}
        onSaveAndPrintIntent={eco.setSaveAndPrintIntent}
        onSubmit={eco.onSubmit}
      />

      <UltrasoundPrintModal
        report={eco.printingItem}
        patient={patient}
        showCoverPage={eco.showCoverPage}
        onShowCoverPageChange={eco.setShowCoverPage}
        canEdit={canEdit}
        onEdit={eco.openEditModal}
        onClose={() => eco.setPrintingItem(null)}
      />

      <Dialog
        open={Boolean(eco.deleteTarget)}
        onOpenChange={(open) => {
          if (!open) eco.setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Archivar Informe Ecográfico?</DialogTitle>
            <DialogDescription>
              Se archivará el estudio del{" "}
              <strong>
                {eco.deleteTarget
                  ? formatPeruDateDisplay(eco.deleteTarget.reportDate)
                  : ""}
              </strong>
              . Las capturas privadas asociadas se conservan por trazabilidad
              médico-legal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => eco.setDeleteTarget(null)}
              disabled={Boolean(eco.deletingId)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void eco.confirmDelete()}
              disabled={Boolean(eco.deletingId)}
            >
              {eco.deletingId ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Sí, Archivar Ecografía
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODALES COLPOSCOPÍA */}
      <ColposcopyModal
        open={colpo.dialogOpen}
        onOpenChange={colpo.onDialogOpenChange}
        patient={patient}
        background={background}
        lastUltrasound={lastUltrasound}
        lastColposcopy={lastColposcopy}
        editingItem={colpo.editingItem}
        form={colpo.form}
        isSubmitting={colpo.isSubmitting}
        isUploadingImages={colpo.isUploadingImages}
        draftImages={colpo.draftImages}
        consultations={consultations}
        watchedValues={colpo.watchedValues}
        classification={colpo.classification}
        templates={templateStore.colposcopyTemplates}
        canEditTemplates={canEdit}
        isSavingTemplate={templateStore.isMutating}
        scjOptions={colpo.scjOptions}
        tzOptions={colpo.tzOptions}
        schillerOptions={colpo.schillerOptions}
        captionPresets={colpo.captionPresets}
        onToggleClockHours={colpo.handleToggleClockHours}
        onToggleBiopsyTaken={colpo.handleToggleBiopsyTaken}
        onApplyClassificationSuggestion={colpo.applyClassificationSuggestion}
        onApplyTemplate={colpo.applyTemplate}
        onApplyNormalDefaults={colpo.applyNormalDefaults}
        onBuildTemplatePayload={colpo.buildTemplatePayloadFromForm}
        onSaveAsTemplate={async (name, description, payload) => {
          const res = await templateStore.createTemplate({
            scope: "COLPOSCOPY",
            subType: "CUSTOM",
            name,
            description: description || null,
            payload,
          });
          return res.success;
        }}
        onOpenTemplatesManager={() => setTemplatesManagerScope("COLPOSCOPY")}
        onUploadFiles={colpo.handleUploadFiles}
        onUpdateImageCaption={colpo.updateDraftImageCaption}
        onRemoveImage={colpo.removeDraftImage}
        onSaveAndPrintIntent={colpo.setSaveAndPrintIntent}
        onSubmit={colpo.onSubmit}
      />

      <ColposcopyPrintModal
        report={colpo.printingItem}
        patient={patient}
        background={background}
        showCoverPage={colpo.showCoverPage}
        onShowCoverPageChange={colpo.setShowCoverPage}
        canEdit={canEdit}
        onEdit={colpo.openEditModal}
        onEmitBiopsyOrder={onEmitBiopsyOrderFromColposcopy}
        onClose={() => colpo.setPrintingItem(null)}
      />

      <Dialog
        open={Boolean(colpo.deleteTarget)}
        onOpenChange={(open) => {
          if (!open) colpo.setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Archivar Evaluación Colposcópica?</DialogTitle>
            <DialogDescription>
              Se archivará el informe IFCPC del{" "}
              <strong>
                {colpo.deleteTarget
                  ? formatPeruDateDisplay(colpo.deleteTarget.reportDate)
                  : ""}
              </strong>
              . Las fotografías colposcópicas privadas se conservan en auditoría
              clínica.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => colpo.setDeleteTarget(null)}
              disabled={Boolean(colpo.deletingId)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void colpo.confirmDelete()}
              disabled={Boolean(colpo.deletingId)}
            >
              {colpo.deletingId ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Sí, Archivar Colposcopía
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CheckupModal
        open={cheq.dialogOpen}
        onOpenChange={cheq.setDialogOpen}
        editingItem={cheq.editingItem}
        patient={patient}
        background={background}
        ultrasounds={ultrasounds}
        colposcopies={colposcopies}
        patientDocuments={patientDocuments}
        consultations={consultations}
        form={cheq.form}
        watchedDossier={cheq.watchedDossier}
        watchedDiagnosis={cheq.watchedDiagnosis}
        watchedCie10={cheq.watchedCie10}
        isSubmitting={cheq.isSubmitting}
        isUploadingDocument={cheq.isUploadingDocument}
        deletingDocId={cheq.deletingDocId}
        canDeleteDocuments={canEdit}
        onSyncStudies={() => cheq.syncFromStudiesAndDocuments()}
        onToggleDossierItem={cheq.toggleDossierItem}
        onMoveDossierItem={cheq.moveDossierItem}
        onAutoOrderDossier={cheq.handleAutoOrderDossier}
        onUploadPdf={cheq.uploadExternalPdf}
        onDeletePdf={cheq.deleteExternalPdf}
        onQuickCreateUltrasound={() => {
          cheq.setDialogOpen(false);
          setSubTab("ecografias");
          eco.openCreateModal();
        }}
        onQuickCreateColposcopy={() => {
          cheq.setDialogOpen(false);
          setSubTab("colposcopia");
          colpo.openCreateModal();
        }}
        onSetDownloadIntent={cheq.setDownloadAfterSaveIntent}
        onSubmit={cheq.onSubmit}
      />

      <CheckupPrintModal
        checkup={cheq.printingItem}
        patient={patient}
        background={background}
        ultrasounds={ultrasounds}
        colposcopies={colposcopies}
        patientDocuments={patientDocuments}
        showCoverPage={cheq.showCoverPage}
        onShowCoverPageChange={cheq.setShowCoverPage}
        canEdit={canEdit}
        onEdit={cheq.openEditModal}
        onDownloadDossier={cheq.triggerDownloadDossier}
        onClose={() => cheq.setPrintingItem(null)}
      />

      <Dialog
        open={Boolean(cheq.deleteTarget)}
        onOpenChange={(open) => {
          if (!open) cheq.setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Archivar Chequeo Ginecológico Integral?</DialogTitle>
            <DialogDescription>
              Se archivará el chequeo del{" "}
              <strong>
                {cheq.deleteTarget
                  ? formatPeruDateDisplay(cheq.deleteTarget.checkupDate)
                  : ""}
              </strong>
              . Las ecografías, colposcopías y documentos PDF externos
              enlazados se mantienen intactos en la historia clínica.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => cheq.setDeleteTarget(null)}
              disabled={Boolean(cheq.deletingId)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void cheq.confirmDelete()}
              disabled={Boolean(cheq.deletingId)}
            >
              {cheq.deletingId ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Sí, Archivar Chequeo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClinicalTemplatesManagerModal
        open={Boolean(templatesManagerScope)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setTemplatesManagerScope(null);
        }}
        scope={templatesManagerScope ?? "ULTRASOUND"}
        templates={
          templatesManagerScope === "COLPOSCOPY"
            ? templateStore.colposcopyTemplates
            : templateStore.ultrasoundTemplates
        }
        canDeleteOfficial={canDelete}
        isMutating={templateStore.isMutating}
        onApplyTemplate={
          (templatesManagerScope === "ULTRASOUND" && eco.dialogOpen) ||
          (templatesManagerScope === "COLPOSCOPY" && colpo.dialogOpen)
              ? (tmpl) => {
                  if (tmpl.scope === "ULTRASOUND") {
                    eco.applyTemplate(tmpl);
                  } else if (tmpl.scope === "COLPOSCOPY") {
                    colpo.applyTemplate(tmpl);
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
