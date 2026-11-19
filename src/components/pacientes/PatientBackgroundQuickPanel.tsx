"use client";

import { AlertTriangle, BookOpen, Calendar, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ColposcopyReportItem } from "@/features/colposcopia/colposcopia.schema";
import {
  ULTRASOUND_TYPE_SHORT_LABELS,
  type UltrasoundReportItem,
} from "@/features/ecografias/ecografias.schema";
import type {
  PatientBackgroundItem,
  PatientDirectoryItem,
} from "@/features/pacientes/pacientes.schema";
import { calculateGestationalAgeFromFur } from "@/lib/clinical/catalogs";
import { cn, formatPeruDateDisplay } from "@/lib/utils";

function hasPositiveClinicalFlag(value?: string | null): boolean {
  if (!value) return false;
  const clean = value.trim().toLowerCase();
  return (
    clean !== "" &&
    !clean.startsWith("niega") &&
    clean !== "ninguna" &&
    clean !== "ninguno" &&
    clean !== "no refiere" &&
    clean !== "no"
  );
}

interface ViewBackgroundButtonProps {
  open: boolean;
  onToggle: () => void;
  background?: PatientBackgroundItem | null;
  className?: string;
}

export function ViewBackgroundButton({
  open,
  onToggle,
  background,
  className,
}: ViewBackgroundButtonProps) {
  const hasAllergy = hasPositiveClinicalFlag(background?.medicalAllergies);
  const hasComorbidity =
    hasPositiveClinicalFlag(background?.hasDiabetes) ||
    hasPositiveClinicalFlag(background?.hasHypertension) ||
    hasPositiveClinicalFlag(background?.hasAsthma);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onToggle}
      title="Consultar antecedentes gineco-obstétricos y estudios previos de la paciente"
      className={cn(
        "gap-1.5",
        open && "border-primary bg-primary/10 text-primary hover:bg-primary/15",
        className
      )}
    >
      <BookOpen className="size-3.5 text-primary" />
      <span>{open ? "Ocultar Antecedentes" : "Ver Antecedentes"}</span>
      {hasAllergy ? (
        <span
          className="size-2 shrink-0 rounded-full bg-destructive"
          aria-label="Alerta de alergias registrada"
        />
      ) : hasComorbidity ? (
        <span
          className="size-2 shrink-0 rounded-full bg-warning"
          aria-label="Comorbilidad registrada"
        />
      ) : null}
    </Button>
  );
}

interface PatientBackgroundQuickPanelProps {
  open: boolean;
  patient: PatientDirectoryItem;
  background?: PatientBackgroundItem | null;
  lastUltrasound?: UltrasoundReportItem | null;
  lastColposcopy?: ColposcopyReportItem | null;
}

