"use client";

import { useState } from "react";
import {
  Activity,
  Camera,
  FileCheck2,
  FlaskConical,
  Layers,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
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
import {
  classifyColposcopyFindings,
  type ColposcopyReportItem,
} from "@/features/colposcopia/colposcopia.schema";
import { useColposcopia } from "@/features/colposcopia/hooks/use-colposcopia";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import {
  ULTRASOUND_TYPE_LABELS,
  ULTRASOUND_TYPE_SHORT_LABELS,
  type UltrasoundReportItem,
} from "@/features/ecografias/ecografias.schema";
import { useEcografias } from "@/features/ecografias/hooks/use-ecografias";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import { cn, formatPeruDateDisplay } from "@/lib/utils";
import {
  generateColposcopyWhatsAppUrl,
  generateUltrasoundWhatsAppUrl,
} from "@/lib/whatsapp-share";

interface TabChequeosProps {
  patient: PatientDirectoryItem;
  ultrasounds: UltrasoundReportItem[];
  onUltrasoundsChange: (next: UltrasoundReportItem[]) => void;
  colposcopies: ColposcopyReportItem[];
  onColposcopiesChange: (next: ColposcopyReportItem[]) => void;
  consultations: MedicalConsultationItem[];
  checkupsCount: number;
  canEdit: boolean;
  canDelete: boolean;
  onEmitBiopsyOrderFromColposcopy?: (colpo: ColposcopyReportItem) => void;
}

export function TabChequeos({
  patient,
  ultrasounds,
  onUltrasoundsChange,
  colposcopies,
  onColposcopiesChange,
  consultations,
  checkupsCount,
  canEdit,
  canDelete,
  onEmitBiopsyOrderFromColposcopy,
}: TabChequeosProps) {
  const [subTab, setSubTab] = useState<
    "ecografias" | "colposcopia" | "integral"
  >("ecografias");

  const eco = useEcografias({
    patientId: patient.id,
    ultrasounds,
    onUltrasoundsChange,
    consultations,
  });

  const colpo = useColposcopia({
    patientId: patient.id,
    colposcopies,
    onColposcopiesChange,
    consultations,
  });

  const photosTotal =
    ultrasounds.reduce((acc, u) => acc + u.images.length, 0) +
    colposcopies.reduce((acc, c) => acc + c.images.length, 0);

  return (
    <div className="space-y-4">
      {/* KPI Resumen Rápido */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
              {checkupsCount}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 pr-1">
          {canEdit && subTab === "ecografias" ? (
            <Button type="button" size="sm" onClick={eco.openCreateModal}>
              <Plus className="size-3.5" />
              Nueva Ecografía
            </Button>
          ) : null}

          {canEdit && subTab === "colposcopia" ? (
            <Button type="button" size="sm" onClick={colpo.openCreateModal}>
              <Plus className="size-3.5" />
              Nueva Colposcopía
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

      {/* SUB-TAB 3: CHEQUEO INTEGRAL & DOSSIER PDF (LISTO PARA ETAPA 4B) */}
      {subTab === "integral" ? (
        <Card className="border border-border bg-card">
          <CardHeader className="border-b border-border">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="size-4 text-primary" />
                Chequeo Ginecológico Preventivo Integral & Dossier PDF Unificado
              </CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                Etapa 4B en integración
              </Badge>
            </div>
            <CardDescription>
              Consolidará los{" "}
              <strong className="font-mono">{eco.totalCount}</strong> informes
              ecográficos y{" "}
              <strong className="font-mono">{colpo.totalCount}</strong>{" "}
              colposcopías registradas de {patient.fullName} junto a citología
              PAP/VPH y anexos PDF externos mediante <code>pdf-lib</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 text-sm text-muted-foreground">
            Actualmente esta ficha cuenta con{" "}
            <span className="font-mono font-semibold text-foreground">
              {checkupsCount}
            </span>{" "}
            chequeo(s) integral(es) históricos en PostgreSQL. Se habilitará en
            la Etapa 4B inmediata tras completar esta fase.
          </CardContent>
        </Card>
      ) : null}

      {/* MODALES ECOGRAFÍA */}
      <UltrasoundModal
        open={eco.dialogOpen}
        onOpenChange={eco.onDialogOpenChange}
        patient={patient}
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
        presets={eco.presets}
        typeOptions={eco.typeOptions}
        uterusPositions={eco.uterusPositions}
        endometriumPatterns={eco.endometriumPatterns}
        slidingSignOptions={eco.slidingSignOptions}
        biradsOptions={eco.biradsOptions}
        onApplyPreset={eco.applyPreset}
        onAutoCalculateVolume={eco.autoCalculateVolume}
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
        editingItem={colpo.editingItem}
        form={colpo.form}
        isSubmitting={colpo.isSubmitting}
        isUploadingImages={colpo.isUploadingImages}
        draftImages={colpo.draftImages}
        consultations={consultations}
        watchedValues={colpo.watchedValues}
        classification={colpo.classification}
        scjOptions={colpo.scjOptions}
        tzOptions={colpo.tzOptions}
        schillerOptions={colpo.schillerOptions}
        captionPresets={colpo.captionPresets}
        onToggleClockHours={colpo.handleToggleClockHours}
        onToggleBiopsyTaken={colpo.handleToggleBiopsyTaken}
        onApplyClassificationSuggestion={colpo.applyClassificationSuggestion}
        onUploadFiles={colpo.handleUploadFiles}
        onUpdateImageCaption={colpo.updateDraftImageCaption}
        onRemoveImage={colpo.removeDraftImage}
        onSaveAndPrintIntent={colpo.setSaveAndPrintIntent}
        onSubmit={colpo.onSubmit}
      />

      <ColposcopyPrintModal
        report={colpo.printingItem}
        patient={patient}
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
    </div>
  );
}
