import { z } from "zod";
import type { TariffProviderCostRecord } from "@/db/schema/catalogs";

export type { TariffProviderCostRecord };
export type TariffCategory = string;

export const tariffProviderCostSchema = z
  .object({
    laboratoryName: z
      .string()
      .trim()
      .min(1, "Seleccione o ingrese el laboratorio externo.")
      .max(80, "El nombre del laboratorio no debe superar los 80 caracteres."),
    variant: z
      .string()
      .trim()
      .max(80, "La modalidad/detalle no debe superar los 80 caracteres.")
      .optional(),
    cost: z
      .number({ error: "Ingrese un costo numérico válido." })
      .min(0, "El costo del laboratorio no puede ser negativo.")
      .max(100000, "El costo ingresado excede el límite permitido."),
  })
  .strict();

export function formatProviderOptionLabel(
  provider: Pick<TariffProviderCostRecord, "laboratoryName" | "variant">
): string {
  const lab = provider.laboratoryName.trim();
  const variant = provider.variant?.trim();
  return variant ? `${lab} (${variant})` : lab;
}

export function getDefaultProviderCost(
  providerCosts: TariffProviderCostRecord[] | undefined
): TariffProviderCostRecord | null {
  if (!providerCosts || providerCosts.length === 0) return null;
  return providerCosts[0] ?? null;
}

export function computeTariffMarginSummary(
  price: number,
  providerCosts: TariffProviderCostRecord[] | undefined
): {
  hasProviders: boolean;
  minCost: number;
  maxCost: number;
  minMargin: number;
  maxMargin: number;
} {
  if (!providerCosts || providerCosts.length === 0) {
    return {
      hasProviders: false,
      minCost: 0,
      maxCost: 0,
      minMargin: Number(price.toFixed(2)),
      maxMargin: Number(price.toFixed(2)),
    };
  }
  const costs = providerCosts.map((entry) => Number(entry.cost) || 0);
  const minCost = Number(Math.min(...costs).toFixed(2));
  const maxCost = Number(Math.max(...costs).toFixed(2));
  return {
    hasProviders: true,
    minCost,
    maxCost,
    minMargin: Number((price - maxCost).toFixed(2)),
    maxMargin: Number((price - minCost).toFixed(2)),
  };
}

export interface ProcedureTariffItem {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  price: number;
  providerCosts: TariffProviderCostRecord[];
  active: boolean;
  createdAt: string;
}

export const tariffInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, "El código debe tener al menos 2 caracteres.")
      .max(20, "El código no debe exceder 20 caracteres.")
      .transform((val) => val.toUpperCase()),
    name: z
      .string()
      .trim()
      .min(3, "El nombre del procedimiento debe tener al menos 3 caracteres.")
      .max(200),
    category: z
      .string()
      .trim()
      .min(2, "Seleccione o ingrese una categoría válida.")
      .max(80),
    description: z.string().trim().max(1000),
    price: z
      .number({ error: "Ingrese un precio numérico válido." })
      .min(0.01, "El precio oficial debe ser mayor a S/ 0.00.")
      .max(100000),
    providerCosts: z.array(tariffProviderCostSchema).max(20),
    active: z.boolean(),
  })
  .strict();

export const updateTariffSchema = tariffInputSchema
  .extend({
    id: z.string().uuid("ID de tarifa inválido."),
  })
  .strict();

export const deleteTariffSchema = z
  .object({
    id: z.string().uuid("ID de tarifa inválido."),
  })
  .strict();

export type TariffInput = z.infer<typeof tariffInputSchema>;
export type UpdateTariffInput = z.infer<typeof updateTariffSchema>;
