import { z } from "zod";
import type { QuoteItemRecord } from "@/db/schema/clinical";
import { getPeruDateString, shiftPeruDate } from "@/lib/utils";

export const VALIDITY_DAY_OPTIONS = [7, 15, 30, 45, 60] as const;

export const DEFAULT_PAYMENT_TERMS =
  "50% al programar el procedimiento y 50% el día de la atención. Aceptamos efectivo, transferencias BCP / BBVA y tarjetas de crédito o débito.";

export const DEFAULT_QUOTE_NOTES =
  "Incluye honorarios médicos especializados CENDO e insumos básicos de consultorio. Sujeto a vigencia indicada.";

export interface ProcedureQuoteItem {
  id: string;
  patientId: string;
  consultationId: string | null;
  doctorId: string | null;
  doctorName: string;
  quoteDate: string;
  validityDays: number;
  validUntilDate: string;
  isExpired: boolean;
  items: QuoteItemRecord[];
  subtotal: number;
  discountTotal: number;
  total: number;
  paymentTerms: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeQuoteExpiration(
  quoteDate: string,
  validityDays: number
): { validUntilDate: string; isExpired: boolean } {
  const safeDays = Math.max(1, Math.min(180, Math.round(validityDays || 30)));
  const validUntilDate = shiftPeruDate(quoteDate, safeDays);
  const today = getPeruDateString();
  return {
    validUntilDate,
    isExpired: validUntilDate < today,
  };
}

export function computeQuoteFinancials(
  items: Array<{
    procedureId: string;
    code: string;
    name: string;
    category: string;
    regularPrice: number;
    discountPercent?: number;
    selectedLabName?: string;
    providerCost?: number;
  }>
): {
  items: QuoteItemRecord[];
  subtotal: number;
  discountTotal: number;
  total: number;
  totalProviderCost: number;
  netProfit: number;
  netMarginPercent: number;
} {
  let subtotal = 0;
  let total = 0;
  let totalProviderCost = 0;

  const normalizedItems: QuoteItemRecord[] = items.map((item) => {
    const regularPrice = roundCurrency(Math.max(0, Number(item.regularPrice) || 0));
    const discountPercent = roundCurrency(
      Math.max(0, Math.min(100, Number(item.discountPercent ?? 0) || 0))
    );
    const finalPrice = roundCurrency(
      regularPrice * (1 - discountPercent / 100)
    );
    const cleanLabName = item.selectedLabName?.trim() || undefined;
    const hasProviderCost =
      item.providerCost !== undefined &&
      item.providerCost !== null &&
      Number.isFinite(Number(item.providerCost));
    const providerCost = hasProviderCost
      ? roundCurrency(Math.max(0, Number(item.providerCost)))
      : undefined;

    subtotal = roundCurrency(subtotal + regularPrice);
    total = roundCurrency(total + finalPrice);
    if (providerCost !== undefined) {
      totalProviderCost = roundCurrency(totalProviderCost + providerCost);
    }

    return {
      procedureId: item.procedureId.trim(),
      code: item.code.trim().toUpperCase(),
      name: item.name.trim(),
      category: item.category.trim(),
      regularPrice,
      discountPercent,
      finalPrice,
      ...(cleanLabName ? { selectedLabName: cleanLabName } : {}),
      ...(providerCost !== undefined ? { providerCost } : {}),
    };
  });

  const discountTotal = roundCurrency(Math.max(0, subtotal - total));
  const netProfit = roundCurrency(total - totalProviderCost);
  const netMarginPercent =
    total > 0 ? roundCurrency((netProfit / total) * 100) : 0;

  return {
    items: normalizedItems,
    subtotal,
    discountTotal,
    total,
    totalProviderCost,
    netProfit,
    netMarginPercent,
  };
}

const pgUuidSchema = (message: string) =>
  z
    .string()
    .trim()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      message
    );

export const quoteItemInputSchema = z
  .object({
    procedureId: z.string().trim().min(2, "ID de ítem requerido.").max(80),
    code: z.string().trim().min(1, "Código requerido.").max(32),
    name: z.string().trim().min(2, "Nombre del servicio requerido.").max(260),
    category: z.string().trim().min(2, "Categoría requerida.").max(120),
    regularPrice: z.coerce
      .number({ error: "Precio inválido." })
      .gt(0, "El precio debe ser mayor a S/ 0.00.")
      .lte(100000, "Precio máximo excedido."),
    discountPercent: z.coerce
      .number({ error: "Descuento inválido." })
      .min(0, "Descuento mínimo: 0%.")
      .max(100, "Descuento máximo: 100%.")
      .default(0),
    finalPrice: z.coerce.number().optional(),
    selectedLabName: z.string().trim().max(160).optional(),
    providerCost: z.coerce
      .number({ error: "Costo de laboratorio inválido." })
      .min(0, "El costo de laboratorio no puede ser negativo.")
      .max(100000, "Costo máximo excedido.")
      .optional(),
  })
  .strict();

const quoteCoreShape = {
  patientId: pgUuidSchema("ID de paciente inválido."),
  consultationId: pgUuidSchema("ID de consulta inválido.").nullable().optional(),
  quoteDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Seleccione fecha válida (YYYY-MM-DD)."),
  validityDays: z.coerce
    .number({ error: "Vigencia inválida." })
    .int("La vigencia debe ser un número entero de días.")
    .min(1, "Vigencia mínima: 1 día.")
    .max(180, "Vigencia máxima: 180 días.")
    .default(30),
  items: z
    .array(quoteItemInputSchema)
    .min(1, "Debe agregar al menos 1 procedimiento o servicio a cotizar.")
    .max(30, "Máximo 30 ítems por presupuesto."),
  paymentTerms: z
    .string()
    .trim()
    .min(5, "Indique las condiciones de pago.")
    .max(1200),
  notes: z.string().trim().max(2000),
};

export const createQuoteSchema = z
  .object({
    ...quoteCoreShape,
  })
  .strict();

export const updateQuoteSchema = z
  .object({
    id: pgUuidSchema("ID de presupuesto inválido."),
    ...quoteCoreShape,
  })
  .strict();

export const deleteQuoteSchema = z
  .object({
    id: pgUuidSchema("ID de presupuesto inválido."),
  })
  .strict();

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type DeleteQuoteInput = z.infer<typeof deleteQuoteSchema>;
