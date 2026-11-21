import { z } from "zod";

export const CATEGORY_SCOPES = [
  "tariff",
  "external_lab",
  "cie10",
  "vademecum",
  "appointment_type",
  "consultation_reason",
] as const;

export type CategoryScope = (typeof CATEGORY_SCOPES)[number];

export interface CatalogCategoryItem {
  id: string;
  scope: CategoryScope;
  name: string;
  usageCount: number;
}

const pgUuidSchema = (message: string) =>
  z
    .string()
    .trim()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      message
    );

export const createCategorySchema = z
  .object({
    scope: z.enum(CATEGORY_SCOPES),
    name: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres.")
      .max(120, "El nombre no debe exceder 120 caracteres."),
  })
  .strict();

export const renameCategorySchema = z
  .object({
    id: pgUuidSchema("ID de categoría inválido."),
    scope: z.enum(CATEGORY_SCOPES),
    name: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres.")
      .max(120, "El nombre no debe exceder 120 caracteres."),
  })
  .strict();

export const deleteCategorySchema = z
  .object({
    id: pgUuidSchema("ID de categoría inválido."),
    scope: z.enum(CATEGORY_SCOPES),
  })
  .strict();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type RenameCategoryInput = z.infer<typeof renameCategorySchema>;
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;
