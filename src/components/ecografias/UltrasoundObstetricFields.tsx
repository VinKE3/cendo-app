"use client";

import type { UseFormReturn } from "react-hook-form";
import { Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DOPPLER_INTERPRETATIONS,
  DOPPLER_VESSEL_META,
  DUCTUS_VENOSUS_WAVE_OPTIONS,
  FETAL_SEX_OPTIONS,
  NASAL_BONE_OPTIONS,
  PLACENTA_GRADES,
  RISK_LEVEL_OPTIONS,
  type CreateUltrasoundInput,
  type getUltrasoundModeFlags,
} from "@/features/ecografias/ecografias.schema";
import {
  toOptionalEnumValue,
  toOptionalNumber,
} from "@/features/ecografias/hooks/use-ecografias";

interface UltrasoundObstetricFieldsProps {
  form: UseFormReturn<CreateUltrasoundInput>;
  selectClassName: string;
  modeFlags: ReturnType<typeof getUltrasoundModeFlags>;
  uterusPositions: readonly ("AVF" | "RVF" | "Indiferente")[];
  uterusVolume?: number;
  rightOvaryVolume?: number;
  leftOvaryVolume?: number;
  includeDoppler?: boolean;
  bppTotal: number | null;
  onAutoCalculateUterusVolume: (dimsText?: string) => void;
  onAutoCalculateOvaryVolume: (side: "right" | "left", dimsText?: string) => void;
  onAutoCalculateHadlock: () => void;
  onAutoCalculateDoppler: () => void;
}

