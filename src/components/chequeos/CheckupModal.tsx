"use client";

import { useState, type BaseSyntheticEvent } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  FileCheck2,
  FileDown,
  FileText,
  FlaskConical,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { PatientPdfDropzoneCard } from "@/components/chequeos/PatientPdfDropzoneCard";
import { Cie10Autocomplete } from "@/components/common/Cie10Autocomplete";
import {
  PatientBackgroundQuickPanel,
  ViewBackgroundButton,
} from "@/components/pacientes/PatientBackgroundQuickPanel";
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
import type { CheckupDossierItemRecord } from "@/db/schema/clinical";
import {
  CHECKUP_BIRADS_OPTIONS,
  CHECKUP_STATUS_LABELS,
  CHECKUP_STATUSES,
  type ClinicalCheckupItem,
  type CreateCheckupInput,
} from "@/features/chequeos/chequeos.schema";
import type { ColposcopyReportItem } from "@/features/colposcopia/colposcopia.schema";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type {
  PatientDocumentItem,
  PatientDocumentType,
} from "@/features/documentos/documentos.schema";
import {
  ULTRASOUND_TYPE_SHORT_LABELS,
  type UltrasoundReportItem,
} from "@/features/ecografias/ecografias.schema";
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import { cn, formatPeruDateDisplay } from "@/lib/utils";

interface CheckupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: ClinicalCheckupItem | null;
  patient: PatientDirectoryItem;
  background?: PatientBackgroundItem | null;
  ultrasounds: UltrasoundReportItem[];
  colposcopies: ColposcopyReportItem[];
  patientDocuments: PatientDocumentItem[];
  consultations: MedicalConsultationItem[];
  form: UseFormReturn<CreateCheckupInput>;
  watchedDossier: CreateCheckupInput["dossierConfig"] | undefined;
  watchedDiagnosis: string | undefined;
  watchedCie10: string | undefined;
  isSubmitting: boolean;
  isUploadingDocument: boolean;
  deletingDocId?: string | null;
  canDeleteDocuments?: boolean;
  onSyncStudies: () => void;
  onToggleDossierItem: (
    kind: CheckupDossierItemRecord["kind"],
    refId: string,
    label?: string
  ) => void;
  onMoveDossierItem: (index: number, delta: -1 | 1) => void;
  onAutoOrderDossier: () => void;
  onUploadPdf: (params: {
    file: File;
    documentType: PatientDocumentType;
    title: string;
    documentDate?: string;
    attachToDraftDossier?: boolean;
  }) => Promise<{ success: boolean; data?: PatientDocumentItem }>;
  onDeletePdf?: (documentId: string) => Promise<boolean>;
  onQuickCreateUltrasound: () => void;
  onQuickCreateColposcopy: () => void;
  onSetDownloadIntent: (value: boolean) => void;
  onSubmit: (e?: BaseSyntheticEvent) => void | Promise<void>;
}

const selectClassName =
  "flex h-9 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const kindBadgeMeta: Record<
  CheckupDossierItemRecord["kind"],
  { label: string; className: string }
