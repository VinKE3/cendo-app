"use client";

import {
  AlertTriangle,
  Check,
  Columns,
  FileSpreadsheet,
  HeartPulse,
  Plus,
  Sparkles,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type { UltrasoundReportItem } from "@/features/ecografias/ecografias.schema";
import type { PrenatalVisitInputMode } from "@/features/prenatal/hooks/use-prenatal";
import {
  calculateGestationalAge,
  type PrenatalBaselineData,
  type PrenatalVisitItem,
} from "@/features/prenatal/prenatal.schema";
import { cn, formatPeruDateDisplay } from "@/lib/utils";

interface PrenatalVisitEditorProps {
  baseline: PrenatalBaselineData;
  visits: PrenatalVisitItem[];
  activeVisitNumber: number;
  onSelectOrAddVisit: (visitNumber?: number) => void;
  onUpdateVisit: (
    visitNumber: number,
    patch: Partial<PrenatalVisitItem>
  ) => void;
  onRemoveVisit: (visitNumber: number) => void;
  inputMode: PrenatalVisitInputMode;
  onInputModeChange: (mode: PrenatalVisitInputMode) => void;
  latestConsultation: MedicalConsultationItem | null;
  latestObstetricEcho: UltrasoundReportItem | null;
  onImportConsultation: (
    cons: MedicalConsultationItem,
    visitNumber: number
  ) => void;
  onImportEcho: (echo: UltrasoundReportItem, visitNumber: number) => void;
}

function addDaysToIsoDate(dateStr: string, days: number): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const [y, m, d] = dateStr.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(Date.UTC(y, m - 1, d) + days * 24 * 60 * 60 * 1000);
  if (Number.isNaN(dt.getTime())) return "";
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function PrenatalVisitEditor({
  baseline,
  visits,
  activeVisitNumber,
  onSelectOrAddVisit,
  onUpdateVisit,
  onRemoveVisit,
  inputMode,
  onInputModeChange,
  latestConsultation,
  latestObstetricEcho,
  onImportConsultation,
  onImportEcho,
}: PrenatalVisitEditorProps) {
  const activeVisit =
    visits.find((v) => v.visitNumber === activeVisitNumber) ?? null;

  const weightGain =
    activeVisit &&
    activeVisit.maternalWeightKg > 0 &&
    baseline.usualWeightKg > 0
      ? Number(
          (activeVisit.maternalWeightKg - baseline.usualWeightKg).toFixed(1)
        )
      : null;

  const [bpSys, bpDia] = (activeVisit?.bloodPressure || "")
    .split("/")
    .map((n) => parseInt(n || "0", 10));
  const isBpHigh = bpSys >= 140 || bpDia >= 90;
  const isFcfAbnormal =
    activeVisit &&
    activeVisit.fetalHeartRate > 0 &&
    (activeVisit.fetalHeartRate < 120 || activeVisit.fetalHeartRate > 160);

  return (
    <div className="space-y-4">
      {/* 1. Barra Superior: Selector de Atención 1..9 & Modo de Vista */}
      <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Registro de Controles Prenatales (Atenciones 1 a 9 • Reverso MINSA)
            </h3>
            <p className="text-xs text-muted-foreground">
              Seleccione cualquier atención para editar sus 28 parámetros
              clínicos o alterne entre el formulario guiado y la matriz
              completa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => onInputModeChange("guided")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                  inputMode === "guided"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileSpreadsheet className="size-3.5" />
                Formulario por Atención
              </button>
              <button
                type="button"
                onClick={() => onInputModeChange("matrix")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                  inputMode === "matrix"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Columns className="size-3.5" />
                Matriz 9 Columnas
              </button>
            </div>

            {visits.length < 9 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => onSelectOrAddVisit()}
              >
                <Plus className="size-3.5" />+ Habilitar Siguiente Atención
              </Button>
            ) : null}
          </div>
        </div>

        {/* Selector visual de las 9 columnas del carnet MINSA */}
        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-9">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
            const v = visits.find((item) => item.visitNumber === num);
            const isSelected = activeVisitNumber === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => onSelectOrAddVisit(num)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border px-2 py-1.5 text-center transition-all",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30"
                    : v
                      ? "border-primary/40 bg-primary/10 text-foreground hover:bg-primary/15"
                      : "border-dashed border-border bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-1 text-[11px] font-bold">
                  {v ? <Check className="size-3" /> : <Plus className="size-3" />}
                  <span>Atención {num}</span>
                </div>
                <span
                  className={cn(
                    "text-[10px]",
                    isSelected
                      ? "text-primary-foreground/90"
                      : v
                        ? "text-primary font-semibold"
                        : "text-muted-foreground"
                  )}
                >
                  {v && v.visitDate
                    ? `${v.visitDate.slice(8, 10)}/${v.visitDate.slice(5, 7)} (${v.gestationalAgeWeeks}s)`
                    : "Clic para llenar"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MODO A: FORMULARIO GUIADO DE LA ATENCIÓN ACTIVA */}
      {inputMode === "guided" ? (
        activeVisit ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-2xs">
            {/* Barra de la Atención Activa + Botones para Jalar de Consulta / Ecografía */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="text-xs font-bold">
                  EDITANDO ATENCIÓN PRENATAL N° {activeVisit.visitNumber}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Edad Gestacional calculada:{" "}
                  <strong className="text-foreground">
                    {activeVisit.gestationalAgeWeeks} sem{" "}
                    {activeVisit.gestationalAgeDays} días
                  </strong>
                </span>
                {weightGain !== null ? (
                  <Badge variant="outline" className="text-xs">
                     Δ Peso vs. Habitual ({baseline.usualWeightKg} kg):{" "}
                    <strong className="ml-1">
                      {weightGain >= 0 ? `+${weightGain}` : weightGain} kg
                    </strong>
                  </Badge>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {latestConsultation ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onImportConsultation(
                        latestConsultation,
                        activeVisit.visitNumber
                      )
                    }
                  >
                    <Stethoscope className="size-3.5 text-primary" />
                    Jalar Signos Vitales de Consulta (
                    {formatPeruDateDisplay(latestConsultation.consultationDate)}
                    )
                  </Button>
                ) : null}

                {latestObstetricEcho ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onImportEcho(latestObstetricEcho, activeVisit.visitNumber)
                    }
                  >
                    <Sparkles className="size-3.5 text-primary" />
                    Jalar EG / FCF de Ecografía (
                    {formatPeruDateDisplay(latestObstetricEcho.reportDate)})
                  </Button>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => onRemoveVisit(activeVisit.visitNumber)}
                >
                  <Trash2 className="size-3.5" />
                  Vaciar Atención {activeVisit.visitNumber}
                </Button>
              </div>
            </div>

            {/* BLOQUE 1: Fecha, Hora & Edad Gestacional */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <span className="mb-1 block text-xs font-semibold text-foreground">
                  1. Fecha de Atención *
                </span>
                <Input
                  type="date"
                  value={activeVisit.visitDate}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      visitDate: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <span className="mb-1 block text-xs font-semibold text-foreground">
                  Hora de Atención
                </span>
                <Input
                  type="time"
                  value={activeVisit.visitTime}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      visitTime: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <span className="mb-1 flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>2. Edad Gestacional (Sem)</span>
                  {baseline.fum ? (
                    <button
                      type="button"
                      onClick={() => {
                        const ga = calculateGestationalAge(
                          baseline.fum,
                          activeVisit.visitDate
                        );
                        onUpdateVisit(activeVisit.visitNumber, {
                          gestationalAgeWeeks: ga.weeks,
                          gestationalAgeDays: ga.days,
                        });
                      }}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      Recalcular por FUM
                    </button>
                  ) : null}
                </span>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    max={44}
                    value={activeVisit.gestationalAgeWeeks}
                    onChange={(e) =>
                      onUpdateVisit(activeVisit.visitNumber, {
                        gestationalAgeWeeks:
                          parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                  <span className="text-xs font-semibold text-muted-foreground">
                    sem
                  </span>
                  <Input
                    type="number"
                    min={0}
                    max={6}
                    value={activeVisit.gestationalAgeDays}
                    onChange={(e) =>
                      onUpdateVisit(activeVisit.visitNumber, {
                        gestationalAgeDays: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-16"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">
                    d
                  </span>
                </div>
              </div>

              <div>
                <span className="mb-1 block text-xs font-semibold text-foreground">
                  3. Peso Madre (kg) 🟨
                </span>
                <Input
                  type="number"
                  step="0.1"
                  min={25}
                  max={220}
                  value={activeVisit.maternalWeightKg || ""}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      maternalWeightKg: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Ej. 61.5"
                />
              </div>
            </div>

            {/* BLOQUE 2: Signos Vitales Maternos & Biometría Fetal (Maniobras de Leopold + FCF) */}
            <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-4">
              <div>
                <span className="mb-1 block text-xs font-semibold text-foreground">
                  4. Temperatura (°C)
                </span>
                <Input
                  type="number"
                  step="0.1"
                  min={35}
                  max={41}
                  value={activeVisit.temperature || ""}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      temperature: parseFloat(e.target.value) || 36.5,
                    })
                  }
                />
              </div>

              <div>
                <span className="mb-1 flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>5. Presión Arterial (mmHg) 🟨</span>
                  {isBpHigh ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-destructive">
                      <AlertTriangle className="size-3" />
                      ≥140/90 ALERTA
                    </span>
                  ) : null}
                </span>
                <Input
                  type="text"
                  value={activeVisit.bloodPressure}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      bloodPressure: e.target.value,
                    })
                  }
                  placeholder="110/70"
                  className={cn(
                    isBpHigh && "border-destructive bg-destructive/10 font-bold"
                  )}
                />
              </div>

              <div>
                <span className="mb-1 block text-xs font-semibold text-foreground">
                  6. Pulso Materno (lpm)
                </span>
                <Input
                  type="number"
                  min={40}
                  max={200}
                  value={activeVisit.maternalPulse || ""}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      maternalPulse: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>

              <div>
                <span className="mb-1 block text-xs font-semibold text-foreground">
                  7. Altura Uterina (cm) 🟨
                </span>
                <Input
                  type="number"
                  min={0}
                  max={55}
                  value={activeVisit.uterineHeightCm || ""}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      uterineHeightCm: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0 = NA (<13 sem)"
                />
              </div>
            </div>

            {/* BLOQUE 3: Situación, Presentación, Posición, FCF & Movimientos Fetales */}
            <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-5">
              <div>
                <span className="mb-1 block text-xs font-semibold text-foreground">
                  8. Situación (L/T/NA)
                </span>
                <select
                  value={activeVisit.fetusSituation}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      fetusSituation: e.target
                        .value as PrenatalVisitItem["fetusSituation"],
                    })
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="L">L (Longitudinal)</option>
                  <option value="T">T (Transversa)</option>
                  <option value="NA">NA (No Aplica)</option>
                </select>
              </div>

              <div>
                <span className="mb-1 block text-xs font-semibold text-foreground">
                  9. Presentación (C/P/NA)
                </span>
                <select
                  value={activeVisit.fetusPresentation}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      fetusPresentation: e.target
                        .value as PrenatalVisitItem["fetusPresentation"],
                    })
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="C">C (Cefálica)</option>
                  <option value="P">P (Pélvica)</option>
                  <option value="NA">NA (No Aplica)</option>
                </select>
              </div>

              <div>
                <span className="mb-1 block text-xs font-semibold text-foreground">
                  10. Posición (D/I/NA)
                </span>
                <select
                  value={activeVisit.fetusPosition}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      fetusPosition: e.target
                        .value as PrenatalVisitItem["fetusPosition"],
                    })
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="D">D (Derecha)</option>
                  <option value="I">I (Izquierda)</option>
                  <option value="NA">NA (No Aplica)</option>
                </select>
              </div>

              <div>
                <span className="mb-1 flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>11. F.C.F. (lpm / 0=NA)</span>
                  {isFcfAbnormal ? (
                    <span className="text-[10px] font-bold text-destructive">
                      ⚠️ 120-160
                    </span>
                  ) : null}
                </span>
                <Input
                  type="number"
                  min={0}
                  max={240}
                  value={activeVisit.fetalHeartRate || ""}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      fetalHeartRate: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  placeholder="Ej. 144 (0 = NA)"
                  className={cn(
                    isFcfAbnormal &&
                      "border-destructive bg-destructive/10 font-bold"
                  )}
                />
              </div>

              <div>
                <span className="mb-1 block text-xs font-semibold text-foreground">
                  12. Mov. Fetal 🟨
                </span>
                <select
                  value={activeVisit.fetalMovements}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      fetalMovements: e.target
                        .value as PrenatalVisitItem["fetalMovements"],
                    })
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="+">+ (Leves)</option>
                  <option value="++">++ (Normales)</option>
                  <option value="+++">+++ (Activos)</option>
                  <option value="SM">SM (Sin Movimiento - Alerta)</option>
                  <option value="NA">NA (No Aplica &lt;18s)</option>
                </select>
              </div>
            </div>

            {/* BLOQUE 4: Proteinuria, Edema, Reflejos ROT, Examen de Pezón & Suplementación */}
            <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-4">
              <div>
                <span className="mb-1 block text-xs font-semibold text-foreground">
                  13. Proteinuria Cualitativa
                </span>
                <select
                  value={activeVisit.proteinuria}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      proteinuria: e.target
                        .value as PrenatalVisitItem["proteinuria"],
                    })
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="-">(-) Negativa</option>
                  <option value="+">(+) Positiva leve</option>
                  <option value="++">(++) Positiva moderada</option>
                  <option value="+++">(+++) Positiva severa</option>
                  <option value="NSH">NSH (No se hizo)</option>
                </select>
              </div>

              <div>
                <span className="mb-1 block text-xs font-semibold text-foreground">
                  14. Edema (+/++/+++/SE)
                </span>
                <select
                  value={activeVisit.edema}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      edema: e.target.value as PrenatalVisitItem["edema"],
                    })
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="SE">SE (Sin Edema)</option>
                  <option value="+">+ (Maleolar leve)</option>
                  <option value="++">++ (Pretibial moderado)</option>
                  <option value="+++">+++ (Generalizado / Anasarca)</option>
                </select>
              </div>

              <div>
                <span className="mb-1 block text-xs font-semibold text-foreground">
                  15. Reflejo Osteotendinoso (ROT)
                </span>
                <select
                  value={activeVisit.tendonReflex}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      tendonReflex: e.target
                        .value as PrenatalVisitItem["tendonReflex"],
                    })
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="++">++ (Normal)</option>
                  <option value="+">+ (Hiporreflexia)</option>
                  <option value="+++">+++ (Hiperreflexia - Alerta)</option>
                  <option value="0">0 (Arreflexia)</option>
                </select>
              </div>

              <div>
                <span className="mb-1 block text-xs font-semibold text-foreground">
                  16. Examen de Pezón
                </span>
                <select
                  value={activeVisit.nippleExam}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      nippleExam: e.target
                        .value as PrenatalVisitItem["nippleExam"],
                    })
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  <option value="Formado">Formado</option>
                  <option value="No Formado">No Formado (Plano/Invertido)</option>
                  <option value="Sin Examen">Sin Examen</option>
                </select>
              </div>
            </div>

            {/* BLOQUE 5: Suplementación Micronutrientes (Filas 17, 18, 19), Consejería, Eco Control & PBF */}
            <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-3">
              <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-2.5">
                <span className="block text-xs font-bold text-foreground">
                  17–19. Suplementación Indispensable MINSA
                </span>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={activeVisit.folicAcidEarlyGiven}
                    onChange={(e) =>
                      onUpdateVisit(activeVisit.visitNumber, {
                        folicAcidEarlyGiven: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span>Indic. Ácido Fólico (≤ 14 semanas)</span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={activeVisit.ironFolicAcidGiven}
                    onChange={(e) =>
                      onUpdateVisit(activeVisit.visitNumber, {
                        ironFolicAcidGiven: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span>Indic. Fierro + Ácido Fólico (≥ 14 semanas)</span>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={activeVisit.calciumGiven}
                    onChange={(e) =>
                      onUpdateVisit(activeVisit.visitNumber, {
                        calciumGiven: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span>Indic. Calcio (≥ 20 semanas)</span>
                </label>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="mb-1 block text-xs font-semibold text-foreground">
                    20. Orientación / Consejería
                  </span>
                  <Input
                    value={activeVisit.counselingGiven}
                    onChange={(e) =>
                      onUpdateVisit(activeVisit.visitNumber, {
                        counselingGiven: e.target.value,
                      })
                    }
                    placeholder="PF / ITS / NUT / Inm / VIH / TBC"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs font-semibold text-foreground">
                    21. EG de Eco. Control (Sem / No se hizo / NA)
                  </span>
                  <Input
                    value={activeVisit.ultrasoundGestationalAge}
                    onChange={(e) =>
                      onUpdateVisit(activeVisit.visitNumber, {
                        ultrasoundGestationalAge: e.target.value,
                      })
                    }
                    placeholder="Ej. 20s 3d o NA"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="mb-1 block text-xs font-semibold text-foreground">
                    22. Perfil Biofísico (4, 6, 8, 10 de 10 / NSH / NA)
                  </span>
                  <select
                    value={activeVisit.biophysicalProfileScore}
                    onChange={(e) =>
                      onUpdateVisit(activeVisit.visitNumber, {
                        biophysicalProfileScore: e.target.value,
                      })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                  >
                    <option value="NA">NA (No Aplica)</option>
                    <option value="10/10">10 de 10 (Normal)</option>
                    <option value="8/10">8 de 10 (Normal)</option>
                    <option value="6/10">6 de 10 (Equívoco - Alerta)</option>
                    <option value="4/10">4 de 10 (Anormal - Alerta)</option>
                    <option value="NSH">NSH (No se hizo)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="mb-1 block text-xs font-semibold text-foreground">
                      24. Visita Domicil.
                    </span>
                    <select
                      value={activeVisit.homeVisit}
                      onChange={(e) =>
                        onUpdateVisit(activeVisit.visitNumber, {
                          homeVisit: e.target
                            .value as PrenatalVisitItem["homeVisit"],
                        })
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="NA">NA</option>
                      <option value="No">No</option>
                      <option value="Si">Sí</option>
                    </select>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs font-semibold text-foreground">
                      25. Plan Parto
                    </span>
                    <select
                      value={activeVisit.birthPlanVisit}
                      onChange={(e) =>
                        onUpdateVisit(activeVisit.visitNumber, {
                          birthPlanVisit: e.target
                            .value as PrenatalVisitItem["birthPlanVisit"],
                        })
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="Control">Control</option>
                      <option value="Visita">Visita</option>
                      <option value="No se Hizo">No se Hizo</option>
                      <option value="NA">NA</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* BLOQUE 6: Próxima Cita (con atajos +4s/+2s/+1s) & Observaciones */}
            <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-3">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    23. Próxima Cita de Control
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      ["+4 sem", 28],
                      ["+2 sem", 14],
                      ["+1 sem", 7],
                    ].map(([lbl, days]) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() =>
                          onUpdateVisit(activeVisit.visitNumber, {
                            nextAppointmentDate: addDaysToIsoDate(
                              activeVisit.visitDate,
                              Number(days)
                            ),
                          })
                        }
                        className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-bold text-foreground hover:bg-muted"
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  type="date"
                  value={activeVisit.nextAppointmentDate}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      nextAppointmentDate: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <span className="mb-1 block text-xs font-semibold text-foreground">
                  26–28. Establecimiento / Formato Seguro
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    value={activeVisit.attentionEstablishment}
                    onChange={(e) =>
                      onUpdateVisit(activeVisit.visitNumber, {
                        attentionEstablishment: e.target.value,
                      })
                    }
                    placeholder="CENDO Miraflores"
                  />
                  <Input
                    value={activeVisit.sisFormatNumber}
                    onChange={(e) =>
                      onUpdateVisit(activeVisit.visitNumber, {
                        sisFormatNumber: e.target.value,
                      })
                    }
                    placeholder="Particular / SIS"
                  />
                </div>
              </div>

              <div>
                <span className="mb-1 block text-xs font-semibold text-foreground">
                  Notas Clínicas de la Atención N° {activeVisit.visitNumber}
                </span>
                <Input
                  value={activeVisit.notes}
                  onChange={(e) =>
                    onUpdateVisit(activeVisit.visitNumber, {
                      notes: e.target.value,
                    })
                  }
                  placeholder="Indicaciones u observaciones del control..."
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
            <HeartPulse className="mx-auto size-8 text-primary" />
            <p className="mt-2 text-sm font-bold text-foreground">
              La Atención N° {activeVisitNumber} aún está vacía
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Haga clic abajo para habilitar esta columna con fecha de hoy y
              cálculo automático de Edad Gestacional.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              onClick={() => onSelectOrAddVisit(activeVisitNumber)}
            >
              <Plus className="size-4" />+ Habilitar Atención N°{" "}
              {activeVisitNumber} Ahora
            </Button>
          </div>
        )
      ) : (
        /* 3. MODO B: MATRIZ COMPLETA DE 9 COLUMNAS INTERACTIVA */
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-2xs">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-foreground">
                <th className="sticky left-0 z-10 w-48 border-r border-border bg-muted/90 p-2.5 text-left font-bold">
                  Parámetro Reverso MINSA
                </th>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
                  const v = visits.find((item) => item.visitNumber === num);
                  return (
                    <th
                      key={num}
                      className={cn(
                        "min-w-[125px] border-r border-border p-2 text-center",
                        v ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-bold">Atención {num}</span>
                        {v ? (
                          <button
                            type="button"
                            onClick={() => onRemoveVisit(num)}
                            className="text-muted-foreground hover:text-destructive"
                            title="Vaciar columna"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Fecha */}
              <tr>
                <td className="sticky left-0 z-10 border-r border-border bg-muted/40 p-2 font-semibold">
                  1. Fecha atención
                </td>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
                  const v = visits.find((item) => item.visitNumber === num);
                  return (
                    <td key={num} className="border-r border-border p-1.5 text-center">
                      {v ? (
                        <input
                          type="date"
                          value={v.visitDate}
                          onChange={(e) =>
                            onUpdateVisit(num, { visitDate: e.target.value })
                          }
                          className="w-28 rounded border border-input bg-background px-1 py-0.5 text-center text-[11px]"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectOrAddVisit(num)}
                          className="rounded border border-dashed border-primary/50 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/10"
                        >
                          + Habilitar {num}°
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Edad Gestacional */}
              <tr>
                <td className="sticky left-0 z-10 border-r border-border bg-muted/40 p-2 font-semibold">
                  2. Edad Gest. (sem)
                </td>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
                  const v = visits.find((item) => item.visitNumber === num);
                  return (
                    <td key={num} className="border-r border-border p-1.5 text-center">
                      {v ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={v.gestationalAgeWeeks}
                            onChange={(e) =>
                              onUpdateVisit(num, {
                                gestationalAgeWeeks:
                                  parseInt(e.target.value, 10) || 0,
                              })
                            }
                            className="w-12 rounded border border-input bg-background py-0.5 text-center text-xs font-bold"
                          />
                          <span className="text-[10px]">s</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Peso Madre */}
              <tr>
                <td className="sticky left-0 z-10 border-r border-border bg-muted/40 p-2 font-semibold">
                  3. Peso Madre (kg) 🟨
                </td>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
                  const v = visits.find((item) => item.visitNumber === num);
                  return (
                    <td key={num} className="border-r border-border p-1.5 text-center">
                      {v ? (
                        <input
                          type="number"
                          step="0.1"
                          value={v.maternalWeightKg}
                          onChange={(e) =>
                            onUpdateVisit(num, {
                              maternalWeightKg:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-16 rounded border border-input bg-background py-0.5 text-center text-xs"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Presión Arterial */}
              <tr>
                <td className="sticky left-0 z-10 border-r border-border bg-muted/40 p-2 font-semibold">
                  5. Presión Art. (mmHg) 🟨
                </td>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
                  const v = visits.find((item) => item.visitNumber === num);
                  return (
                    <td key={num} className="border-r border-border p-1.5 text-center">
                      {v ? (
                        <input
                          type="text"
                          value={v.bloodPressure}
                          onChange={(e) =>
                            onUpdateVisit(num, { bloodPressure: e.target.value })
                          }
                          className="w-20 rounded border border-input bg-background py-0.5 text-center text-xs font-bold"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Altura Uterina */}
              <tr>
                <td className="sticky left-0 z-10 border-r border-border bg-muted/40 p-2 font-semibold">
                  7. Altura Uterina (cm) 🟨
                </td>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
                  const v = visits.find((item) => item.visitNumber === num);
                  return (
                    <td key={num} className="border-r border-border p-1.5 text-center">
                      {v ? (
                        <input
                          type="number"
                          value={v.uterineHeightCm}
                          onChange={(e) =>
                            onUpdateVisit(num, {
                              uterineHeightCm: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-14 rounded border border-input bg-background py-0.5 text-center text-xs"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* FCF */}
              <tr>
                <td className="sticky left-0 z-10 border-r border-border bg-muted/40 p-2 font-semibold">
                  11. F.C.F. (lpm)
                </td>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
                  const v = visits.find((item) => item.visitNumber === num);
                  return (
                    <td key={num} className="border-r border-border p-1.5 text-center">
                      {v ? (
                        <input
                          type="number"
                          value={v.fetalHeartRate}
                          onChange={(e) =>
                            onUpdateVisit(num, {
                              fetalHeartRate: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          className="w-16 rounded border border-input bg-background py-0.5 text-center text-xs font-bold"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Mov. Fetal */}
              <tr>
                <td className="sticky left-0 z-10 border-r border-border bg-muted/40 p-2 font-semibold">
                  12. Mov. Fetal 🟨
                </td>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
                  const v = visits.find((item) => item.visitNumber === num);
                  return (
                    <td key={num} className="border-r border-border p-1.5 text-center">
                      {v ? (
                        <select
                          value={v.fetalMovements}
                          onChange={(e) =>
                            onUpdateVisit(num, {
                              fetalMovements: e.target
                                .value as PrenatalVisitItem["fetalMovements"],
                            })
                          }
                          className="rounded border border-input bg-background px-1 py-0.5 text-xs"
                        >
                          <option value="+">+</option>
                          <option value="++">++</option>
                          <option value="+++">+++</option>
                          <option value="SM">SM</option>
                          <option value="NA">NA</option>
                        </select>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Próxima Cita */}
              <tr>
                <td className="sticky left-0 z-10 border-r border-border bg-muted/40 p-2 font-semibold">
                  23. Próxima Cita
                </td>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
                  const v = visits.find((item) => item.visitNumber === num);
                  return (
                    <td key={num} className="border-r border-border p-1.5 text-center">
                      {v ? (
                        <input
                          type="date"
                          value={v.nextAppointmentDate}
                          onChange={(e) =>
                            onUpdateVisit(num, {
                              nextAppointmentDate: e.target.value,
                            })
                          }
                          className="w-28 rounded border border-input bg-background px-1 py-0.5 text-center text-[11px]"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
