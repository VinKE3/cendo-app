"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  MaternalPathologyItem,
  PrenatalBaselineData,
  PrenatalReferralEntry,
  PrenatalRiskReport,
} from "@/features/prenatal/prenatal.schema";
import { cn, getPeruDateString } from "@/lib/utils";

interface PrenatalAroEditorProps {
  baseline: PrenatalBaselineData;
  onBaselineChange: (next: PrenatalBaselineData) => void;
  pathologies: MaternalPathologyItem[];
  onPathologiesChange: (next: MaternalPathologyItem[]) => void;
  riskReport: PrenatalRiskReport;
}

const COMMON_OBSTETRIC_CIE10: Array<{ name: string; cie10: string }> = [
  { name: "Amenaza de aborto", cie10: "O20.0" },
  { name: "Infección de vías urinarias en el embarazo", cie10: "O23.4" },
  { name: "Anemia que complica el embarazo", cie10: "O99.0" },
  { name: "Diabetes mellitus gestacional", cie10: "O24.4" },
  { name: "Preeclampsia leve a moderada", cie10: "O14.0" },
  { name: "Hiperémesis gravídica leve", cie10: "O21.0" },
  { name: "Atención materna por cicatriz uterina previa", cie10: "O34.2" },
  { name: "Supervisión de embarazo de alto riesgo", cie10: "Z35.9" },
];

