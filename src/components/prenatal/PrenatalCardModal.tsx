"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Printer,
  RefreshCw,
} from "lucide-react";
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
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type { UltrasoundReportItem } from "@/features/ecografias/ecografias.schema";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import type {
  PrenatalModalTab,
  PrenatalVisitInputMode,
} from "@/features/prenatal/hooks/use-prenatal";
import type {
  MaternalPathologyItem,
  PrenatalBaselineData,
  PrenatalRiskReport,
  PrenatalVisitItem,
} from "@/features/prenatal/prenatal.schema";
import { cn, formatPeruDateDisplay } from "@/lib/utils";
import { PrenatalAroEditor } from "./PrenatalAroEditor";
import { PrenatalBaselineEditor } from "./PrenatalBaselineEditor";
import { PrenatalVisitEditor } from "./PrenatalVisitEditor";

interface PrenatalCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientDirectoryItem;
  activeTab: PrenatalModalTab;
  onActiveTabChange: (tab: PrenatalModalTab) => void;
  visitInputMode: PrenatalVisitInputMode;
  onVisitInputModeChange: (mode: PrenatalVisitInputMode) => void;
  activeVisitNumber: number;
  onSelectOrAddVisit: (visitNumber?: number) => void;
  onUpdateVisit: (
    visitNumber: number,
    patch: Partial<PrenatalVisitItem>
  ) => void;
  onRemoveVisit: (visitNumber: number) => void;
  clinicEstablishment: string;
  onClinicEstablishmentChange: (val: string) => void;
  baseline: PrenatalBaselineData;
  onBaselineChange: (next: PrenatalBaselineData) => void;
  visits: PrenatalVisitItem[];
  pathologies: MaternalPathologyItem[];
  onPathologiesChange: (next: MaternalPathologyItem[]) => void;
  syncFurToBackground: boolean;
  onSyncFurToBackgroundChange: (val: boolean) => void;
  currentGestationalAge: {
    weeks: number;
    days: number;
    totalDays: number;
    formatted: string;
    trimester: 1 | 2 | 3;
  };
  riskReport: PrenatalRiskReport;
  firstObstetricEcho: UltrasoundReportItem | null;
  latestObstetricEcho: UltrasoundReportItem | null;
  latestConsultation: MedicalConsultationItem | null;
  onSyncFromClinicalRecord: () => void;
  onImportConsultation: (
    cons: MedicalConsultationItem,
    visitNumber: number
  ) => void;
  onImportEcho: (echo: UltrasoundReportItem, visitNumber: number) => void;
  isSubmitting: boolean;
  onSave: (andPrint: boolean) => void;
}