> = {
  ULTRASOUND: {
    label: "ECO",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  COLPOSCOPY: {
    label: "COLPO",
    className: "border-success/30 bg-success/10 text-success",
  },
  DOCUMENT: {
    label: "PDF",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
};

export function CheckupModal({
  open,
  onOpenChange,
  editingItem,
  patient,
  background,
  ultrasounds,
  colposcopies,
  patientDocuments,
  consultations,
  form,
  watchedDossier,
  watchedDiagnosis,
  watchedCie10,
  isSubmitting,
  isUploadingDocument,
  deletingDocId,
  canDeleteDocuments = false,
  onSyncStudies,
  onToggleDossierItem,
  onMoveDossierItem,
  onAutoOrderDossier,
  onUploadPdf,
  onDeletePdf,
  onQuickCreateUltrasound,
  onQuickCreateColposcopy,
  onSetDownloadIntent,
  onSubmit,
}: CheckupModalProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  const [showBackground, setShowBackground] = useState(false);

  const dossierItems = watchedDossier?.items ?? [];
  const includeCoverPage = watchedDossier?.includeCoverPage ?? true;
  const includeSummarySheet = watchedDossier?.includeSummarySheet ?? false;
  const showDigitalSignature = watchedDossier?.showDigitalSignature ?? true;

  const isSelectedInDossier = (
    kind: CheckupDossierItemRecord["kind"],
    refId: string
  ) => dossierItems.some((item) => item.kind === kind && item.refId === refId);

  const selectedDocIds = dossierItems
    .filter((item) => item.kind === "DOCUMENT")
    .map((item) => item.refId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:pr-8">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2">
                <Layers className="size-5 text-primary" />
                {editingItem
                  ? "Editar Chequeo Ginecológico Integral"
                  : "Nuevo Chequeo Ginecológico Integral & Dossier PDF"}
              </DialogTitle>
              <DialogDescription>
                Paciente: <strong>{patient.fullName}</strong> •{" "}
                {patient.documentType} {patient.documentNumber} ({patient.age}{" "}
                años)
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ViewBackgroundButton
                open={showBackground}
                onToggle={() => setShowBackground((prev) => !prev)}
                background={background}
              />
            </div>
          </div>
        </DialogHeader>

        <PatientBackgroundQuickPanel
          open={showBackground}
          patient={patient}
          background={background}
          lastUltrasound={ultrasounds[0] ?? null}
          lastColposcopy={colposcopies[0] ?? null}
        />

        <form onSubmit={onSubmit} className="space-y-5">
          {/* BLOQUE 0: CABECERA CLÍNICA Y ESTADO */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/20 p-3.5 md:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Fecha de Chequeo <span className="text-destructive">*</span>
              </label>
              <Input type="date" {...register("checkupDate")} />
              {errors.checkupDate ? (
                <p className="text-[11px] text-destructive">
                  {errors.checkupDate.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-foreground">
                Estado del Chequeo <span className="text-destructive">*</span>
              </label>
              <select className={selectClassName} {...register("status")}>
                {CHECKUP_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {CHECKUP_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Consulta Asociada
              </label>
              <select
                className={selectClassName}
                {...register("consultationId")}
              >
                <option value="">Sin consulta vinculada</option>
                {consultations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatPeruDateDisplay(c.consultationDate)} •{" "}
                    {c.diagnosis.slice(0, 38)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 md:col-span-4">
              <label className="text-xs font-medium text-foreground">
                Motivo del Chequeo <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Ej. Chequeo ginecológico preventivo integral (Mama + Transvaginal + Colposcopía + PAP)"
                {...register("reasonForConsultation")}
              />
              {errors.reasonForConsultation ? (
                <p className="text-[11px] text-destructive">
                  {errors.reasonForConsultation.message}
                </p>
              ) : null}
            </div>
          </div>

          {/* BLOQUE 1: CONSTRUCTOR VISUAL DEL DOSSIER PDF */}
          <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase">
                  <Layers className="size-3.5" />
                  1. Constructor Visual del Dossier PDF Unificado
                </h3>
                <p className="text-xs text-muted-foreground">
                  Seleccione los informes CENDO existentes y adjunte placas
                  VINNO E35 o PDFs externos de BIOLAQ para unirlos en un solo
                  expediente PDF con carátula oficial.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onSyncStudies}
                >
                  <RefreshCw className="size-3.5" />
                  Sincronizar estudios
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onAutoOrderDossier}
                  disabled={dossierItems.length < 2}
                >
                  <Sparkles className="size-3.5" />
                  Auto-ordenar CENDO
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Columna Izquierda: Fuentes de Estudio */}
              <div className="space-y-3 lg:col-span-7">
                {/* Ecografías */}
                <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Activity className="size-3.5 text-primary" />
                      Informes Ecográficos ({ultrasounds.length})
                    </span>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={onQuickCreateUltrasound}
                    >
                      <Plus className="size-3" />
                      Nueva Eco
                    </Button>
                  </div>

                  {ultrasounds.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No hay informes ecográficos registrados para esta paciente.
                    </p>
                  ) : (
                    <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                      {ultrasounds.map((eco) => {
                        const checked = isSelectedInDossier(
                          "ULTRASOUND",
                          eco.id
                        );
                        return (
                          <label
                            key={eco.id}
                            className={cn(
                              "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2 text-xs transition-colors",
                              checked
                                ? "border-primary/40 bg-primary/5"
                                : "border-border bg-card hover:bg-muted/40"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                onToggleDossierItem("ULTRASOUND", eco.id)
                              }
                              className="mt-0.5 size-3.5 accent-primary"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-1">
                                <span className="font-semibold text-foreground">
                                  {ULTRASOUND_TYPE_SHORT_LABELS[
                                    eco.ultrasoundType
                                  ] || eco.ultrasoundType}
                                </span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {formatPeruDateDisplay(eco.reportDate)}
                                </span>
                              </div>
                              <p className="line-clamp-1 text-[11px] text-muted-foreground">
                                {eco.conclusion}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Colposcopías */}
                <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <FileCheck2 className="size-3.5 text-success" />
                      Evaluaciones Colposcópicas IFCPC ({colposcopies.length})
                    </span>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={onQuickCreateColposcopy}
                    >
                      <Plus className="size-3" />
                      Nueva Colpo
                    </Button>
                  </div>

                  {colposcopies.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No hay colposcopías registradas para esta paciente.
                    </p>
                  ) : (
                    <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
                      {colposcopies.map((colpo) => {
                        const checked = isSelectedInDossier(
                          "COLPOSCOPY",
                          colpo.id
                        );
                        return (
                          <label
                            key={colpo.id}
                            className={cn(
                              "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2 text-xs transition-colors",
                              checked
                                ? "border-success/40 bg-success/5"
                                : "border-border bg-card hover:bg-muted/40"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                onToggleDossierItem("COLPOSCOPY", colpo.id)
                              }
                              className="mt-0.5 size-3.5 accent-primary"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-1">
                                <span className="font-semibold text-foreground">
                                  Colposcopía Digital •{" "}
                                  {colpo.transformationZoneType}
                                </span>
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {formatPeruDateDisplay(colpo.reportDate)}
                                </span>
                              </div>
                              <p className="line-clamp-1 text-[11px] text-muted-foreground">
                                {colpo.diagnosis} ({colpo.cie10Code})
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* PDFs Externos (VINNO E35 / BIOLAQ) */}
                <PatientPdfDropzoneCard
                  compact
                  documents={patientDocuments}
                  isUploading={isUploadingDocument}
                  deletingDocId={deletingDocId}
                  canDelete={canDeleteDocuments}
                  selectedDocIds={selectedDocIds}
                  onToggleSelectDoc={(doc) =>
                    onToggleDossierItem(
                      "DOCUMENT",
                      doc.id,
                      `PDF: ${doc.title}`
                    )
                  }
                  onUploadPdf={onUploadPdf}
                  onDeletePdf={onDeletePdf}
                />
              </div>

              {/* Columna Derecha: Cola Ordenada & Opciones PDF */}
              <div className="flex flex-col justify-between space-y-3 rounded-lg border border-border bg-card p-3 lg:col-span-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Cola Ordenada del Dossier ({dossierItems.length})
                    </span>
                    <Badge variant="outline" className="font-mono text-[11px]">
                      Orden final PDF
                    </Badge>
                  </div>

                  {/* Opciones de Composición PDF */}
                  <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-2.5 text-xs">
                    <label className="flex cursor-pointer items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        Incluir Carátula Oficial CENDO (Pág. 1)
                      </span>
                      <input
                        type="checkbox"
                        checked={includeCoverPage}
                        onChange={(e) =>
                          setValue(
                            "dossierConfig.includeCoverPage",
                            e.target.checked,
                            { shouldDirty: true }
                          )
                        }
                        className="size-4 accent-primary"
                      />
                    </label>

                    {includeCoverPage ? (
                      <div className="space-y-1 pt-0.5">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Título Principal de Carátula
                        </label>
                        <Input
                          className="h-8 text-xs"
                          placeholder="CHEQUEO GINECOLÓGICO"
                          {...register("dossierConfig.coverTitle")}
                        />
                        {errors.dossierConfig?.coverTitle ? (
                          <p className="text-[11px] text-destructive">
                            {errors.dossierConfig.coverTitle.message}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <label className="flex cursor-pointer items-center justify-between gap-2 border-t border-border/60 pt-2">
                      <div>
                        <span className="font-medium text-foreground">
                          Incluir Hoja Resumen Clínica Ejecutiva
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Consolidado BI-RADS, PAP, VPH y Plan antes de los
                          estudios (opcional).
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={includeSummarySheet}
                        onChange={(e) =>
                          setValue(
                            "dossierConfig.includeSummarySheet",
                            e.target.checked,
                            { shouldDirty: true }
                          )
                        }
                        className="size-4 shrink-0 accent-primary"
                      />
                    </label>

                    <label className="flex cursor-pointer items-center justify-between gap-2 border-t border-border/60 pt-2">
                      <div>
                        <span className="font-medium text-foreground">
                          Estampar Firma Digital del Médico
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Desactive para imprimir con espacio libre para firma
                          y sello manual.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={showDigitalSignature}
                        onChange={(e) =>
                          setValue(
                            "dossierConfig.showDigitalSignature",
                            e.target.checked,
                            { shouldDirty: true }
                          )
                        }
                        className="size-4 shrink-0 accent-primary"
                      />
                    </label>
                  </div>

                  {/* Lista ordenada de piezas */}
                  {dossierItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      <FileText className="mx-auto mb-1.5 size-5 opacity-50" />
                      Marque ecografías, colposcopías o PDFs externos de la
                      izquierda, o pulse <strong>Sincronizar estudios</strong>.
                    </div>
                  ) : (
                    <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                      {dossierItems.map((item, idx) => {
                        const meta = kindBadgeMeta[item.kind];
                        return (
                          <div
                            key={`${item.kind}-${item.refId}`}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 py-2 text-xs"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-muted-foreground">
                                {idx + 1}.
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "shrink-0 px-1.5 py-0 text-[10px] font-semibold",
                                  meta.className
                                )}
                              >
                                {meta.label}
                              </Badge>
                              <span className="truncate font-medium text-foreground">
                                {item.label || item.refId}
                              </span>
                            </div>

                            <div className="flex shrink-0 items-center gap-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                disabled={idx === 0}
                                onClick={() => onMoveDossierItem(idx, -1)}
                                title="Subir en el Dossier"
                              >
                                <ArrowUp className="size-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                disabled={idx === dossierItems.length - 1}
                                onClick={() => onMoveDossierItem(idx, 1)}
                                title="Bajar en el Dossier"
                              >
                                <ArrowDown className="size-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() =>
                                  onToggleDossierItem(item.kind, item.refId)
                                }
                                title="Quitar del Dossier"
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="size-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Secuencia oficial CENDO: Carátula → Eco Mama → Placas Mama →
                  Eco TV → Placas TV → Colposcopía → Lab PAP → Lab VPH.
                </p>
              </div>
            </div>
          </div>

          {/* BLOQUE 2: RESUMEN CLÍNICO CONSOLIDADO DEL CHEQUEO */}
          <div className="space-y-4 rounded-xl border border-border bg-card p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase">
                <FlaskConical className="size-3.5 text-primary" />
                2. Resumen Clínico Consolidado (Fisiología, BI-RADS, PAP & VPH)
              </h3>
              <span className="text-[11px] text-muted-foreground">
                Los campos se autocompletan al usar Sincronizar estudios y son
                editables por el médico.
              </span>
            </div>

            {/* Sub-bloque Mamas + Transvaginal */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-2.5 rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold text-primary uppercase">
                  A. Ecografía de Mamas (BI-RADS)
                </p>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Categoría BI-RADS Final
                  </label>
                  <select
                    className={selectClassName}
                    {...register("breastUltrasoundBirads")}
                  >
                    {CHECKUP_BIRADS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Medición de Nódulos / Lesiones
                  </label>
                  <Input
                    placeholder="Ej. Nódulo sólido mama der. 10 x 6 mm / Sin lesiones focales"
                    {...register("breastLesionMeasurements")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Síntesis de Hallazgos Mamarios
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Resumen de ecografía mamaria bilateral..."
                    {...register("breastUltrasoundFindings")}
                  />
                </div>
              </div>

              <div className="space-y-2.5 rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold text-primary uppercase">
                  B. Ecografía Transvaginal / Pélvica
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">
                      Medidas Uterinas
                    </label>
                    <Input
                      placeholder="Ej. 74 x 42 x 48 mm"
                      {...register("uterusMeasurements")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">
                      Endometrio (mm)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Ej. 7.5"
                      {...register("endometriumThicknessMm", {
                        setValueAs: (v) =>
                          v === "" || v === null || v === undefined
                            ? null
                            : Number(v),
                      })}
                    />
                    {errors.endometriumThicknessMm ? (
                      <p className="text-[11px] text-destructive">
                        {errors.endometriumThicknessMm.message}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Ovarios y Anexos
                  </label>
                  <Input
                    placeholder="OD / OI de morfología y volumen conservados..."
                    {...register("ovariesFindings")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Síntesis Ecográfica Pélvica / TV
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Conclusión resumida de ecografía transvaginal/pélvica..."
                    {...register("transvaginalUltrasoundFindings")}
                  />
                </div>
              </div>
            </div>

            {/* Sub-bloque Colposcopía + PAP/VPH Externo */}
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/20 p-3 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-success uppercase">
                  C. Colposcopía Digital IFCPC
                </p>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Clasificación Colposcópica (Grado)
                  </label>
                  <Input
                    placeholder="Ej. Normal (Sin LIE) / Grado 1 (NIC I)"
                    {...register("colposcopyResult")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Hallazgos Colposcópicos Resumidos
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Resumen de evaluación colposcópica y test de Schiller..."
                    {...register("colposcopyFindings")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-warning uppercase">
                  D. Citología PAP & Test Molecular VPH (BIOLAQ)
                </p>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Resultado Papanicolaou (PAP)
                  </label>
                  <Input
                    placeholder="Ej. Negativo para lesión intraepitelial o malignidad (NILM)"
                    {...register("papResult")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Resultado VPH Alto Riesgo (COBAS / PCR)
                  </label>
                  <Input
                    placeholder="Ej. No detectado (Negativo 14 genotipos AR) / Pendiente"
                    {...register("vphResult")}
                  />
                </div>
              </div>
            </div>

            {/* Sub-bloque Diagnóstico CIE-10 y Plan */}
            <div className="space-y-3 border-t border-border pt-3">
              <Cie10Autocomplete
                diagnosis={watchedDiagnosis ?? ""}
                cie10Code={watchedCie10 ?? ""}
                required
                diagnosisError={errors.conclusions?.message}
                onChange={(diag, code) => {
                  setValue("conclusions", diag, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setValue("cie10Code", code, { shouldDirty: true });
                }}
              />

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Indicaciones / Plan Médico de Seguimiento
                </label>
                <Textarea
                  rows={3}
                  placeholder="Indicaciones integrales, periodicidad de controles y pautas de alarma..."
                  {...register("medicalPrescription")}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-3 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onSetDownloadIntent(false)}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Guardar Chequeo
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                onClick={() => onSetDownloadIntent(true)}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileDown className="size-4" />
                )}
                Guardar y Descargar Dossier PDF
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
