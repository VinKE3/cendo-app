"use client";

import { Plus, Trash2 } from "lucide-react";
import type { UseFieldArrayReturn, UseFormReturn } from "react-hook-form";
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
  MedicationItem,
  VademecumInput,
} from "@/features/vademecum/vademecum.schema";

interface VademecumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: MedicationItem | null;
  therapeuticGroups: string[];
  form: UseFormReturn<VademecumInput>;
  brandsFieldArray: UseFieldArrayReturn<VademecumInput, "commercialBrands">;
  isSubmitting: boolean;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
}

export function VademecumModal({
  open,
  onOpenChange,
  editingItem,
  therapeuticGroups,
  form,
  brandsFieldArray,
  isSubmitting,
  onSubmit,
}: VademecumModalProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Editar Fármaco del Vademécum" : "Registrar Nuevo Fármaco"}
          </DialogTitle>
          <DialogDescription>
            Defina principio activo, código ATC y marcas comerciales con precio referencial
            en soles.
          </DialogDescription>
        </DialogHeader>

        <form id="vademecum-form" onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="med-generic" className="block text-xs font-medium">
                Principio Activo (Genérico)
              </label>
              <Input
                id="med-generic"
                placeholder="Ej. Dienogest 2 mg"
                aria-invalid={Boolean(errors.genericName)}
                {...register("genericName")}
              />
              {errors.genericName ? (
                <p className="text-xs text-destructive">{errors.genericName.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="med-atc" className="block text-xs font-medium">
                Código ATC
              </label>
              <Input
                id="med-atc"
                placeholder="G03DB08"
                className="font-mono uppercase"
                aria-invalid={Boolean(errors.atcCode)}
                {...register("atcCode")}
              />
              {errors.atcCode ? (
                <p className="text-xs text-destructive">{errors.atcCode.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="med-group" className="block text-xs font-medium">
              Grupo Terapéutico
            </label>
            {therapeuticGroups.length > 0 ? (
              <select
                id="med-group"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                {...register("therapeuticGroup")}
              >
                {editingItem && !therapeuticGroups.includes(editingItem.therapeuticGroup) ? (
                  <option value={editingItem.therapeuticGroup}>
                    {editingItem.therapeuticGroup}
                  </option>
                ) : null}
                {therapeuticGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="med-group"
                placeholder="Progestágenos / Tratamiento de Endometriosis"
                aria-invalid={Boolean(errors.therapeuticGroup)}
                {...register("therapeuticGroup")}
              />
            )}
            {errors.therapeuticGroup ? (
              <p className="text-xs text-destructive">{errors.therapeuticGroup.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="med-indications" className="block text-xs font-medium">
                Indicaciones Clínicas
              </label>
              <Textarea
                id="med-indications"
                rows={2}
                aria-invalid={Boolean(errors.indications)}
                {...register("indications")}
              />
              {errors.indications ? (
                <p className="text-xs text-destructive">{errors.indications.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="med-contraindications" className="block text-xs font-medium">
                Contraindicaciones
              </label>
              <Textarea
                id="med-contraindications"
                rows={2}
                {...register("contraindications")}
              />
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Marcas Comerciales en Perú
              </span>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() =>
                  brandsFieldArray.append({
                    brandName: "",
                    laboratory: "",
                    presentation: "",
                    referencePricePen: 0,
                  })
                }
              >
                <Plus className="size-3.5" />
                Agregar Marca
              </Button>
            </div>

            {brandsFieldArray.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-card p-2.5 sm:grid-cols-12"
              >
                <Input
                  placeholder="Marca"
                  className="sm:col-span-3"
                  {...register(`commercialBrands.${index}.brandName`)}
                />
                <Input
                  placeholder="Laboratorio"
                  className="sm:col-span-3"
                  {...register(`commercialBrands.${index}.laboratory`)}
                />
                <Input
                  placeholder="Presentación"
                  className="sm:col-span-3"
                  {...register(`commercialBrands.${index}.presentation`)}
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="S/"
                  className="font-mono tabular-nums sm:col-span-2"
                  {...register(`commercialBrands.${index}.referencePricePen`, {
                    valueAsNumber: true,
                  })}
                />
                <div className="flex items-center justify-end sm:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={brandsFieldArray.fields.length <= 1}
                    onClick={() => brandsFieldArray.remove(index)}
                    aria-label="Quitar marca"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="vademecum-form" disabled={isSubmitting}>
            {isSubmitting
              ? "Guardando..."
              : editingItem
                ? "Guardar Cambios"
                : "Registrar Fármaco"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
