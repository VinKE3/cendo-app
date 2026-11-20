"use client";

import type { UseFormReturn } from "react-hook-form";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { UltrasoundBreastLesionRecord } from "@/db/schema/specialty";
import {
  formatBreastLesionSentence,
  type CreateUltrasoundInput,
} from "@/features/ecografias/ecografias.schema";
import { toOptionalEnumValue } from "@/features/ecografias/hooks/use-ecografias";

interface UltrasoundBreastFieldsProps {
  form: UseFormReturn<CreateUltrasoundInput>;
  selectClassName: string;
  biradsOptions: readonly string[];
  breastAcrTypes: readonly ("Tipo A" | "Tipo B" | "Tipo C" | "Tipo D")[];
  breastAcrLabels: Record<"Tipo A" | "Tipo B" | "Tipo C" | "Tipo D", string>;
  lesionTypes: readonly string[];
  lesions: UltrasoundBreastLesionRecord[];
  onAddLesion: (lesionType?: string) => void;
  onUpdateLesion: (
    index: number,
    patch: Partial<UltrasoundBreastLesionRecord>
  ) => void;
  onRemoveLesion: (index: number) => void;
  onFillStandardComplement: () => void;
}

export function UltrasoundBreastFields({
  form,
  selectClassName,
  biradsOptions,
  breastAcrTypes,
  breastAcrLabels,
  lesionTypes,
  lesions,
  onAddLesion,
  onUpdateLesion,
  onRemoveLesion,
  onFillStandardComplement,
}: UltrasoundBreastFieldsProps) {
  const { register, setValue, getValues } = form;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <h3 className="border-b border-border pb-2 text-xs font-bold tracking-wider text-primary uppercase">
        Evaluación Ecográfica Mamaria Bilateral (ACR BI-RADS)
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="space-y-1.5 sm:col-span-6">
          <label
            htmlFor="breast-acr"
            className="block text-xs font-semibold text-foreground"
          >
            Tipo de Mama ACR
          </label>
          <select
            id="breast-acr"
            className={selectClassName}
            {...register("findings.breastAcrType", {
              setValueAs: toOptionalEnumValue,
              onChange: (e) => {
                const val = e.target.value as
                  | ""
                  | "Tipo A"
                  | "Tipo B"
                  | "Tipo C"
                  | "Tipo D";
                if (!val) return;
                const currentPattern = (
                  getValues("findings.breastPattern") || ""
                ).trim();
                const isDefaultAcrText = Object.values(breastAcrLabels).some(
                  (lbl) => currentPattern === `Ambas mamas con ${lbl.toLowerCase()}.`
                );
                if (!currentPattern || isDefaultAcrText) {
                  setValue(
                    "findings.breastPattern",
                    `Ambas mamas con ${breastAcrLabels[val].toLowerCase()}.`,
                    { shouldDirty: true }
                  );
                }
              },
            })}
          >
            <option value="">Seleccione tipo ACR...</option>
            {breastAcrTypes.map((acr) => (
              <option key={acr} value={acr}>
                {breastAcrLabels[acr]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-6">
          <label
            htmlFor="birads"
            className="block text-xs font-semibold text-foreground"
          >
            Categoría ACR BI-RADS
          </label>
          <select
            id="birads"
            className={selectClassName}
            {...register("findings.biradsCategory", {
              setValueAs: toOptionalEnumValue,
            })}
          >
            <option value="">Seleccione categoría BI-RADS...</option>
            {biradsOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-12">
          <label
            htmlFor="breast-pattern"
            className="block text-xs font-semibold text-foreground"
          >
            Patrón Fibroglandular y Ecotextura General
          </label>
          <Input
            id="breast-pattern"
            placeholder="Ej. Ambas mamas con ecotextura homogénea predominantemente fibroglandular (Tipo B)."
            {...register("findings.breastPattern")}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-6">
          <label
            htmlFor="breast-r"
            className="block text-xs font-semibold text-foreground"
          >
            Mama Derecha y Axila
          </label>
          <Textarea
            id="breast-r"
            rows={3}
            placeholder="Sin nódulos, quistes ni áreas de distorsión arquitectural..."
            {...register("findings.rightBreastFindings")}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-6">
          <label
            htmlFor="breast-l"
            className="block text-xs font-semibold text-foreground"
          >
            Mama Izquierda y Axila
          </label>
          <Textarea
            id="breast-l"
            rows={3}
            placeholder="Sin nódulos, quistes ni áreas de distorsión arquitectural..."
            {...register("findings.leftBreastFindings")}
          />
        </div>
      </div>

      {/* Lesiones Mamarias Estructuradas (Opcional para estudios patológicos) */}
      <div className="space-y-2.5 rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="block text-xs font-semibold text-foreground">
              Hallazgos / Lesiones Focales Estructuradas ({lesions.length})
            </span>
            <p className="text-[11px] text-muted-foreground">
              Opcional para mamas patológicas (quiste simple, complicado,
              fibroadenoma, nódulo sólido).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              aria-label="Añadir lesión mamaria desde plantilla"
              value=""
              onChange={(e) => {
                if (e.target.value) onAddLesion(e.target.value);
              }}
              className="h-7 rounded-md border border-input bg-card px-2 text-xs text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <option value="">+ Añadir lesión tipo...</option>
              {lesionTypes.map((lt) => (
                <option key={lt} value={lt}>
                  + {lt}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => onAddLesion()}
            >
              <Plus className="size-3" />
              Nueva Lesión
            </Button>
          </div>
        </div>

        {lesions.length > 0 ? (
          <div className="space-y-2.5">
            {lesions.map((lesion, idx) => (
              <div
                key={lesion.id}
                className="space-y-2.5 rounded-lg border border-border bg-muted/20 p-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-1.5">
                  <span className="font-mono text-[11px] font-bold text-primary">
                    LESIÓN #{idx + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveLesion(idx)}
                    aria-label="Eliminar lesión mamaria"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-12">
                  <div className="space-y-1 sm:col-span-3">
                    <label className="block text-[10.5px] font-medium">
                      Lado *
                    </label>
                    <select
                      value={lesion.breastSide}
                      onChange={(e) =>
                        onUpdateLesion(idx, {
                          breastSide: e.target.value as
                            | "Derecha"
                            | "Izquierda"
                            | "Bilateral",
                        })
                      }
                      className={selectClassName}
                    >
                      <option value="Derecha">Derecha</option>
                      <option value="Izquierda">Izquierda</option>
                      <option value="Bilateral">Bilateral</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-5">
                    <label className="block text-[10.5px] font-medium">
                      Tipo de Lesión *
                    </label>
                    <Input
                      value={lesion.lesionType}
                      onChange={(e) =>
                        onUpdateLesion(idx, { lesionType: e.target.value })
                      }
                      placeholder="Quiste simple / Fibroadenoma"
                      className="bg-card"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-[10.5px] font-medium">
                      Horario
                    </label>
                    <Input
                      value={lesion.clockHour ?? ""}
                      onChange={(e) =>
                        onUpdateLesion(idx, { clockHour: e.target.value })
                      }
                      placeholder="R10"
                      className="bg-card font-mono"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-[10.5px] font-medium">
                      Dimensiones
                    </label>
                    <Input
                      value={lesion.dimensionsMm ?? ""}
                      onChange={(e) =>
                        onUpdateLesion(idx, { dimensionsMm: e.target.value })
                      }
                      placeholder="12 x 5 mm"
                      className="bg-card font-mono"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-3">
                    <label className="block text-[10.5px] font-medium">
                      Dist. Pezón
                    </label>
                    <Input
                      value={lesion.distanceFromNippleCm ?? ""}
                      onChange={(e) =>
                        onUpdateLesion(idx, {
                          distanceFromNippleCm: e.target.value,
                        })
                      }
                      placeholder="2 cm"
                      className="bg-card"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-3">
                    <label className="block text-[10.5px] font-medium">
                      Profundidad
                    </label>
                    <Input
                      value={lesion.depthFromSkinMm ?? ""}
                      onChange={(e) =>
                        onUpdateLesion(idx, { depthFromSkinMm: e.target.value })
                      }
                      placeholder="12 mm"
                      className="bg-card"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-3">
                    <label className="block text-[10.5px] font-medium">
                      Márgenes
                    </label>
                    <Input
                      value={lesion.margins ?? ""}
                      onChange={(e) =>
                        onUpdateLesion(idx, { margins: e.target.value })
                      }
                      placeholder="circunscritos / microlobulados"
                      className="bg-card"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-3">
                    <label className="block text-[10.5px] font-medium">
                      Patrón Ecográfico
                    </label>
                    <Input
                      value={lesion.echoPattern ?? ""}
                      onChange={(e) =>
                        onUpdateLesion(idx, { echoPattern: e.target.value })
                      }
                      placeholder="anecoico / isoecoico"
                      className="bg-card"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-4">
                    <label className="block text-[10.5px] font-medium">
                      Forma
                    </label>
                    <Input
                      value={lesion.shape ?? ""}
                      onChange={(e) =>
                        onUpdateLesion(idx, { shape: e.target.value })
                      }
                      placeholder="ovalada / redondeada"
                      className="bg-card"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-4">
                    <label className="block text-[10.5px] font-medium">
                      Orientación
                    </label>
                    <Input
                      value={lesion.orientation ?? ""}
                      onChange={(e) =>
                        onUpdateLesion(idx, { orientation: e.target.value })
                      }
                      placeholder="paralela / no paralela"
                      className="bg-card"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-4">
                    <label className="block text-[10.5px] font-medium">
                      Acústica Posterior
                    </label>
                    <Input
                      value={lesion.posteriorAcoustic ?? ""}
                      onChange={(e) =>
                        onUpdateLesion(idx, {
                          posteriorAcoustic: e.target.value,
                        })
                      }
                      placeholder="con refuerzo posterior"
                      className="bg-card"
                    />
                  </div>
                </div>

                <p className="rounded border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] italic text-foreground">
                  {formatBreastLesionSentence(lesion)}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Complemento Mamario Estándar */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="breast-complement"
            className="block text-xs font-semibold text-foreground"
          >
            Complemento (Complejo Areola-Pezón, Piel, Ectasia Ductal & Axilas)
          </label>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onFillStandardComplement}
          >
            <Sparkles className="size-3" />
            Rellenar Complemento Normal
          </Button>
        </div>
        <Textarea
          id="breast-complement"
          rows={2}
          placeholder="Complejo areola-pezón, región retroareolar y piel sin alteraciones; sin ectasia ductal ni adenopatías axilares..."
          {...register("findings.breastComplement")}
        />
      </div>
    </div>
  );
}
