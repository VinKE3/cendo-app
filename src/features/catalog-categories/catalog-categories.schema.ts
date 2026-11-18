import { z } from "zod";

export const CATEGORY_SCOPES = ["tariff", "vademecum"] as const;
export type CategoryScope = (typeof CATEGORY_SCOPES)[number];

export interface CatalogCategoryItem {
  id: string;
  scope: CategoryScope;
  name: string;
  usageCount: number;
}

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
    id: z.string().uuid("ID de categoría inválido."),
    scope: z.enum(CATEGORY_SCOPES),
    name: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres.")
      .max(120),
  })
  .strict();

export const deleteCategorySchema = z
  .object({
    id: z.string().uuid("ID de categoría inválido."),
    scope: z.enum(CATEGORY_SCOPES),
  })
  .strict();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type RenameCategoryInput = z.infer<typeof renameCategorySchema>;
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;
