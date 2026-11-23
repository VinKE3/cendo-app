"use client";

import type { BaseSyntheticEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import { AlertTriangle, Calendar } from "lucide-react";
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
import type { PatientBackgroundInput } from "@/features/pacientes/pacientes.schema";
import type { FurCalculationResult } from "@/lib/clinical/catalogs";

interface PatientBackgroundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  form: UseFormReturn<PatientBackgroundInput>;
  watchedMac: string;
  customMacText: string;
  onCustomMacTextChange: (value: string) => void;
  availableMacOptions: string[];
  furCalculation: FurCalculationResult | null;
  isSubmitting: boolean;
  onSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
}

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function PatientBackgroundModal({
  open,
  onOpenChange,
  patientName,
  form,
  watchedMac,
  customMacText,
  onCustomMacTextChange,
  availableMacOptions,
  furCalculation,
  isSubmitting,
  onSubmit,
}: PatientBackgroundModalProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Antecedentes Gineco-Obstétricos y Generales</DialogTitle>
          <DialogDescription>
            Historial persistente de <strong className="text-foreground">{patientName}</strong>.
            Las alergias y comorbilidades se destacan en la cabecera de la ficha.
          </DialogDescription>
        </DialogHeader>

        <form id="background-form" onSubmit={onSubmit} className="space-y-4">
          {/* Bloque 1: Fórmula Obstétrica, MAC y FUR */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="bg-formula" className="block text-xs font-medium">
                Fórmula Obstétrica <span className="text-destructive">*</span>
              </label>
              <Input
                id="bg-formula"
                placeholder="G0 P0000"
                className="font-mono font-semibold uppercase"
                aria-invalid={Boolean(errors.obstetricFormula)}
                {...register("obstetricFormula")}
              />
              <p className="text-[11px] text-muted-foreground">
                G: Gestas • P: Término / Prem / Abortos / Vivos
              </p>
              {errors.obstetricFormula ? (
                <p className="text-xs text-destructive">{errors.obstetricFormula.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bg-mac" className="block text-xs font-medium">
                MAC Actual (Anticonceptivo)
              </label>
              <select
                id="bg-mac"
                className={selectClassName}
                {...register("contraceptiveMethod")}
              >
                {availableMacOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value="__OTRO__">Otro (especificar manualmente)...</option>
              </select>
              {watchedMac === "__OTRO__" ? (
                <Input
                  value={customMacText}
                  onChange={(e) => onCustomMacTextChange(e.target.value)}
                  placeholder="Especifique el método anticonceptivo"
                  className="mt-1.5"
                />
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="bg-fur"
                className="flex items-center gap-1 text-xs font-medium"
              >
                <Calendar className="size-3.5 text-warning" />
                FUR (Última Regla)
              </label>
              <Input
                id="bg-fur"
                type="date"
                className="font-mono"
                aria-invalid={Boolean(errors.lastMenstrualPeriod)}
                {...register("lastMenstrualPeriod")}
              />
              {furCalculation ? (
                furCalculation.error ? (
                  <p className="text-[11px] font-medium text-destructive">
                    {furCalculation.error}
                  </p>
                ) : (
                  <p className="rounded bg-warning/15 px-2 py-0.5 font-mono text-[11px] font-medium text-foreground">
                    {furCalculation.text}
                  </p>
                )
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bg-formula-details" className="block text-xs font-medium">
              Detalle de Fórmula Obstétrica (Partos / Cesáreas / Abortos)
            </label>
            <Input
              id="bg-formula-details"
              placeholder="Ej. 1 parto vaginal (2019), 1 cesárea (2022), 1 aborto espontáneo..."
              {...register("obstetricFormulaDetails")}
            />
          </div>

          {/* Bloque 2: Historia Ginecológica */}
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <label htmlFor="bg-menarche" className="block text-xs font-medium">
                Menarquia (años)
              </label>
              <Input
                id="bg-menarche"
                type="number"
                min={8}
                max={22}
                className="font-mono"
                {...register("menarche")}
              />
              {errors.menarche ? (
                <p className="text-xs text-destructive">{errors.menarche.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bg-rc" className="block text-xs font-medium">
                Régimen Catamenial
              </label>
              <Input
                id="bg-rc"
                placeholder="28/4"
                className="font-mono"
                {...register("catamenialRegimen")}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bg-irs" className="block text-xs font-medium">
                IRS (Inicio Sexual)
              </label>
              <Input
                id="bg-irs"
                type="number"
                min={10}
                max={45}
                className="font-mono"
                {...register("sexualDebutAge")}
              />
              {errors.sexualDebutAge ? (
                <p className="text-xs text-destructive">{errors.sexualDebutAge.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bg-nps" className="block text-xs font-medium">
                NPS (N° Parejas)
              </label>
              <Input
                id="bg-nps"
                type="number"
                min={0}
                max={100}
                className="font-mono"
                {...register("sexualPartnersCount")}
              />
              {errors.sexualPartnersCount ? (
                <p className="text-xs text-destructive">
                  {errors.sexualPartnersCount.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="bg-sti" className="block text-xs font-medium">
                Antecedentes ITS
              </label>
              <Input
                id="bg-sti"
                placeholder="Niega ITS"
                {...register("stiHistory")}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bg-pap" className="block text-xs font-medium">
                Historial PAP
              </label>
              <Input
                id="bg-pap"
                placeholder="Ej. Negativo / NILM / LIE-BG / En proceso"
                {...register("papHistory")}
              />
              <div className="flex flex-wrap gap-1 pt-0.5">
                {[
                  "Negativo / NILM",
                  "ASC-US",
                  "ASC-H",
                  "LIE-BG",
                  "LIE-AG",
                  "CA in situ",
                  "En proceso",
                  "No se realizó",
                ].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setValue("papHistory", opt, { shouldDirty: true })
                    }
                    className="cursor-pointer rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bg-vph" className="block text-xs font-medium">
                Prueba Molecular VPH
              </label>
              <Input
                id="bg-vph"
                placeholder="No se realizó / Negativo / Positivo"
                {...register("vphTestHistory")}
              />
              <div className="flex flex-wrap gap-1 pt-0.5">
                {[
                  "Negativo",
                  "Positivo (Serotipo: )",
                  "En proceso",
                  "No se realizó",
                ].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setValue("vphTestHistory", opt, { shouldDirty: true })
                    }
                    className="cursor-pointer rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary"
                  >
                    {opt === "Positivo (Serotipo: )" ? "Positivo + Serotipo" : opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bloque 3: Comorbilidades y Alertas */}
          <div className="space-y-3 border-t border-border pt-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label htmlFor="bg-diabetes" className="block text-xs font-medium">
                  Diabetes Mellitus
                </label>
                <Input
                  id="bg-diabetes"
                  placeholder="Niega"
                  {...register("hasDiabetes")}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="bg-hta" className="block text-xs font-medium">
                  Hipertensión Arterial
                </label>
                <Input
                  id="bg-hta"
                  placeholder="Niega"
                  {...register("hasHypertension")}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="bg-asthma" className="block text-xs font-medium">
                  Asma / Bronquial
                </label>
                <Input
                  id="bg-asthma"
                  placeholder="Niega"
                  {...register("hasAsthma")}
                />
              </div>
            </div>

            <div className="space-y-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <label
                htmlFor="bg-allergies"
                className="flex items-center gap-1.5 text-xs font-semibold text-destructive"
              >
                <AlertTriangle className="size-3.5" />
                Alergias Medicamentosas / RAMs
              </label>
              <Input
                id="bg-allergies"
                placeholder="Ej. Alergia a Penicilinas / Sulfas o Niega"
                {...register("medicalAllergies")}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="bg-surgeries" className="block text-xs font-medium">
                  Cirugías Previas
                </label>
                <Textarea
                  id="bg-surgeries"
                  rows={2}
                  placeholder="Ej. Cesárea (2021), Apendicectomía, o Niega"
                  {...register("surgeriesHistory")}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="bg-family" className="block text-xs font-medium">
                  Antecedentes Familiares
                </label>
                <Textarea
                  id="bg-family"
                  rows={2}
                  placeholder="Ej. Madre con CA mama / HTA, o No refiere"
                  {...register("familyHistory")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="bg-other" className="block text-xs font-medium">
                  Otras Patologías / Endometriosis
                </label>
                <Textarea
                  id="bg-other"
                  rows={2}
                  placeholder="Ej. Endometriosis ovárica, Hipotiroidismo, o Niega"
                  {...register("otherPathologies")}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="bg-notes" className="block text-xs font-medium">
                  Notas Clínicas Persistentes
                </label>
                <Textarea
                  id="bg-notes"
                  rows={2}
                  placeholder="Observaciones relevantes para todas las consultas..."
                  {...register("notes")}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Antecedentes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
