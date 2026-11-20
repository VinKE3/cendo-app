"use client";

import {
  Activity,
  AlertTriangle,
  Baby,
  Calendar,
  CheckCircle2,
  FlaskConical,
  Pencil,
  Pill,
  Plus,
  Printer,
  Scale,
  Shield,
  Trash2,
} from "lucide-react";
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
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type { UltrasoundReportItem } from "@/features/ecografias/ecografias.schema";
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import { usePrenatal } from "@/features/prenatal/hooks/use-prenatal";
import type { PrenatalCardItem } from "@/features/prenatal/prenatal.schema";
import { cn, formatPeruDateDisplay } from "@/lib/utils";
import { PrenatalCardModal } from "./PrenatalCardModal";
import { PrenatalPrintModal } from "./PrenatalPrintModal";

interface TabControlPrenatalProps {
  patient: PatientDirectoryItem;
  background?: PatientBackgroundItem | null;
  prenatalCard: PrenatalCardItem | null;
  onPrenatalCardChange: (next: PrenatalCardItem | null) => void;
  consultations: MedicalConsultationItem[];
  ultrasounds: UltrasoundReportItem[];
  canEdit?: boolean;
  canDelete?: boolean;
  onFurSynced?: (newFur: string) => void;
  onEmitPrenatalPrescription?: (card: PrenatalCardItem) => void;
  onEmitPrenatalLabOrder?: (card: PrenatalCardItem) => void;
}