export function UltrasoundObstetricFields({
  form,
  selectClassName,
  modeFlags,
  uterusPositions,
  uterusVolume,
  rightOvaryVolume,
  leftOvaryVolume,
  includeDoppler,
  bppTotal,
  onAutoCalculateUterusVolume,
  onAutoCalculateOvaryVolume,
  onAutoCalculateHadlock,
  onAutoCalculateDoppler,
}: UltrasoundObstetricFieldsProps) {
  const { register, setValue } = form;
  const showDoppler = includeDoppler ?? modeFlags.isMorfologicaMode;

  if (modeFlags.isObs1TMode) {
    return (
      <div className="space-y-4">
        {/* Bloque 1T: Saco Gestacional, Embrión y Vitalidad */}
        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
          <h3 className="border-b border-border pb-2 text-xs font-bold tracking-wider text-primary uppercase">
            {modeFlags.isGeneticMode
              ? "Biometría Embrionaria / Fetal & Vitalidad (I Trimestre)"
              : "Saco Gestacional, Embrión & Vitalidad (I Trimestre)"}
          </h3>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-12">
            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor="sacs"
                className="block text-xs font-semibold text-foreground"
              >
                Sacos Gest.
              </label>
              <Input
                id="sacs"
                type="number"
                min={0}
                max={8}
                placeholder="1"
                className="font-mono"
                {...register("findings.gestationalSacsCount", {
                  setValueAs: toOptionalNumber,
                })}
              />
            </div>

            {!modeFlags.isGeneticMode ? (
              <>
                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="gs-mm"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Saco Gest. (mm)
                  </label>
                  <Input
                    id="gs-mm"
                    type="number"
                    step="0.1"
                    placeholder="24"
                    className="font-mono"
                    {...register("findings.gestationalSacMm", {
                      setValueAs: toOptionalNumber,
                    })}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="yolk-mm"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Ves. Vitelina (mm)
                  </label>
                  <Input
                    id="yolk-mm"
                    type="number"
                    step="0.1"
                    placeholder="5"
                    className="font-mono"
                    {...register("findings.yolkSacMm", {
                      setValueAs: toOptionalNumber,
                    })}
                  />
                </div>
              </>
            ) : null}

            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor="crl"
                className="block text-xs font-semibold text-foreground"
              >
                CRL / LCN (mm)
              </label>
              <Input
                id="crl"
                type="number"
                step="0.1"
                placeholder="22"
                className="font-mono"
                {...register("findings.embryoCrownRumpLengthMm", {
                  setValueAs: toOptionalNumber,
                })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor="eg-eco"
                className="block text-xs font-semibold text-foreground"
              >
                Edad Gestacional
              </label>
              <Input
                id="eg-eco"
                placeholder="9 semanas 0 días"
                {...register("findings.gestationalAgeByEcho")}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor="fcf"
                className="block text-xs font-semibold text-foreground"
              >
                Act. Cardíaca (lpm)
              </label>
              <Input
                id="fcf"
                type="number"
                min={0}
                max={260}
                placeholder="166"
                className="font-mono"
                {...register("findings.fetalHeartRate", {
                  setValueAs: toOptionalNumber,
                })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-12">
              <label
                htmlFor="chorio"
                className="block text-xs font-semibold text-foreground"
              >
                Reacción Coriodecidual / Hematomas / Corion
              </label>
              <Input
                id="chorio"
                placeholder="Reacción coriodecidual adecuada, sin evidencia de hematomas..."
                {...register("findings.choriodecidualReaction")}
              />
            </div>
          </div>
        </div>

        {/* Bloque Específico Ecografía Genética 11-14 Semanas */}
        {modeFlags.isGeneticMode ? (
          <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <h3 className="border-b border-primary/20 pb-2 text-xs font-bold tracking-wider text-primary uppercase">
              Marcadores Genéticos & Riesgo de Preeclampsia (11–14 Semanas)
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="space-y-1.5 sm:col-span-3">
                <label
                  htmlFor="tn-mm"
                  className="block text-xs font-semibold text-foreground"
                >
                  Translucencia Nucal (mm)
                </label>
                <Input
                  id="tn-mm"
                  type="number"
                  step="0.1"
                  placeholder="1.2"
                  className="bg-card font-mono"
                  {...register("findings.nuchalTranslucencyMm", {
                    setValueAs: toOptionalNumber,
                  })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <label
                  htmlFor="nasal-bone"
                  className="block text-xs font-semibold text-foreground"
                >
                  Hueso Nasal
                </label>
                <select
                  id="nasal-bone"
                  className={selectClassName}
                  {...register("findings.nasalBone", {
                    setValueAs: toOptionalEnumValue,
                  })}
                >
                  <option value="">Seleccione...</option>
                  {NASAL_BONE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <label
                  htmlFor="dv-wave"
                  className="block text-xs font-semibold text-foreground"
                >
                  Ductus Venoso (Onda)
                </label>
                <select
                  id="dv-wave"
                  className={selectClassName}
                  {...register("findings.ductusVenosusWave", {
                    setValueAs: toOptionalEnumValue,
                  })}
                >
                  <option value="">Seleccione...</option>
                  {DUCTUS_VENOSUS_WAVE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <label
                  htmlFor="dv-pi"
                  className="block text-xs font-semibold text-foreground"
                >
                  IP Ductus Venoso
                </label>
                <Input
                  id="dv-pi"
                  type="number"
                  step="0.01"
                  placeholder="0.89"
                  className="bg-card font-mono"
                  {...register("findings.ductusVenosusPi", {
                    setValueAs: toOptionalNumber,
                  })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-4">
                <label
                  htmlFor="ut-mean-pi"
                  className="block text-xs font-semibold text-foreground"
                >
                  IP Promedio Arterias Uterinas
                </label>
                <Input
                  id="ut-mean-pi"
                  type="number"
                  step="0.01"
                  placeholder="1.50"
                  className="bg-card font-mono"
                  {...register("findings.uterineArteriesMeanPi", {
                    setValueAs: toOptionalNumber,
                  })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-4">
                <label
                  htmlFor="risk-chromo"
                  className="block text-xs font-semibold text-foreground"
                >
                  Riesgo Cromosomopatías
                </label>
                <select
                  id="risk-chromo"
                  className={selectClassName}
                  {...register("findings.chromosomopathyRisk", {
                    setValueAs: toOptionalEnumValue,
                  })}
                >
                  <option value="">Seleccione...</option>
                  {RISK_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-4">
                <label
                  htmlFor="risk-pe"
                  className="block text-xs font-semibold text-foreground"
                >
                  Riesgo Preeclampsia (&lt;37 ss)
                </label>
                <select
                  id="risk-pe"
                  className={selectClassName}
                  {...register("findings.preeclampsiaRisk", {
                    setValueAs: toOptionalEnumValue,
                  })}
                >
                  <option value="">Seleccione...</option>
                  {RISK_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : null}

        {/* Bloque Materno: Útero, Cérvix, Ovarios y Douglas */}
        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
            <h3 className="text-xs font-bold tracking-wider text-primary uppercase">
              Útero, Cérvix y Anexos Maternos
            </h3>
            {typeof uterusVolume === "number" ? (
              <Badge variant="outline" className="font-mono text-xs">
                Volumen Útero: {uterusVolume} cc
              </Badge>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="space-y-1.5 sm:col-span-3">
              <label
                htmlFor="obs-ut-pos"
                className="block text-xs font-semibold text-foreground"
              >
                Posición del Útero
              </label>
              <select
                id="obs-ut-pos"
                className={selectClassName}
                {...register("findings.uterusPosition", {
                  setValueAs: toOptionalEnumValue,
                })}
              >
                <option value="">Seleccione...</option>
                {uterusPositions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="obs-ut-dim"
                  className="block text-xs font-semibold text-foreground"
                >
                  Dimensiones Útero (mm)
                </label>
                <button
                  type="button"
                  onClick={() => onAutoCalculateUterusVolume()}
                  className="inline-flex cursor-pointer items-center gap-1 font-mono text-[10.5px] font-semibold text-primary hover:underline"
                >
                  <Calculator className="size-3" />
                  Calcular cc
                </button>
              </div>
              <Input
                id="obs-ut-dim"
                placeholder="88 x 51 x 60 mm"
                className="font-mono"
                {...register("findings.uterusDimensions", {
                  onBlur: (e) =>
                    onAutoCalculateUterusVolume(
                      (e.target as HTMLInputElement).value
                    ),
                })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-4">
              <label
                htmlFor="obs-cervix-mm"
                className="block text-xs font-semibold text-foreground"
              >
                Longitud Cervical (mm)
              </label>
              <Input
                id="obs-cervix-mm"
                type="number"
                step="0.5"
                placeholder="33"
                className="font-mono"
                {...register("findings.cervixLengthMm", {
                  setValueAs: toOptionalNumber,
                })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-6">
              <label
                htmlFor="obs-myometrium"
                className="block text-xs font-semibold text-foreground"
              >
                Miometrio
              </label>
              <Input
                id="obs-myometrium"
                placeholder="Parénquima homogéneo..."
                {...register("findings.myometriumStatus")}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-6">
              <label
                htmlFor="obs-cervix-status"
                className="block text-xs font-semibold text-foreground"
              >
                Cérvix (Morfología / Orificio)
              </label>
              <Input
                id="obs-cervix-status"
                placeholder="Morfología conservada, OCI cerrado"
                {...register("findings.cervixStatus")}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-4">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="obs-ov-r"
                  className="block text-xs font-semibold text-foreground"
                >
                  Ovario Derecho
                </label>
                {typeof rightOvaryVolume === "number" ? (
                  <span className="font-mono text-[10.5px] text-primary">
                    {rightOvaryVolume} cc
                  </span>
                ) : null}
              </div>
              <Input
                id="obs-ov-r"
                placeholder="30 x 13 x 22 mm"
                {...register("findings.rightOvaryDimensions", {
                  onBlur: (e) =>
                    onAutoCalculateOvaryVolume(
                      "right",
                      (e.target as HTMLInputElement).value
                    ),
                })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-4">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="obs-ov-l"
                  className="block text-xs font-semibold text-foreground"
                >
                  Ovario Izquierdo
                </label>
                {typeof leftOvaryVolume === "number" ? (
                  <span className="font-mono text-[10.5px] text-primary">
                    {leftOvaryVolume} cc
                  </span>
                ) : null}
              </div>
              <Input
                id="obs-ov-l"
                placeholder="28 x 14 x 15 mm"
                {...register("findings.leftOvaryDimensions", {
                  onBlur: (e) =>
                    onAutoCalculateOvaryVolume(
                      "left",
                      (e.target as HTMLInputElement).value
                    ),
                })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-4">
              <label
                htmlFor="obs-douglas"
                className="block text-xs font-semibold text-foreground"
              >
                Fondo de Saco de Douglas
              </label>
              <Input
                id="obs-douglas"
                placeholder="Libre de colecciones"
                {...register("findings.douglasPouch")}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Branch B: OBSTETRICA_2T_3T y OBSTETRICA_MORFOLOGICA
  return (
    <div className="space-y-4">
      {/* 1. Estática, Vitalidad y Anatomía Fetal */}
      <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
        <h3 className="border-b border-border pb-2 text-xs font-bold tracking-wider text-primary uppercase">
          Estática, Vitalidad & Evaluación Anatómica Fetal
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="space-y-1.5 sm:col-span-4">
            <label
              htmlFor="fetal-static"
              className="block text-xs font-semibold text-foreground"
            >
              Estática / Presentación Fetal
            </label>
            <Input
              id="fetal-static"
              placeholder="Feto único activo en longitudinal, cefálico"
              {...register("findings.fetalStatic")}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-3">
            <label
              htmlFor="fetal-sex"
              className="block text-xs font-semibold text-foreground"
            >
              Sexo Fetal
            </label>
            <select
              id="fetal-sex"
              className={selectClassName}
              {...register("findings.fetalSex", {
                setValueAs: toOptionalEnumValue,
              })}
            >
              <option value="">No especificado</option>
              {FETAL_SEX_OPTIONS.map((sx) => (
                <option key={sx} value={sx}>
                  {sx}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-3">
            <label
              htmlFor="obs23-eg"
              className="block text-xs font-semibold text-foreground"
            >
              Edad Gestacional Eco
            </label>
            <Input
              id="obs23-eg"
              placeholder="32 semanas 6 días"
              {...register("findings.gestationalAgeByEcho")}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label
              htmlFor="obs23-fcf"
              className="block text-xs font-semibold text-foreground"
            >
              F.C.F. (lpm)
            </label>
            <Input
              id="obs23-fcf"
              type="number"
              min={0}
              max={260}
              placeholder="153"
              className="font-mono"
              {...register("findings.fetalHeartRate", {
                setValueAs: toOptionalNumber,
              })}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-6">
            <label
              htmlFor="fetal-heart"
              className="block text-xs font-semibold text-foreground"
            >
              Corazón Fetal (4 Cavidades)
            </label>
            <Input
              id="fetal-heart"
              placeholder="De cuatro cavidades, actividad cardíaca rítmica"
              {...register("findings.fetalHeartFourChambers")}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-6">
            <label
              htmlFor="fetal-abdomen"
              className="block text-xs font-semibold text-foreground"
            >
              Pared Abdominal, Estómago & Vejiga
            </label>
            <Input
              id="fetal-abdomen"
              placeholder="Pared íntegra, líquido en cámara gástrica y vejiga"
              {...register("findings.fetalAbdominalWall")}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-6">
            <label
              htmlFor="fetal-kidneys"
              className="block text-xs font-semibold text-foreground"
            >
              Riñones Fetales
            </label>
            <Input
              id="fetal-kidneys"
              placeholder="Morfológicamente conservados sin dilataciones"
              {...register("findings.fetalKidneys")}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-6">
            <label
              htmlFor="fetal-spine"
              className="block text-xs font-semibold text-foreground"
            >
              Columna Vertebral
            </label>
            <Input
              id="fetal-spine"
              placeholder="Sin soluciones de continuidad"
              {...register("findings.fetalSpine")}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-12">
            <label
              htmlFor="fetal-anatomy"
              className="block text-xs font-semibold text-foreground"
            >
              Resumen Morfológico General (Encéfalo, Cara, Tórax, Extremidades)
            </label>
            <Textarea
              id="fetal-anatomy"
              rows={2}
              placeholder="Feto morfológicamente normal en estructuras encefálicas, cervicales, faciales, torácicas, abdominales, pélvicas y extremidades..."
              {...register("findings.fetalAnatomySummary")}
            />
          </div>
        </div>
      </div>

      {/* 2. Biometría Fetal & Ponderado Hadlock */}
      <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
          <h3 className="text-xs font-bold tracking-wider text-primary uppercase">
            Biometría Fetal & Ponderado Estimado (Hadlock)
          </h3>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onAutoCalculateHadlock}
          >
            <Calculator className="size-3" />
            Calcular Ponderado Hadlock
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-12">
          <div className="space-y-1 sm:col-span-2">
            <label
              htmlFor="bio-dbp"
              className="block text-xs font-semibold text-foreground"
            >
              DBP (mm)
            </label>
            <Input
              id="bio-dbp"
              type="number"
              step="0.1"
              placeholder="89"
              className="font-mono"
              {...register("findings.bpdMm", { setValueAs: toOptionalNumber })}
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label
              htmlFor="bio-cc"
              className="block text-xs font-semibold text-foreground"
            >
              CC (mm)
            </label>
            <Input
              id="bio-cc"
              type="number"
              step="0.1"
              placeholder="302"
              className="font-mono"
              {...register("findings.hcMm", { setValueAs: toOptionalNumber })}
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label
              htmlFor="bio-ca"
              className="block text-xs font-semibold text-foreground"
            >
              CA (mm)
            </label>
            <Input
              id="bio-ca"
              type="number"
              step="0.1"
              placeholder="286"
              className="font-mono"
              {...register("findings.acMm", { setValueAs: toOptionalNumber })}
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label
              htmlFor="bio-lf"
              className="block text-xs font-semibold text-foreground"
            >
              LF (mm)
            </label>
            <Input
              id="bio-lf"
              type="number"
              step="0.1"
              placeholder="60"
              className="font-mono"
              {...register("findings.flMm", { setValueAs: toOptionalNumber })}
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label
              htmlFor="bio-efw"
              className="block text-xs font-semibold text-foreground"
            >
              Ponderado (g)
            </label>
            <Input
              id="bio-efw"
              type="number"
              placeholder="1954"
              className="font-mono"
              {...register("findings.estimatedFetalWeightGr", {
                setValueAs: toOptionalNumber,
              })}
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label
              htmlFor="bio-pct"
              className="block text-xs font-semibold text-foreground"
            >
              Percentil
            </label>
            <Input
              id="bio-pct"
              placeholder="Percentil 49"
              {...register("findings.estimatedFetalWeightPercentile")}
            />
          </div>
        </div>
      </div>

      {/* 3. Perfil Biofísico Fetal (Manning) */}
      <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
          <h3 className="text-xs font-bold tracking-wider text-primary uppercase">
            Perfil Biofísico Fetal (PBF / 8 Puntos)
          </h3>
          <Badge variant="outline" className="font-mono text-xs">
            Total PBF: {bppTotal !== null ? `${bppTotal} / 8` : "Sin evaluar"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-foreground">
              Mov. Corporales
            </label>
            <select
              className={selectClassName}
              {...register("findings.bppBodyMovements", {
                setValueAs: toOptionalNumber,
              })}
            >
              <option value="">Sin evaluar</option>
              <option value="2">2 puntos (Presentes)</option>
              <option value="0">0 puntos (Ausentes)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-foreground">
              Mov. Respiratorios
            </label>
            <select
              className={selectClassName}
              {...register("findings.bppBreathingMovements", {
                setValueAs: toOptionalNumber,
              })}
            >
              <option value="">Sin evaluar</option>
              <option value="2">2 puntos (Presentes)</option>
              <option value="0">0 puntos (Ausentes)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-foreground">
              Tono Muscular
            </label>
            <select
              className={selectClassName}
              {...register("findings.bppMuscleTone", {
                setValueAs: toOptionalNumber,
              })}
            >
              <option value="">Sin evaluar</option>
              <option value="2">2 puntos (Adecuado)</option>
              <option value="0">0 puntos (Ausente)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-foreground">
              Líquido Amniótico
            </label>
            <select
              className={selectClassName}
              {...register("findings.bppAmnioticFluid", {
                setValueAs: toOptionalNumber,
              })}
            >
              <option value="">Sin evaluar</option>
              <option value="2">2 puntos (Normal)</option>
              <option value="0">0 puntos (Disminuido)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Placenta, Cordón Umbilical y Líquido Amniótico */}
      <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
        <h3 className="border-b border-border pb-2 text-xs font-bold tracking-wider text-primary uppercase">
          Placenta (Grannum), Cordón Umbilical & Líquido Amniótico
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="space-y-1.5 sm:col-span-5">
            <label
              htmlFor="plac-loc"
              className="block text-xs font-semibold text-foreground"
            >
              Ubicación Placentaria
            </label>
            <Input
              id="plac-loc"
              placeholder="Fúndica posterior / Anterior"
              {...register("findings.placentaLocation")}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-3">
            <label
              htmlFor="plac-grade"
              className="block text-xs font-semibold text-foreground"
            >
              Grado Grannum
            </label>
            <select
              id="plac-grade"
              className={selectClassName}
              {...register("findings.placentaGrade", {
                setValueAs: toOptionalEnumValue,
              })}
            >
              <option value="">Seleccione...</option>
              {PLACENTA_GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-4">
            <label
              htmlFor="ila-mm"
              className="block text-xs font-semibold text-foreground"
            >
              ILA (mm)
            </label>
            <Input
              id="ila-mm"
              type="number"
              step="0.5"
              placeholder="159"
              className="font-mono"
              {...register("findings.amnioticFluidIlaMm", {
                setValueAs: toOptionalNumber,
              })}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-6">
            <label
              htmlFor="plac-hemat"
              className="block text-xs font-semibold text-foreground"
            >
              Hematomas / Desprendimiento
            </label>
            <Input
              id="plac-hemat"
              placeholder="No se visualizan hematomas ni desprendimiento"
              {...register("findings.placentaHematomas")}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-6">
            <label
              htmlFor="cord"
              className="block text-xs font-semibold text-foreground"
            >
              Cordón Umbilical (Vasos, Inserción, Circular)
            </label>
            <Input
              id="cord"
              placeholder="Dos arterias y una vena, inserción excéntrica, sin circular"
              {...register("findings.umbilicalCord")}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-12">
            <label
              htmlFor="afi-notes"
              className="block text-xs font-semibold text-foreground"
            >
              Descripción Líquido Amniótico (4 Cuadrantes / Pozo Mayor)
            </label>
            <Input
              id="afi-notes"
              placeholder="Observado en los cuatro cuadrantes en volumen normal..."
              {...register("findings.amnioticFluidIndex")}
            />
          </div>
        </div>
      </div>

      {/* 5. Estudio Doppler Materno-Fetal (7 Vasos) */}
      <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-bold tracking-wider text-primary uppercase">
            <input
              type="checkbox"
              className="size-3.5 accent-primary"
              checked={showDoppler}
              onChange={(e) =>
                setValue("findings.includeDoppler", e.target.checked, {
                  shouldDirty: true,
                })
              }
            />
            <span>Incluir Tabla de Estudio Doppler Materno-Fetal (7 Vasos)</span>
          </label>

          {showDoppler ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="bg-card"
              onClick={onAutoCalculateDoppler}
            >
              <Calculator className="size-3" />
              Calcular ICP y Prom. Uterinas
            </Button>
          ) : null}
        </div>

        {showDoppler ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold text-muted-foreground">
                  <th className="px-2.5 py-2">Vaso Evaluado</th>
                  <th className="w-28 px-2 py-2">IP</th>
                  <th className="w-28 px-2 py-2">Percentil</th>
                  <th className="w-36 px-2.5 py-2">Interpretación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DOPPLER_VESSEL_META.map((vessel) => (
                  <tr key={vessel.key}>
                    <td className="px-2.5 py-1.5 font-medium text-foreground">
                      {vessel.label}
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.95"
                        className="h-7 font-mono text-xs"
                        {...register(`findings.doppler.${vessel.key}.pi`, {
                          setValueAs: toOptionalNumber,
                        })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        placeholder="p50"
                        className="h-7 font-mono text-xs"
                        {...register(
                          `findings.doppler.${vessel.key}.percentile`
                        )}
                      />
                    </td>
                    <td className="px-2.5 py-1.5">
                      <select
                        className="h-7 w-full rounded-md border border-input bg-card px-2 text-xs outline-none focus-visible:border-ring"
                        {...register(`findings.doppler.${vessel.key}.status`, {
                          setValueAs: toOptionalEnumValue,
                        })}
                      >
                        <option value="">—</option>
                        {DOPPLER_INTERPRETATIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
