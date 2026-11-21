"use client";

import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { FlaskConical, Lock, Plus, Trash2 } from "lucide-react";
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
import type {
  ProcedureTariffItem,
  TariffInput,
} from "@/features/tarifario/tarifario.schema";
import { formatCurrency } from "@/lib/utils";

interface TariffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: ProcedureTariffItem | null;
  categories: string[];
  externalLabs: string[];
  form: UseFormReturn<TariffInput>;
  isSubmitting: boolean;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
}

export function TariffModal({
  open,
  onOpenChange,
  editingItem,
  categories,
  externalLabs,
  form,
  isSubmitting,
  onSubmit,
}: TariffModalProps) {
  const {
    control,
    register,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "providerCosts",
  });

  const watchedPrice = useWatch({ control, name: "price" });
  const watchedProviderCosts = useWatch({ control, name: "providerCosts" });
  const cendoPrice = Number.isFinite(Number(watchedPrice))
    ? Number(watchedPrice)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Editar Prestación del Tarifario" : "Nueva Prestación CENDO"}
          </DialogTitle>
          <DialogDescription>
            Defina el código único, categoría clínica y precio oficial en soles (PEN).
          </DialogDescription>
        </DialogHeader>

        <form id="tariff-form" onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="tariff-code" className="block text-xs font-medium">
                Código Único
              </label>
              <Input
                id="tariff-code"
                placeholder="CONS-ESP"
                className="font-mono uppercase"
                aria-invalid={Boolean(errors.code)}
                {...register("code")}
              />
              {errors.code ? (
                <p className="text-xs text-destructive">{errors.code.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="tariff-category" className="block text-xs font-medium">
                Categoría
              </label>
              <select
                id="tariff-category"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                {...register("category")}
              >
                {editingItem && !categories.includes(editingItem.category) ? (
                  <option value={editingItem.category}>{editingItem.category}</option>
                ) : null}
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category ? (
                <p className="text-xs text-destructive">{errors.category.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="tariff-name" className="block text-xs font-medium">
              Nombre del Procedimiento / Examen
            </label>
            <Input
              id="tariff-name"
              placeholder="Ej. Colposcopía Digital de Alta Resolución IFCPC"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="tariff-price" className="block text-xs font-medium">
                Precio Oficial (S/)
              </label>
              <Input
                id="tariff-price"
                type="number"
                step="0.01"
                min="0.01"
                className="font-mono tabular-nums"
                aria-invalid={Boolean(errors.price)}
                {...register("price", { valueAsNumber: true })}
              />
              {errors.price ? (
                <p className="text-xs text-destructive">{errors.price.message}</p>
              ) : null}
            </div>

            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground select-none">
                <input
                  type="checkbox"
                  className="size-4 rounded border-border accent-primary"
                  {...register("active")}
                />
                Prestación activa en cotizaciones
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="tariff-description" className="block text-xs font-medium">
              Descripción Clínica
            </label>
            <Textarea
              id="tariff-description"
              rows={2}
              placeholder="Detalle breve del alcance clínico del examen o procedimiento..."
              {...register("description")}
            />
          </div>

          <div className="space-y-2.5 rounded-xl border border-border bg-muted/25 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <FlaskConical className="size-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    Costos por Laboratorio Externo (Opcional)
                  </span>
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <Lock className="size-2.5" />
                    Solo uso interno CENDO
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Si terceriza este análisis (ej. BIOLINK, BIOLAQ), registre cuánto le
                  cobra cada laboratorio para ver su margen real al cotizar.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    laboratoryName: externalLabs[0] ?? "Lab Clínico General",
                    variant: "",
                    cost: 0,
                  })
                }
              >
                <Plus className="size-3.5" />
                Agregar laboratorio
              </Button>
            </div>

            {fields.length > 0 ? (
              <div className="space-y-2">
                {fields.map((field, index) => {
                  const rowCost = Number(watchedProviderCosts?.[index]?.cost ?? 0);
                  const currentLab =
                    watchedProviderCosts?.[index]?.laboratoryName ?? "";
                  const margin = cendoPrice - (Number.isFinite(rowCost) ? rowCost : 0);
                  return (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-card p-2.5 sm:grid-cols-12 sm:items-center"
                    >
                      <div className="sm:col-span-4">
                        <label
                          htmlFor={`provider-lab-${index}`}
                          className="mb-1 block text-[10px] font-medium text-muted-foreground"
                        >
                          Laboratorio externo
                        </label>
                        <select
                          id={`provider-lab-${index}`}
                          className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          {...register(`providerCosts.${index}.laboratoryName`)}
                        >
                          {currentLab && !externalLabs.includes(currentLab) ? (
                            <option value={currentLab}>{currentLab}</option>
                          ) : null}
                          {externalLabs.map((lab) => (
                            <option key={lab} value={lab}>
                              {lab}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label
                          htmlFor={`provider-variant-${index}`}
                          className="mb-1 block text-[10px] font-medium text-muted-foreground"
                        >
                          Modalidad / Nota (opc.)
                        </label>
                        <Input
                          id={`provider-variant-${index}`}
                          placeholder="Ej. Solo / Dentro de VPH"
                          className="h-8 text-xs"
                          {...register(`providerCosts.${index}.variant`)}
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label
                          htmlFor={`provider-cost-${index}`}
                          className="mb-1 block text-[10px] font-medium text-muted-foreground"
                        >
                          Costo Lab (S/)
                        </label>
                        <Input
                          id={`provider-cost-${index}`}
                          type="number"
                          step="0.01"
                          min="0"
                          className="h-8 font-mono text-xs tabular-nums"
                          {...register(`providerCosts.${index}.cost`, {
                            valueAsNumber: true,
                          })}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 sm:col-span-1 sm:justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => remove(index)}
                          aria-label="Quitar laboratorio externo"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:col-span-12">
                        {errors.providerCosts?.[index]?.laboratoryName ? (
                          <span className="text-destructive">
                            {errors.providerCosts[index]?.laboratoryName?.message}
                          </span>
                        ) : errors.providerCosts?.[index]?.cost ? (
                          <span className="text-destructive">
                            {errors.providerCosts[index]?.cost?.message}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Ganancia neta CENDO con esta opción:
                          </span>
                        )}
                        <span
                          className={
                            margin >= 0
                              ? "font-mono font-semibold text-success"
                              : "font-mono font-semibold text-destructive"
                          }
                        >
                          {margin >= 0 ? "+" : ""}
                          {formatCurrency(margin)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-card/50 px-3 py-2 text-center text-[11px] text-muted-foreground">
                Sin laboratorios externos vinculados (prestación 100% CENDO o margen directo).
              </p>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="tariff-form" disabled={isSubmitting}>
            {isSubmitting
              ? "Guardando..."
              : editingItem
                ? "Guardar Cambios"
                : "Registrar Tarifa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
