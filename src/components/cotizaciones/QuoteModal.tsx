"use client";

import type { BaseSyntheticEvent } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  CheckCircle2,
  Link2,
  Plus,
  Printer,
  Receipt,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
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
import type { QuoteItemRecord } from "@/db/schema/clinical";
import type { MedicalConsultationItem } from "@/features/consultas/consultas.schema";
import type { ProcedureQuoteItem } from "@/features/cotizaciones/cotizaciones.schema";
import type {
  CustomQuoteDraft,
  QuoteModalFormValues,
} from "@/features/cotizaciones/hooks/use-cotizaciones";
import type { PatientDirectoryItem } from "@/features/pacientes/pacientes.schema";
import type { ProcedureTariffItem } from "@/features/tarifario/tarifario.schema";
import { formatCurrency, formatPeruDateDisplay } from "@/lib/utils";

interface QuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientDirectoryItem;
  editingItem: ProcedureQuoteItem | null;
  sourceLabel: string | null;
  form: UseFormReturn<QuoteModalFormValues>;
  isSubmitting: boolean;
  consultations: MedicalConsultationItem[];
  watchedConsultationId: string;
  computedValidUntilDate: string;
  validityOptions: readonly number[];
  draftItems: QuoteItemRecord[];
  financials: {
    subtotal: number;
    discountTotal: number;
    total: number;
  };
  tariffSearch: string;
  onTariffSearchChange: (val: string) => void;
  filteredTariffs: ProcedureTariffItem[];
  customDraft: CustomQuoteDraft;
  onCustomDraftChange: (
    updater: (prev: CustomQuoteDraft) => CustomQuoteDraft
  ) => void;
  onAddTariff: (t: ProcedureTariffItem) => void;
  onAddCustom: () => void;
  onUpdateDiscount: (index: number, discountPercent: number) => void;
  onRemoveItem: (index: number) => void;
  onSaveAndPrintIntent: (printAfterSave: boolean) => void;
  onSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
}

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function QuoteModal({
  open,
  onOpenChange,
  patient,
  editingItem,
  sourceLabel,
  form,
  isSubmitting,
  consultations,
  watchedConsultationId,
  computedValidUntilDate,
  validityOptions,
  draftItems,
  financials,
  tariffSearch,
  onTariffSearchChange,
  filteredTariffs,
  customDraft,
  onCustomDraftChange,
  onAddTariff,
  onAddCustom,
  onUpdateDiscount,
  onRemoveItem,
  onSaveAndPrintIntent,
  onSubmit,
}: QuoteModalProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" />
            {editingItem
              ? "Editar Presupuesto Médico CENDO"
              : "Cotizador de Procedimientos & Presupuesto Oficial"}
          </DialogTitle>
          <DialogDescription>
            Titular:{" "}
            <strong className="text-foreground">{patient.fullName}</strong> •{" "}
            {patient.documentType} {patient.documentNumber} • Tel:{" "}
            {patient.phone || "—"}
          </DialogDescription>
        </DialogHeader>

        {sourceLabel ? (
          <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-primary">
            <Sparkles className="size-3.5 shrink-0" />
            <span className="font-medium">{sourceLabel}</span>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Bloque 1: Fecha, Vigencia, Vínculo */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-12">
            <div className="space-y-1.5 sm:col-span-3">
              <label htmlFor="quote-date" className="block text-xs font-medium">
                Fecha de Emisión *
              </label>
              <Input
                id="quote-date"
                type="date"
                className="bg-card font-mono"
                {...register("quoteDate")}
              />
              {errors.quoteDate ? (
                <p className="text-xs text-destructive">
                  {errors.quoteDate.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5 sm:col-span-3">
              <label htmlFor="quote-val" className="block text-xs font-medium">
                Vigencia ({formatPeruDateDisplay(computedValidUntilDate)})
              </label>
              <select
                id="quote-val"
                className={selectClassName}
                {...register("validityDays", { valueAsNumber: true })}
              >
                {validityOptions.map((days) => (
                  <option key={days} value={days}>
                    {days} días calendario
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-6">
              <label
                htmlFor="quote-cons"
                className="flex items-center gap-1.5 text-xs font-medium"
              >
                <Link2 className="size-3.5 text-primary" />
                Vincular con Consulta Médica (Opcional)
              </label>
              <select
                id="quote-cons"
                value={watchedConsultationId}
                onChange={(e) =>
                  setValue("consultationId", e.target.value, {
                    shouldDirty: true,
                  })
                }
                className={selectClassName}
              >
                <option value="">Presupuesto independiente</option>
                {consultations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatPeruDateDisplay(c.consultationDate)} — {c.diagnosis}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bloque 2: Tarifario Real + Ítems Cotizados */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Tarifario CENDO */}
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3.5 lg:col-span-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-foreground uppercase">
                  Tarifario CENDO ({filteredTariffs.length})
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Clic para agregar
                </span>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute top-2 left-2.5 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={tariffSearch}
                  onChange={(e) => onTariffSearchChange(e.target.value)}
                  placeholder="Buscar código, procedimiento o categoría..."
                  className="bg-card pl-8 text-xs"
                />
              </div>

              <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
                {filteredTariffs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onAddTariff(t)}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-card p-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {t.name}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {t.code} • {t.category}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 font-mono text-[11px] font-bold text-primary"
                    >
                      {formatCurrency(t.price)}
                    </Badge>
                  </button>
                ))}
              </div>

              {/* Concepto personalizado */}
              <div className="space-y-2 border-t border-border pt-2.5">
                <span className="block text-[11px] font-semibold text-foreground">
                  + Concepto personalizado (fuera de tarifario)
                </span>
                <div className="grid grid-cols-12 gap-1.5">
                  <Input
                    type="text"
                    value={customDraft.name}
                    onChange={(e) =>
                      onCustomDraftChange((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Descripción..."
                    className="col-span-7 bg-card text-xs"
                  />
                  <Input
                    type="number"
                    min={1}
                    step="0.50"
                    value={customDraft.price}
                    onChange={(e) =>
                      onCustomDraftChange((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                    placeholder="S/ Precio"
                    className="col-span-3 bg-card font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onAddCustom}
                    className="col-span-2"
                    aria-label="Añadir concepto personalizado"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Ítems del presupuesto y cálculo */}
            <div className="flex flex-col justify-between space-y-3 rounded-xl border border-border bg-card p-3.5 lg:col-span-7">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-foreground uppercase">
                    Detalle del Presupuesto ({draftItems.length} ítem
                    {draftItems.length === 1 ? "" : "s"})
                  </h3>
                  {draftItems.length === 0 ? (
                    <span className="text-xs font-medium text-destructive">
                      Seleccione procedimientos del tarifario
                    </span>
                  ) : null}
                </div>

                {draftItems.length > 0 ? (
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {draftItems.map((it, idx) => (
                      <div
                        key={`${it.procedureId}-${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 p-2.5 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground">
                            {it.name}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {it.code} • Tarifa reg.:{" "}
                            {formatCurrency(it.regularPrice)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            Desc %
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="1"
                              value={it.discountPercent ?? 0}
                              onChange={(e) =>
                                onUpdateDiscount(idx, Number(e.target.value))
                              }
                              className="h-7 w-16 bg-card text-center font-mono text-xs"
                            />
                          </label>

                          <span className="min-w-20 text-right font-mono font-bold text-primary">
                            {formatCurrency(it.finalPrice)}
                          </span>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onRemoveItem(idx)}
                            aria-label="Quitar ítem"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
                    Haga clic en un procedimiento del tarifario CENDO o añada un
                    concepto personalizado.
                  </div>
                )}
              </div>

              {/* Resumen financiero */}
              <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {formatCurrency(financials.subtotal)}
                  </span>
                </div>
                {financials.discountTotal > 0 ? (
                  <div className="flex justify-between font-semibold text-primary">
                    <span>Descuento CENDO:</span>
                    <span className="font-mono">
                      - {formatCurrency(financials.discountTotal)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-border pt-1.5 text-sm font-bold text-foreground">
                  <span>TOTAL PRESUPUESTADO:</span>
                  <span className="font-mono text-base text-primary">
                    {formatCurrency(financials.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 3: Condiciones comerciales y notas */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="quote-terms" className="block text-xs font-medium">
                Condiciones de Pago y Programación *
              </label>
              <Textarea
                id="quote-terms"
                rows={2}
                {...register("paymentTerms")}
              />
              {errors.paymentTerms ? (
                <p className="text-xs text-destructive">
                  {errors.paymentTerms.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="quote-notes" className="block text-xs font-medium">
                Notas y Alcance del Presupuesto
              </label>
              <Textarea id="quote-notes" rows={2} {...register("notes")} />
            </div>
          </div>

          <DialogFooter className="flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onSaveAndPrintIntent(true)}
            >
              <Printer className="size-4" />
              Guardar e Imprimir A4
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={() => onSaveAndPrintIntent(false)}
            >
              <CheckCircle2 className="size-4" />
              {isSubmitting
                ? "Guardando..."
                : editingItem
                  ? "Guardar Cambios"
                  : "Emitir Presupuesto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