export function PrenatalCardModal({
  open,
  onOpenChange,
  patient,
  activeTab,
  onActiveTabChange,
  visitInputMode,
  onVisitInputModeChange,
  activeVisitNumber,
  onSelectOrAddVisit,
  onUpdateVisit,
  onRemoveVisit,
  clinicEstablishment,
  onClinicEstablishmentChange,
  baseline,
  onBaselineChange,
  visits,
  pathologies,
  onPathologiesChange,
  syncFurToBackground,
  onSyncFurToBackgroundChange,
  currentGestationalAge,
  riskReport,
  firstObstetricEcho,
  latestObstetricEcho,
  latestConsultation,
  onSyncFromClinicalRecord,
  onImportConsultation,
  onImportEcho,
  isSubmitting,
  onSave,
}: PrenatalCardModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <DialogTitle>
                Carnet de Atención Materno Perinatal (MINSA / CLAP)
              </DialogTitle>
              <DialogDescription>
                Gestante: <strong>{patient.fullName}</strong> ({patient.age}{" "}
                años • {patient.documentType} {patient.documentNumber})
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSyncFromClinicalRecord}
            >
              <RefreshCw className="size-3.5 text-primary" />
              Sincronizar desde HC / Eco
            </Button>
          </div>
        </DialogHeader>

        {/* Barra de resumen obstétrico en tiempo real */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              <strong>FUM:</strong>{" "}
              {baseline.fum ? formatPeruDateDisplay(baseline.fum) : "—"}
            </span>
            <span>
              <strong>EG Hoy:</strong>{" "}
              <Badge variant="secondary" className="font-bold">
                {currentGestationalAge.formatted} (
                {currentGestationalAge.trimester}° Trimestre)
              </Badge>
            </span>
            <span>
              <strong>FPP Naegele:</strong>{" "}
              <strong className="text-primary">
                {baseline.fpp ? formatPeruDateDisplay(baseline.fpp) : "—"}
              </strong>
            </span>
          </div>

          <Badge
            variant={riskReport.isHighRisk ? "destructive" : "secondary"}
            className="text-xs font-bold"
          >
            {riskReport.riskCategory}
          </Badge>
        </div>

        {/* Selector de las 3 Pestañas Principales (Controles 1-9 es la Pestaña 1 Protagonista) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onActiveTabChange("controles")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all",
                activeTab === "controles"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              <Activity className="size-4" />
              <span>1. CONTROLES PRENATALES (ATENCIONES 1–9)</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                  activeTab === "controles"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary/10 text-primary"
                )}
              >
                {visits.length}/9
              </span>
            </button>

            <button
              type="button"
              onClick={() => onActiveTabChange("basal")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all",
                activeTab === "basal"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              <FileText className="size-4" />
              <span>2. FICHA BASAL & LABORATORIO (ANVERSO CARA 1)</span>
            </button>

            <button
              type="button"
              onClick={() => onActiveTabChange("aro")}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all",
                activeTab === "aro"
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              <AlertTriangle className="size-4" />
              <span>3. RIESGO ARO, PATOLOGÍAS CIE-10 & PLAN DE PARTO</span>
              {riskReport.warningFlags.length > 0 ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                    activeTab === "aro"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-amber-200 text-amber-950"
                  )}
                >
                  {riskReport.warningFlags.length}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Contenido de la pestaña seleccionada */}
        {activeTab === "controles" ? (
          <PrenatalVisitEditor
            baseline={baseline}
            visits={visits}
            activeVisitNumber={activeVisitNumber}
            onSelectOrAddVisit={onSelectOrAddVisit}
            onUpdateVisit={onUpdateVisit}
            onRemoveVisit={onRemoveVisit}
            inputMode={visitInputMode}
            onInputModeChange={onVisitInputModeChange}
            latestConsultation={latestConsultation}
            latestObstetricEcho={latestObstetricEcho}
            onImportConsultation={onImportConsultation}
            onImportEcho={onImportEcho}
          />
        ) : activeTab === "basal" ? (
          <PrenatalBaselineEditor
            patient={patient}
            baseline={baseline}
            onChange={onBaselineChange}
            clinicEstablishment={clinicEstablishment}
            onClinicEstablishmentChange={onClinicEstablishmentChange}
            firstObstetricEcho={firstObstetricEcho}
          />
        ) : (
          <PrenatalAroEditor
            baseline={baseline}
            onBaselineChange={onBaselineChange}
            pathologies={pathologies}
            onPathologiesChange={onPathologiesChange}
            riskReport={riskReport}
          />
        )}

        <DialogFooter className="flex flex-col items-stretch justify-between gap-3 border-t border-border pt-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={syncFurToBackground}
              onChange={(e) => onSyncFurToBackgroundChange(e.target.checked)}
              className="rounded"
            />
            <span>
              Sincronizar FUM ({baseline.fum || "—"}) con la FUR de Antecedentes
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onSave(false)}
            >
              <CheckCircle2 className="size-4 text-primary" />
              {isSubmitting ? "Guardando..." : "Guardar Carnet"}
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => onSave(true)}
            >
              <Printer className="size-4" />
              {isSubmitting
                ? "Guardando..."
                : "Guardar e Imprimir Carnet MINSA"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
