import { z } from "zod";
import {
  CIE10_CATEGORY_LABELS,
  type Cie10Category,
} from "@/features/catalogo/cie10.data";

export interface Cie10RecordItem {
  id: string;
  code: string;
  name: string;
  category: string;
  keywords: string[];
  isFavorite: boolean;
  createdAt: string;
}

export const DEFAULT_CIE10_CATEGORIES = Object.values(CIE10_CATEGORY_LABELS);

export function formatCie10CategoryLabel(category: string): string {
  const clean = category.trim();
  if (clean in CIE10_CATEGORY_LABELS) {
    return CIE10_CATEGORY_LABELS[clean as Cie10Category];
  }
  return clean;
}

export function normalizeCie10SearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function parseKeywordsInput(raw: string): string[] {
  const tokens = raw
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= 60);

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const token of tokens) {
    const key = normalizeCie10SearchText(token);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(token);
    if (unique.length >= 25) break;
  }
  return unique;
}

export function searchCie10Catalog(
  query: string,
  catalog: Cie10RecordItem[],
  limit = 12
): Cie10RecordItem[] {
  if (!query || !query.trim()) {
    return catalog.slice(0, limit);
  }

  const clean = normalizeCie10SearchText(query);

  return catalog
    .filter((item) => {
      if (normalizeCie10SearchText(item.code).includes(clean)) return true;
      if (normalizeCie10SearchText(item.name).includes(clean)) return true;
      if (
        normalizeCie10SearchText(formatCie10CategoryLabel(item.category)).includes(
          clean
        )
      ) {
        return true;
      }
      return item.keywords.some((kw) =>
        normalizeCie10SearchText(kw).includes(clean)
      );
    })
    .slice(0, limit);
}

export function findCie10ByCode(
  code: string,
  catalog: Cie10RecordItem[]
): Cie10RecordItem | undefined {
  const clean = code.trim().toUpperCase();
  if (!clean) return undefined;
  return catalog.find((item) => item.code.trim().toUpperCase() === clean);
}

const cie10BaseShape = {
  code: z
    .string()
    .trim()
    .min(2, "El código CIE-10 debe tener al menos 2 caracteres.")
    .max(15, "El código CIE-10 no debe superar 15 caracteres.")
    .regex(
      /^[A-Za-z0-9.-]+$/,
      "Solo letras, números, puntos o guiones (ej. N80.3)."
    ),
  name: z
    .string()
    .trim()
    .min(3, "La descripción diagnóstica debe tener al menos 3 caracteres.")
    .max(300, "La descripción no debe superar los 300 caracteres."),
  category: z
    .string()
    .trim()
    .min(2, "Seleccione un área clínica.")
    .max(120, "El área clínica no debe superar los 120 caracteres."),
  isFavorite: z.boolean(),
};

export const cie10InputSchema = z
  .object({
    ...cie10BaseShape,
    keywords: z
      .array(
        z
          .string()
          .trim()
          .min(1, "La palabra clave no puede estar vacía.")
          .max(60, "Máximo 60 caracteres por palabra clave.")
      )
      .max(25, "Máximo 25 palabras clave."),
  })
  .strict();

export const cie10FormSchema = z
  .object({
    ...cie10BaseShape,
    keywordsText: z
      .string()
      .trim()
      .max(500, "Las palabras clave no deben superar 500 caracteres."),
  })
  .strict();

export const updateCie10Schema = cie10InputSchema
  .extend({
    id: z.string().uuid("Identificador de registro CIE-10 inválido."),
  })
  .strict();

export const toggleCie10FavoriteSchema = z
  .object({
    id: z.string().uuid("Identificador de registro CIE-10 inválido."),
    isFavorite: z.boolean(),
  })
  .strict();

export const deleteCie10Schema = z
  .object({
    id: z.string().uuid("Identificador de registro CIE-10 inválido."),
  })
  .strict();

export type Cie10Input = z.infer<typeof cie10InputSchema>;
export type Cie10FormValues = z.infer<typeof cie10FormSchema>;
export type UpdateCie10Input = z.infer<typeof updateCie10Schema>;
