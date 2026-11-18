import { z } from "zod";

export interface CommercialBrandItem {
  brandName: string;
  laboratory: string;
  presentation: string;
  referencePricePen: number;
}

export interface MedicationItem {
  id: string;
  genericName: string;
  atcCode: string;
  therapeuticGroup: string;
  commercialBrands: CommercialBrandItem[];
  indications: string;
  contraindications: string;
  createdAt: string;
}

export const commercialBrandSchema = z
  .object({
    brandName: z.string().trim().min(1, "La marca comercial es requerida.").max(120),
    laboratory: z.string().trim().min(1, "El laboratorio es requerido.").max(120),
    presentation: z.string().trim().min(1, "La presentación es requerida.").max(160),
    referencePricePen: z
      .number({ error: "Ingrese un precio referencial válido." })
      .min(0, "El precio no puede ser negativo.")
      .max(100000),
  })
  .strict();

export const vademecumInputSchema = z
  .object({
    genericName: z
      .string()
      .trim()
      .min(2, "El principio activo debe tener al menos 2 caracteres.")
      .max(180),
    atcCode: z
      .string()
      .trim()
      .min(2, "El código ATC es requerido.")
      .max(20)
      .transform((val) => val.toUpperCase()),
    therapeuticGroup: z
      .string()
      .trim()
      .min(3, "El grupo terapéutico es requerido.")
      .max(160),
    indications: z
      .string()
      .trim()
      .min(3, "Las indicaciones clínicas son requeridas.")
      .max(1000),
    contraindications: z.string().trim().max(1000),
    commercialBrands: z
      .array(commercialBrandSchema)
      .min(1, "Debe registrar al menos una marca comercial."),
  })
  .strict();

export const updateVademecumSchema = vademecumInputSchema
  .extend({
    id: z.string().uuid("ID de fármaco inválido."),
  })
  .strict();

export const deleteVademecumSchema = z
  .object({
    id: z.string().uuid("ID de fármaco inválido."),
  })
  .strict();

export type VademecumInput = z.infer<typeof vademecumInputSchema>;
export type UpdateVademecumInput = z.infer<typeof updateVademecumSchema>;