export function TabControlPrenatal({
  patient,
  background,
  prenatalCard,
  onPrenatalCardChange,
  consultations,
  ultrasounds,
  canEdit = false,
  canDelete = false,
  onFurSynced,
  onEmitPrenatalPrescription,
  onEmitPrenatalLabOrder,
}: TabControlPrenatalProps) {
  const {
    modalOpen,
    setModalOpen,
    activeModalTab,
    setActiveModalTab,
    visitInputMode,
    setVisitInputMode,
    activeVisitNumber,
    isSubmitting,
    printingCard,
    setPrintingCard,
    showCoverPage,
    setShowCoverPage,
    deleteDialogOpen,
    setDeleteDialogOpen,
    isDeleting,
    clinicEstablishment,
    setClinicEstablishment,
    draftBaseline,
    setDraftBaseline,
    draftVisits,
    draftPathologies,
    setDraftPathologies,
    syncFurToBackground,
    setSyncFurToBackground,
    firstObstetricEcho,
    latestObstetricEcho,
    latestConsultation,
    currentGestationalAge,
    riskReport,
    openModal,
    handleAddOrSelectVisit,
    handleUpdateVisit,
    handleRemoveVisit,
    handleSyncFromClinicalRecord,
    handleImportVitalSignsFromConsultation,
    handleImportEchoIntoVisit,
    handleSaveCard,
    handleDeleteCard,
  } = usePrenatal({
    patient,
    background,
    initialCard: prenatalCard,
    onCardChange: onPrenatalCardChange,
    consultations,
    ultrasounds,
    onFurSynced,
  });

  const visits = prenatalCard?.visits ?? [];
  const baseline = prenatalCard?.baseline ?? draftBaseline;
  const totalPartos =
    (baseline.partosVaginales || 0) + (baseline.cesareas || 0);
  const lastVisit = visits.length > 0 ? visits[visits.length - 1] : null;
  const totalWeightGain =
    lastVisit && lastVisit.maternalWeightKg > 0 && baseline.usualWeightKg > 0
      ? Number(
          (lastVisit.maternalWeightKg - baseline.usualWeightKg).toFixed(1)
        )
      : null;

  return (
    <div className="space-y-5">
      {!prenatalCard ? (
        /* Estado vacío: Aperturar Carnet en 1 clic */
        <Card className="border border-border bg-card">
          <CardContent className="mx-auto max-w-2xl space-y-5 py-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Baby className="size-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-foreground">
                Carnet de Atención Materno Perinatal (MINSA / CLAP)
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Aperture el carnet perinatal oficial de 2 caras (Anverso Basal
                con los 13 antecedentes familiares, 27 personales y 3 trimestres
                de laboratorio + Reverso con la Matriz de 9 Atenciones
                Prenatales, Regla de Naegele y Cribado ARO).
              </p>
            </div>

            {canEdit ? (
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <Button
                  type="button"
                  onClick={() =>
                    openModal("controles", { autoCreateNextVisit: true })
                  }
                >
                  <Activity className="size-4" />+ Aperturar y Registrar 1.°
                  Control de Hoy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openModal("basal")}
                >
                  <Plus className="size-4" />
                  Aperturar desde Ficha Basal (Cara 1)
                </Button>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 border-t border-border pt-5 text-left text-xs sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  Formato Oficial 2 Caras
                </span>
                <p className="mt-0.5 font-bold text-foreground">
                  MINSA / CLAP NTS N° 105
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Impresión A4 completa con casillas normales y de alerta
                  visibles.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  Sin Doble Digitación
                </span>
                <p className="mt-0.5 font-bold text-foreground">
                  Sincronizado con HC & Eco
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Jala FUR, paridad, cesárea previa, signos vitales y ecografía
                  obstétrica.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  Laboratorio 3 Trimestres
                </span>
                <p className="mt-0.5 font-bold text-foreground">
                  3 Fechas Independientes
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Registro seriado 1°T, 2°T y 3°T para Hb, Glicemia, Sífilis,
                  VIH y Orina.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 1. Cabecera del Carnet Activo & Botones Protagonistas */}
          <Card className="border border-border bg-card">
            <CardContent className="pt-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex items-start gap-3.5">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Baby className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-foreground">
                        Carnet de Atención Materno Perinatal (MINSA / CLAP)
                      </h2>
                      <Badge variant="outline" className="text-xs">
                        No. HC: {baseline.hcNumber || patient.documentNumber}
                      </Badge>
                      <Badge
                        variant={
                          riskReport.isHighRisk ? "destructive" : "secondary"
                        }
                        className="text-xs font-bold"
                      >
                        {riskReport.riskCategory}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Establecimiento:{" "}
                      <strong className="text-foreground">
                        {prenatalCard.clinicEstablishment}
                      </strong>{" "}
                      • Especialista:{" "}
                      <strong className="text-foreground">
                        {prenatalCard.attendingDoctorName}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        openModal("controles", { autoCreateNextVisit: true })
                      }
                    >
                      <Activity className="size-4" />+ Registrar Control N°{" "}
                      {Math.min(9, visits.length + 1)}
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPrintingCard(prenatalCard)}
                  >
                    <Printer className="size-4 text-primary" />
                    Ver / Imprimir Carnet A4
                  </Button>

                  {canEdit ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openModal("basal")}
                    >
                      <Pencil className="size-3.5" />
                      Editar Ficha Basal / Lab
                    </Button>
                  ) : null}

                  {canEdit && onEmitPrenatalPrescription ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEmitPrenatalPrescription(prenatalCard)}
                    >
                      <Pill className="size-3.5 text-primary" />
                      Receta Prenatal
                    </Button>
                  ) : null}

                  {canEdit && onEmitPrenatalLabOrder ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEmitPrenatalLabOrder(prenatalCard)}
                    >
                      <FlaskConical className="size-3.5 text-primary" />
                      Orden Lab Prenatal
                    </Button>
                  ) : null}

                  {canDelete ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Tarjetas KPI de Seguimiento Longitudinal */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-border bg-card">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
                  <span>Edad Gestacional Hoy</span>
                  <Activity className="size-4 text-primary" />
                </div>
                <p className="mt-1 text-xl font-extrabold text-foreground">
                  {currentGestationalAge.formatted}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {currentGestationalAge.trimester}° Trimestre •{" "}
                  {currentGestationalAge.totalDays} días de amenorrea
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
                  <span>FPP (Regla Naegele)</span>
                  <Calendar className="size-4 text-primary" />
                </div>
                <p className="mt-1 text-xl font-extrabold text-primary">
                  {baseline.fpp ? formatPeruDateDisplay(baseline.fpp) : "—"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  FUM:{" "}
                  <strong>
                    {baseline.fum ? formatPeruDateDisplay(baseline.fum) : "—"}
                  </strong>{" "}
                  {baseline.fumDoubt ? "(Dudosa 🟨)" : "(Confiable)"}
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
                  <span>Peso & Paridad</span>
                  <Scale className="size-4 text-primary" />
                </div>
                <p className="mt-1 text-xl font-extrabold text-foreground">
                  G{baseline.gestas} P{totalPartos}
                  {baseline.abortos}
                  {baseline.nacidosVivos}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Peso habitual: <strong>{baseline.usualWeightKg} kg</strong>
                  {totalWeightGain !== null
                    ? ` (Δ ${totalWeightGain >= 0 ? `+${totalWeightGain}` : totalWeightGain} kg)`
                    : ""}
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
                  <span>Atenciones Prenatales</span>
                  <Shield className="size-4 text-primary" />
                </div>
                <p className="mt-1 text-xl font-extrabold text-foreground">
                  {visits.length} de 9
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(100, (visits.length / 9) * 100)}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 3. Alertas Perinatales Activas */}
          {riskReport.warningFlags.length > 0 ? (
            <div className="rounded-xl border border-amber-400/80 bg-amber-50/70 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-950 uppercase">
                  <AlertTriangle className="size-4 text-amber-700" />
                  Factores de Alerta y Seguimiento Activos (
                  {riskReport.warningFlags.length})
                </span>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => openModal("aro")}
                    className="text-xs font-bold text-amber-900 underline"
                  >
                    Gestionar Riesgo ARO & Patologías CIE-10
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {riskReport.warningFlags.map((flag, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold",
                      flag.severity === "continuous"
                        ? "border-red-400 bg-red-100 text-red-950"
                        : "border-amber-400 bg-white text-amber-950"
                    )}
                  >
                    <span>
                      {flag.severity === "continuous" ? "🟥" : "🟨"}
                    </span>
                    <span>{flag.label}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* 4. Matriz Interactiva de las 9 Atenciones Prenatales (Clic en cualquier columna para registrar o editar) */}
          <Card className="border border-border bg-card">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <CardTitle className="text-sm font-bold">
                  Matriz de las 9 Atenciones Prenatales (Reverso MINSA)
                </CardTitle>
                <CardDescription className="text-xs">
                  Haga clic sobre cualquier atención para editar sus datos o en
                  cualquier columna libre para registrar un nuevo control.
                </CardDescription>
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    openModal("controles", { autoCreateNextVisit: true })
                  }
                >
                  <Plus className="size-3.5" />+ Registrar Atención N°{" "}
                  {Math.min(9, visits.length + 1)}
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-bold text-muted-foreground uppercase">
                      <th className="py-2 pr-3">Atención</th>
                      <th className="px-2 py-2">Fecha</th>
                      <th className="px-2 py-2">Edad Gest.</th>
                      <th className="px-2 py-2">Peso (kg)</th>
                      <th className="px-2 py-2">P.A. (mmHg)</th>
                      <th className="px-2 py-2">Alt. Uterina</th>
                      <th className="px-2 py-2">Sit/Pres/Pos</th>
                      <th className="px-2 py-2">FCF (lpm)</th>
                      <th className="px-2 py-2">Mov. Fetal</th>
                      <th className="px-2 py-2">Fe / Ca</th>
                      <th className="px-2 py-2">Próx. Cita</th>
                      {canEdit ? (
                        <th className="py-2 pl-2 text-right">Acción</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
                      const v = visits.find((item) => item.visitNumber === num);
                      return (
                        <tr
                          key={num}
                          className={cn(
                            "transition-colors",
                            v ? "hover:bg-muted/30" : "bg-muted/10 text-muted-foreground"
                          )}
                        >
                          <td className="py-2 pr-3 font-bold text-foreground">
                            Atención {num}
                          </td>
                          {v ? (
                            <>
                              <td className="px-2 py-2 font-semibold">
                                {formatPeruDateDisplay(v.visitDate)}
                              </td>
                              <td className="px-2 py-2 font-bold text-primary">
                                {v.gestationalAgeWeeks}s {v.gestationalAgeDays}d
                              </td>
                              <td className="px-2 py-2">
                                {v.maternalWeightKg} kg
                              </td>
                              <td className="px-2 py-2 font-semibold">
                                {v.bloodPressure}
                              </td>
                              <td className="px-2 py-2">
                                {v.uterineHeightCm > 0
                                  ? `${v.uterineHeightCm} cm`
                                  : "NA"}
                              </td>
                              <td className="px-2 py-2">
                                {v.fetusSituation}/{v.fetusPresentation}/
                                {v.fetusPosition}
                              </td>
                              <td className="px-2 py-2 font-bold">
                                {v.fetalHeartRate > 0
                                  ? `${v.fetalHeartRate} lpm`
                                  : "NA"}
                              </td>
                              <td className="px-2 py-2">{v.fetalMovements}</td>
                              <td className="px-2 py-2">
                                {v.ironFolicAcidGiven ? "Fe✓" : "Fe—"}{" "}
                                {v.calciumGiven ? "Ca✓" : "Ca—"}
                              </td>
                              <td className="px-2 py-2 font-semibold text-primary">
                                {v.nextAppointmentDate
                                  ? formatPeruDateDisplay(v.nextAppointmentDate)
                                  : "—"}
                              </td>
                              {canEdit ? (
                                <td className="py-2 pl-2 text-right">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      openModal("controles", {
                                        targetVisitNumber: num,
                                      })
                                    }
                                  >
                                    <Pencil className="size-3.5" />
                                    Editar {num}°
                                  </Button>
                                </td>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <td
                                colSpan={10}
                                className="px-2 py-2 text-xs italic text-muted-foreground"
                              >
                                Sin registro aún en Atención {num}
                              </td>
                              {canEdit ? (
                                <td className="py-2 pl-2 text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-primary"
                                    onClick={() =>
                                      openModal("controles", {
                                        targetVisitNumber: num,
                                      })
                                    }
                                  >
                                    <Plus className="size-3.5" />
                                    Registrar {num}°
                                  </Button>
                                </td>
                              ) : null}
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 5. Resumen de Exámenes de Laboratorio por Trimestre (1°T, 2°T, 3°T) */}
          <Card className="border border-border bg-card">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <CardTitle className="text-sm font-bold">
                  Tamizaje de Laboratorio Prenatal (3 Trimestres con Fechas)
                </CardTitle>
                <CardDescription className="text-xs">
                  Seguimiento seriado de Hemoglobina, Glicemia, VDRL/Sífilis,
                  VIH, Orina y Urocultivo en 1°T, 2°T y 3°T.
                </CardDescription>
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openModal("basal")}
                >
                  <FlaskConical className="size-3.5 text-primary" />
                  Actualizar Laboratorios y Fechas
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 pt-4 text-xs sm:grid-cols-3">
              <div className="space-y-1 rounded-xl border border-border bg-muted/20 p-3">
                <span className="font-bold text-primary uppercase">
                  1° Trimestre (Basal)
                </span>
                <div>
                  Hemoglobina 1:{" "}
                  <strong>
                    {typeof baseline.hemoglobin1 === "number"
                      ? `${baseline.hemoglobin1} g/dL`
                      : "—"}
                  </strong>{" "}
                  ({baseline.hemoglobin1Date || "Sin fecha"})
                </div>
                <div>
                  Glicemia 1:{" "}
                  <strong>
                    {baseline.glucose1Result}
                    {typeof baseline.glucose1Value === "number"
                      ? ` (${baseline.glucose1Value} mg/dL)`
                      : ""}
                  </strong>{" "}
                  ({baseline.glucose1Date || "Sin fecha"})
                </div>
                <div>
                  VDRL 1 / VIH 1:{" "}
                  <strong>
                    {baseline.vdrlRpr1Result} / {baseline.hivRapid1Result}
                  </strong>
                </div>
                <div>
                  Orina 1 / Urocultivo 1:{" "}
                  <strong>
                    {baseline.completeUrineExamResult} /{" "}
                    {baseline.urineCultureResult}
                  </strong>
                </div>
              </div>

              <div className="space-y-1 rounded-xl border border-border bg-muted/20 p-3">
                <span className="font-bold text-primary uppercase">
                  2° Trimestre (Control)
                </span>
                <div>
                  Hemoglobina 2:{" "}
                  <strong>
                    {typeof baseline.hemoglobin2 === "number"
                      ? `${baseline.hemoglobin2} g/dL`
                      : "—"}
                  </strong>{" "}
                  ({baseline.hemoglobin2Date || "Sin fecha"})
                </div>
                <div>
                  Glicemia 2:{" "}
                  <strong>
                    {baseline.glucose2Result}
                    {typeof baseline.glucose2Value === "number"
                      ? ` (${baseline.glucose2Value} mg/dL)`
                      : ""}
                  </strong>{" "}
                  ({baseline.glucose2Date || "Sin fecha"})
                </div>
                <div>
                  VDRL 2 / VIH 2:{" "}
                  <strong>
                    {baseline.vdrlRpr2Result} / {baseline.hivRapid2Result}
                  </strong>
                </div>
                <div>
                  Orina 2 / Urocultivo 2:{" "}
                  <strong>
                    {baseline.completeUrineExam2Result} /{" "}
                    {baseline.urineCulture2Result}
                  </strong>
                </div>
              </div>

              <div className="space-y-1 rounded-xl border border-border bg-muted/20 p-3">
                <span className="font-bold text-primary uppercase">
                  3° Trimestre / Pre-Parto
                </span>
                <div>
                  Hemoglobina 3:{" "}
                  <strong>
                    {typeof baseline.hemoglobin3 === "number"
                      ? `${baseline.hemoglobin3} g/dL`
                      : "—"}
                  </strong>{" "}
                  ({baseline.hemoglobin3Date || "Sin fecha"})
                </div>
                <div>
                  Glicemia 3:{" "}
                  <strong>
                    {baseline.glucose3Result}
                    {typeof baseline.glucose3Value === "number"
                      ? ` (${baseline.glucose3Value} mg/dL)`
                      : ""}
                  </strong>{" "}
                  ({baseline.glucose3Date || "Sin fecha"})
                </div>
                <div>
                  VDRL 3 / VIH 3:{" "}
                  <strong>
                    {baseline.vdrlRpr3Result} / {baseline.hivRapid3Result}
                  </strong>
                </div>
                <div>
                  Orina 3 / Urocultivo 3:{" "}
                  <strong>
                    {baseline.completeUrineExam3Result} /{" "}
                    {baseline.urineCulture3Result}
                  </strong>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal de Edición del Carnet Prenatal */}
      <PrenatalCardModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        patient={patient}
        activeTab={activeModalTab}
        onActiveTabChange={setActiveModalTab}
        visitInputMode={visitInputMode}
        onVisitInputModeChange={setVisitInputMode}
        activeVisitNumber={activeVisitNumber}
        onSelectOrAddVisit={handleAddOrSelectVisit}
        onUpdateVisit={handleUpdateVisit}
        onRemoveVisit={handleRemoveVisit}
        clinicEstablishment={clinicEstablishment}
        onClinicEstablishmentChange={setClinicEstablishment}
        baseline={draftBaseline}
        onBaselineChange={setDraftBaseline}
        visits={draftVisits}
        pathologies={draftPathologies}
        onPathologiesChange={setDraftPathologies}
        syncFurToBackground={syncFurToBackground}
        onSyncFurToBackgroundChange={setSyncFurToBackground}
        currentGestationalAge={currentGestationalAge}
        riskReport={riskReport}
        firstObstetricEcho={firstObstetricEcho}
        latestObstetricEcho={latestObstetricEcho}
        latestConsultation={latestConsultation}
        onSyncFromClinicalRecord={handleSyncFromClinicalRecord}
        onImportConsultation={handleImportVitalSignsFromConsultation}
        onImportEcho={handleImportEchoIntoVisit}
        isSubmitting={isSubmitting}
        onSave={handleSaveCard}
      />

      {/* Modal de Impresión A4 (2 Caras: Anverso y Reverso) */}
      <PrenatalPrintModal
        card={printingCard}
        patient={patient}
        showCoverPage={showCoverPage}
        onShowCoverPageChange={setShowCoverPage}
        canEdit={canEdit}
        onEditBasal={() => openModal("basal")}
        onRegisterVisit={() =>
          openModal("controles", { autoCreateNextVisit: true })
        }
        onClose={() => setPrintingCard(null)}
      />

      {/* Diálogo de Confirmación para Eliminar Carnet */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Carnet de Control Prenatal</DialogTitle>
            <DialogDescription>
              ¿Está seguro de archivar el carnet prenatal de{" "}
              <strong>{patient.fullName}</strong>? Esta acción quedará
              registrada en auditoría clínica.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteCard}
            >
              <CheckCircle2 className="size-4" />
              {isDeleting ? "Eliminando..." : "Confirmar Eliminación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
