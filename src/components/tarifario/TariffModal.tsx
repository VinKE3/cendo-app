"use client";

import type { UseFormReturn } from "react-hook-form";
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

interface TariffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: ProcedureTariffItem | null;
  categories: string[];
  form: UseFormReturn<TariffInput>;
  isSubmitting: boolean;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
}

export function TariffModal({
  open,
  onOpenChange,
  editingItem,
  categories,
  form,
  isSubmitting,
  onSubmit,
}: TariffModalProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
              rows={3}
              placeholder="Detalle breve del alcance clínico del examen o procedimiento..."
              {...register("description")}
            />
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
