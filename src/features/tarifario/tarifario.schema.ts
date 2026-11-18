import { z } from "zod";

export type TariffCategory = string;

export interface ProcedureTariffItem {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  price: number;
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