export function PrenatalAroEditor({
  baseline,
  onBaselineChange,
  pathologies,
  onPathologiesChange,
  riskReport,
}: PrenatalAroEditorProps) {
  const todayStr = getPeruDateString();
  const nextIdCounterRef = useRef(1);

  const [newPathologyName, setNewPathologyName] = useState("");
  const [newPathologyCie10, setNewPathologyCie10] = useState("");
  const [newPathologyDate, setNewPathologyDate] = useState(todayStr);

  const handleAddPathology = (name?: string, cie10?: string) => {
    const cleanName = (name ?? newPathologyName).trim();
    const cleanCie10 = (cie10 ?? newPathologyCie10).trim().toUpperCase();
    if (!cleanName) return;

    nextIdCounterRef.current += 1;
    const item: MaternalPathologyItem = {
      id: `mp-${pathologies.length + 1}-${nextIdCounterRef.current}`,
      name: cleanName,
      cie10: cleanCie10 || "O99.8",
      diagnosedDate: newPathologyDate || todayStr,
    };

    onPathologiesChange([...pathologies, item]);
    if (!name) {
      setNewPathologyName("");
      setNewPathologyCie10("");
    }
  };

  const handleRemovePathology = (id: string) => {
    onPathologiesChange(pathologies.filter((p) => p.id !== id));
  };

  const patchReferral = (
    key:
      | "referralExternal"
      | "referralEmergency"
      | "referralDiagnosticSupport",
    patch: Partial<PrenatalReferralEntry>
  ) => {
    onBaselineChange({
      ...baseline,
      [key]: {
        ...baseline[key],
        ...patch,
      },
    });
  };

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Banner Semáforo ARO */}
      <div
        className={cn(
          "flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center",
          riskReport.hasContinuousFollowUp
            ? "border-red-400 bg-red-50/90 text-red-950"
            : riskReport.isHighRisk
              ? "border-amber-400 bg-amber-50/90 text-amber-950"
              : "border-emerald-300 bg-emerald-50/80 text-emerald-950"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl border",
              riskReport.hasContinuousFollowUp
                ? "border-red-400 bg-red-600 text-white"
                : riskReport.isHighRisk
                  ? "border-amber-500 bg-amber-400 text-slate-950"
                  : "border-emerald-400 bg-emerald-600 text-white"
            )}
          >
            {riskReport.isHighRisk ? (
              <AlertTriangle className="size-5" />
            ) : (
              <CheckCircle2 className="size-5" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold">
                {riskReport.riskCategory}
              </h3>
              <Badge variant="outline" className="text-[10px] font-bold">
                NTS N° 105 - MINSA
              </Badge>
            </div>
            <p className="mt-0.5 text-xs opacity-90">
              {riskReport.isHighRisk
                ? `Se han identificado ${riskReport.alertCount} factor(es) de ALERTA (🟨) y ${riskReport.continuousCount} factor(es) de SEGUIMIENTO CONTINUO (🟥).`
                : "Gestación fisiológica sin factores de alerta ni seguimiento continuo activos."}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Lista de Factores Detectados */}
      {riskReport.warningFlags.length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2.5 flex items-center gap-2 font-bold text-foreground">
            <ShieldAlert className="size-4 text-primary" />
            <span>
              Factores de Alerta y Seguimiento Activos en el Carnet (
              {riskReport.warningFlags.length})
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {riskReport.warningFlags.map((f, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-3 py-2 font-semibold",
                  f.severity === "continuous"
                    ? "border-red-300 bg-red-50/70 text-red-950"
                    : "border-amber-300 bg-amber-50/70 text-amber-950"
                )}
              >
                <span>{f.label}</span>
                <span className="ml-2 shrink-0 text-[10px] font-extrabold">
                  {f.severity === "continuous"
                    ? "🟥 SEGUIMIENTO"
                    : "🟨 ALERTA"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 3. Patologías Maternas Diagnosticadas (CIE-10) — Bloque inferior del Reverso MINSA */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
          <div>
            <h4 className="font-bold text-foreground">
              Patologías Maternas (CIE 10) Diagnosticadas (Reverso MINSA)
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Se imprimen en el bloque inferior del reverso del carnet con su
              fecha y código CIE-10.
            </p>
          </div>
          <Badge variant="outline">
            {pathologies.length === 0
              ? "Sin patologías [✓]"
              : `${pathologies.length} registrada(s)`}
          </Badge>
        </div>

        {/* Chips rápidos CIE-10 obstétricos */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground">
            Agregar rápido:
          </span>
          {COMMON_OBSTETRIC_CIE10.map((preset) => (
            <button
              key={preset.cie10}
              type="button"
              onClick={() => handleAddPathology(preset.name, preset.cie10)}
              className="rounded-md border border-border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted"
            >
              + {preset.name} ({preset.cie10})
            </button>
          ))}
        </div>

        {/* Formulario manual */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
          <div className="sm:col-span-6">
            <Input
              value={newPathologyName}
              onChange={(e) => setNewPathologyName(e.target.value)}
              placeholder="Diagnóstico materno..."
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              value={newPathologyCie10}
              onChange={(e) => setNewPathologyCie10(e.target.value.toUpperCase())}
              placeholder="CIE-10 (ej. O23.4)"
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              type="date"
              value={newPathologyDate}
              onChange={(e) => setNewPathologyDate(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => handleAddPathology()}
            >
              <Plus className="size-3.5" />
              Agregar
            </Button>
          </div>
        </div>

        {pathologies.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            {pathologies.map((mp, idx) => (
              <div
                key={mp.id}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold">{idx + 1}.</span>
                  <span className="font-semibold text-foreground">
                    {mp.name}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    CIE-10: {mp.cie10}
                  </Badge>
                  <span className="text-muted-foreground">
                    Fecha: {mp.diagnosedDate}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePathology(mp.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* 4. Referencias MINSA & Franja Inferior (Psicoprofilaxis, Estimulación, Plan de Parto, Casa de Espera) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2.5 rounded-xl border border-border bg-card p-4">
          <h4 className="font-bold text-foreground">
            Referencias Registradas (Reverso MINSA)
          </h4>
          {(
            [
              ["referralExternal", "Referencia - Consulta Externa"],
              ["referralEmergency", "Referencia Emergencia"],
              ["referralDiagnosticSupport", "Referencia - Apoyo al Diagnóstico"],
            ] as const
          ).map(([key, label]) => {
            const ref = baseline[key];
            return (
              <div
                key={key}
                className="space-y-1.5 rounded-lg border border-border bg-muted/15 p-2.5"
              >
                <span className="block font-semibold">{label}</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <select
                    value={ref.status}
                    onChange={(e) =>
                      patchReferral(key, {
                        status: e.target
                          .value as PrenatalReferralEntry["status"],
                      })
                    }
                    className="h-8 rounded border border-input bg-background px-2 text-xs"
                  >
                    <option value="NO_APLICA">NO APLICA</option>
                    <option value="SI">SÍ</option>
                    <option value="NO">NO (🟨)</option>
                  </select>
                  <Input
                    type="date"
                    value={ref.date}
                    onChange={(e) =>
                      patchReferral(key, { date: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                  <Input
                    value={ref.targetEstablishment}
                    onChange={(e) =>
                      patchReferral(key, {
                        targetEstablishment: e.target.value,
                      })
                    }
                    placeholder="Estbl. traslado..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <h4 className="font-bold text-foreground">
              Psicoprofilaxis, Estimulación & Plan de Parto (Reverso MINSA)
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1 block font-semibold">
                Sesiones Psicoprofilaxis
              </span>
              <Input
                type="number"
                min={0}
                max={12}
                value={baseline.psychoprophylaxisSessions}
                onChange={(e) =>
                  onBaselineChange({
                    ...baseline,
                    psychoprophylaxisSessions:
                      parseInt(e.target.value, 10) || 0,
                  })
                }
              />
            </div>

            <div>
              <span className="mb-1 block font-semibold">
                Sesiones Estimulación Prenatal
              </span>
              <Input
                type="number"
                min={0}
                max={12}
                value={baseline.prenatalStimulationSessions}
                onChange={(e) =>
                  onBaselineChange({
                    ...baseline,
                    prenatalStimulationSessions:
                      parseInt(e.target.value, 10) || 0,
                  })
                }
              />
            </div>

            <div>
              <span className="mb-1 block font-semibold">Plan de Parto</span>
              <select
                value={baseline.birthPlanDone}
                onChange={(e) =>
                  onBaselineChange({
                    ...baseline,
                    birthPlanDone: e.target
                      .value as PrenatalBaselineData["birthPlanDone"],
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="SI">SÍ (Elaborado)</option>
                <option value="NO">NO (🟨 Alerta)</option>
                <option value="NO_APLICA">NO APLICA</option>
              </select>
            </div>

            <div>
              <span className="mb-1 block font-semibold">
                Alojada en Casa de Espera
              </span>
              <select
                value={baseline.maternalWaitingHome}
                onChange={(e) =>
                  onBaselineChange({
                    ...baseline,
                    maternalWaitingHome: e.target
                      .value as PrenatalBaselineData["maternalWaitingHome"],
                  })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="NO_APLICA">NO APLICA</option>
                <option value="SI">SÍ</option>
                <option value="NO">NO (🟨)</option>
              </select>
            </div>
          </div>

          <div>
            <span className="mb-1 block font-semibold">
              Lugar Previsto para el Parto / Cesárea
            </span>
            <Input
              value={baseline.plannedBirthPlace}
              onChange={(e) =>
                onBaselineChange({
                  ...baseline,
                  plannedBirthPlace: e.target.value,
                })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
