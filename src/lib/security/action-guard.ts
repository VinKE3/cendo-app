import { z } from "zod";
import { cookies } from "next/headers";
import { verifySignedPayload } from "./crypto";

export type UserRole = "user" | "admin" | "moderator";

export type SessionPayload = {
  userId: string;
  role: UserRole;
  tenantId?: string;
};

async function getAuthenticatedContext(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (!token) return null;

  const verified = await verifySignedPayload<SessionPayload>(token);
  if (!verified.valid || !verified.data?.userId) {
    return null;
  }

  return verified.data;
}

export async function guardedAction<TInput, TOutput>(options: {
  schema: z.ZodSchema<TInput>;
  requiredRole?: UserRole;
  action: (data: TInput, ctx: SessionPayload) => Promise<TOutput>;
}) {
  return async (rawData: unknown) => {
    try {
      const ctx = await getAuthenticatedContext();
      if (!ctx) {
        return { success: false, error: "Sesión inválida o expirada. Inicie sesión nuevamente." };
      }

      if (options.requiredRole && ctx.role !== options.requiredRole && ctx.role !== "admin") {
        return { success: false, error: "Permisos insuficientes para realizar esta acción." };
      }

      const parsedData = options.schema.parse(rawData);
      const result = await options.action(parsedData, ctx);
      return { success: true, data: result };
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return { success: false, error: "Datos de entrada inválidos", details: err.flatten() };
      }
      console.error("[Guarded Action Error]:", err);
      return { success: false, error: "Error interno al procesar la solicitud." };
    }
  };
}
