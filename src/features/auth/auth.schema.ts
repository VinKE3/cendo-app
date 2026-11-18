import { z } from "zod";

export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "El correo electrónico institucional es requerido.")
      .email("Ingrese un formato de correo electrónico válido."),
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres.")
      .max(128, "Contraseña demasiado larga."),
    rememberMe: z.boolean(),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Ingrese su correo institucional.")
      .email("Ingrese un formato de correo electrónico válido."),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