export function PatientBackgroundQuickPanel({
  open,
  patient,
  background,
  lastUltrasound,
  lastColposcopy,
}: PatientBackgroundQuickPanelProps) {
  if (!open) return null;

  const furCalculation = calculateGestationalAgeFromFur(
    background?.lastMenstrualPeriod || patient.lastMenstrualPeriod
  );
  const effectiveFur =
    background?.lastMenstrualPeriod || patient.lastMenstrualPeriod || "";
  const effectiveAllergies =
    background?.medicalAllergies || patient.medicalAllergies || "";

  const hasAllergies = hasPositiveClinicalFlag(effectiveAllergies);
  const comorbidities = [
    hasPositiveClinicalFlag(background?.hasDiabetes)
      ? `DM: ${background?.hasDiabetes}`
      : "",
    hasPositiveClinicalFlag(background?.hasHypertension)
      ? `HTA: ${background?.hasHypertension}`
      : "",
    hasPositiveClinicalFlag(background?.hasAsthma)
      ? `Asma: ${background?.hasAsthma}`
      : "",
  ].filter(Boolean);

  return (
    <div className="space-y-2.5 rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 pb-2">
        <span className="flex items-center gap-1.5 font-semibold tracking-wide text-primary uppercase">
          <BookOpen className="size-3.5" />
          Resumen Clínico & Antecedentes • {patient.fullName}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {patient.documentType} {patient.documentNumber} • {patient.age} años
        </span>
      </div>

      {hasAllergies || comorbidities.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {hasAllergies ? (
            <Badge
              variant="destructive"
              className="gap-1 px-2.5 py-0.5 text-[11px] font-semibold"
            >
              <AlertTriangle className="size-3" />
              RAM / Alergia: {effectiveAllergies}
            </Badge>
          ) : null}
          {comorbidities.length > 0 ? (
            <Badge
              variant="outline"
              className="border-warning/40 bg-warning/15 px-2.5 py-0.5 text-[11px] font-semibold text-foreground"
            >
              Comorbilidades: {comorbidities.join(" • ")}
            </Badge>
          ) : null}
        </div>
      ) : null}

      {background ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-2.5">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase">
              <Calendar className="size-3 text-warning" />
              FUR & Régimen Catamenial
            </span>
            <p className="mt-1 font-mono text-xs font-bold text-foreground">
              {effectiveFur
                ? formatPeruDateDisplay(effectiveFur)
                : "No registra"}
            </p>
            {furCalculation && !furCalculation.error ? (
              <p className="mt-0.5 font-mono text-[10px] font-semibold text-primary">
                {furCalculation.text}
              </p>
            ) : null}
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              RC: {background.catamenialRegimen || "28/4"}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-2.5">
            <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
              Paridad & Anticoncepción (MAC)
            </span>
            <p className="mt-1 font-mono text-xs font-bold text-foreground">
              {background.obstetricFormula ||
                patient.obstetricFormula ||
                "G0 P0000"}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              MAC: {background.contraceptiveMethod || "Ninguno"}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-2.5">
            <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
              Tamizaje Cervical (PAP / VPH)
            </span>
            <p className="mt-1 font-semibold text-foreground">
              PAP: {background.papHistory || "Sin antecedentes"}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              VPH: {background.vphTestHistory || "Sin registro"}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-2.5">
            <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
              Qx Previas & Ant. Familiares
            </span>
            <p className="mt-1 line-clamp-2 font-medium text-foreground">
              Qx: {background.surgeriesHistory || "Niega"}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
              Fam: {background.familyHistory || "No refiere"}
            </p>
            {hasPositiveClinicalFlag(background.otherPathologies) ? (
              <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-primary">
                Patologías: {background.otherPathologies}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-xs text-muted-foreground">
          Esta paciente aún no tiene antecedentes gineco-obstétricos detallados
          registrados. Puede completarlos desde la pestaña{" "}
          <strong className="text-foreground">Resumen</strong>.
        </div>
      )}

      {lastUltrasound || lastColposcopy ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {lastUltrasound ? (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-2">
              <Stethoscope className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <div className="min-w-0">
                <span className="block font-mono text-[10px] font-semibold text-muted-foreground uppercase">
                  Última Ecografía (
                  {formatPeruDateDisplay(lastUltrasound.reportDate)}) •{" "}
                  {ULTRASOUND_TYPE_SHORT_LABELS[lastUltrasound.ultrasoundType] ||
                    lastUltrasound.ultrasoundType}
                </span>
                <p className="line-clamp-1 font-medium text-foreground">
                  {lastUltrasound.conclusion}
                </p>
              </div>
            </div>
          ) : null}

          {lastColposcopy ? (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-2">
              <Stethoscope className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <div className="min-w-0">
                <span className="block font-mono text-[10px] font-semibold text-muted-foreground uppercase">
                  Última Colposcopía (
                  {formatPeruDateDisplay(lastColposcopy.reportDate)}) • CIE-10{" "}
                  {lastColposcopy.cie10Code}
                </span>
                <p className="line-clamp-1 font-medium text-foreground">
                  {lastColposcopy.diagnosis}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
