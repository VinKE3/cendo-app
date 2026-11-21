"use client";

import type { BaseSyntheticEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Star } from "lucide-react";
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
  Cie10FormValues,
  Cie10RecordItem,
} from "@/features/cie10/cie10.schema";

interface Cie10ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Cie10RecordItem | null;
  categories: string[];
  form: UseFormReturn<Cie10FormValues>;
  isSubmitting: boolean;
  onSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
}

export function Cie10Modal({
  open,
  onOpenChange,
  editingItem,
  categories,
  form,
  isSubmitting,
  onSubmit,
}: Cie10ModalProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Editar Diagnóstico CIE-10" : "Nuevo Diagnóstico CIE-10"}
          </DialogTitle>
          <DialogDescription>
            El código registrado estará disponible al instante en el buscador
            clínico y en los formularios de historia médica.
          </DialogDescription>
        </DialogHeader>

        <form id="cie10-form" onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="space-y-1.5 sm:col-span-4">
              <label htmlFor="cie10-code" className="block text-xs font-medium">
                Código CIE-10 *
              </label>
              <Input
                id="cie10-code"
                placeholder="Ej. N80.3"
                maxLength={15}
                className="font-mono uppercase"
                aria-invalid={Boolean(errors.code)}
                {...register("code")}
              />
              {errors.code ? (
                <p className="text-xs text-destructive">{errors.code.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5 sm:col-span-8">
              <label
                htmlFor="cie10-category"
                className="block text-xs font-medium"
              >
                Área Clínica *
              </label>
              <select
                id="cie10-category"
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                {...register("category")}
              >
                {editingItem && !categories.includes(editingItem.category) ? (
                  <option value={editingItem.category}>
                    {editingItem.category}
                  </option>
                ) : null}
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category ? (
                <p className="text-xs text-destructive">
                  {errors.category.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cie10-name" className="block text-xs font-medium">
              Descripción Diagnóstica *
            </label>
            <Textarea
              id="cie10-name"
              rows={2}
              placeholder="Ej. Endometriosis del peritoneo pélvico y tabique rectovaginal"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="cie10-keywords"
              className="block text-xs font-medium"
            >
              Palabras Clave de Búsqueda (separadas por comas)
            </label>
            <Input
              id="cie10-keywords"
              placeholder="Ej. adenomiosis, dolor pelvico, endometrio"
              aria-invalid={Boolean(errors.keywordsText)}
              {...register("keywordsText")}
            />
            {errors.keywordsText ? (
              <p className="text-xs text-destructive">
                {errors.keywordsText.message}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Ayuda a encontrar rápidamente el diagnóstico al escribir
                sinónimos en consulta.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground select-none">
              <input
                type="checkbox"
                className="size-4 rounded border-border accent-primary"
                {...register("isFavorite")}
              />
              <Star className="size-3.5 fill-warning text-warning" />
              Marcar como diagnóstico frecuente (acceso rápido de 1 clic en
              formularios)
            </label>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" form="cie10-form" disabled={isSubmitting}>
            {isSubmitting
              ? "Guardando..."
              : editingItem
                ? "Guardar Cambios"
                : "Registrar CIE-10"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
