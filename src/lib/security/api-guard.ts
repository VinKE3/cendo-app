import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DomainError,
  getAuthenticatedContext,
  type SessionPayload,
  type UserRole,
} from "./action-guard";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";

export async function handleGuardedApi<TInput, TOutput>(options: {
  request?: Request;
  schema?: z.ZodSchema<TInput>;
  requiredRole?: UserRole;
  handler: (params: {
    ctx: SessionPayload;
    actorName: string;
    input: TInput;
  }) => Promise<TOutput>;
  status?: number;
}) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx || !ctx.tenantId) {
      return NextResponse.json(
        { success: false, error: "Sesión inválida o expirada." },
        { status: 401 }
      );
    }

    if (
      options.requiredRole &&
      ctx.role !== options.requiredRole &&
      ctx.role !== "admin"
    ) {
      return NextResponse.json(
        { success: false, error: "Permisos insuficientes." },
        { status: 403 }
      );
    }

    let parsedInput = undefined as TInput;
    if (options.schema && options.request) {
      const body = await options.request.json();
      parsedInput = options.schema.parse(body);
    }

    const profile = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
    const actorName = profile ? `${profile.doctorTitle} ${profile.fullName}` : ctx.userId;

    const data = await options.handler({ ctx, actorName, input: parsedInput });
    return NextResponse.json({ success: true, data }, { status: options.status ?? 200 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Datos inválidos", details: err.flatten() },
        { status: 422 }
      );
    }
    if (err instanceof DomainError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
    console.error("[API Guard Error]:", err);
    return NextResponse.json(
      { success: false, error: "Error interno al procesar la solicitud." },
      { status: 500 }
    );
  }
}
