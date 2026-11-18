"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/env";
import { signPayload } from "@/lib/security/crypto";
import { authLimiter } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/get-client-ip";
import { guardedAction, type SessionPayload } from "@/lib/security/action-guard";
import { loginSchema } from "../auth.schema";
import {
  authenticateDoctorByCredentials,
  getSessionDoctorProfile,
} from "../services/auth.service";

const SESSION_COOKIE_NAME = "session_token";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function loginAction(rawData: unknown) {
  try {
    const clientIp = await getClientIp();
    const rateCheck = authLimiter.check(`login:${clientIp}`);
    if (!rateCheck.success) {
      return {
        success: false as const,
        error: `Demasiados intentos de acceso. Intente nuevamente en ${rateCheck.resetInSeconds}s.`,
      };
    }

    const parsed = loginSchema.parse(rawData);
    const doctor = await authenticateDoctorByCredentials(parsed.email, parsed.password);

    if (!doctor) {
      return {
        success: false as const,
        error: "Credenciales inválidas o cuenta inactiva.",
      };
    }

    const payload: SessionPayload = {
      userId: doctor.id,
      role: doctor.role,
      tenantId: doctor.tenantId,
    };

    const signedToken = await signPayload(JSON.stringify(payload), env.AUTH_SECRET);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, signedToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      ...(parsed.rememberMe ? { maxAge: SESSION_TTL_SECONDS } : {}),
    });

    return {
      success: true as const,
      data: {
        fullName: `${doctor.doctorTitle} ${doctor.fullName}`,
        role: doctor.role,
      },
    };
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return {
        success: false as const,
        error: err.issues[0]?.message || "Datos de acceso inválidos.",
      };
    }
    console.error("[Login Action Error]:", err);
    return {
      success: false as const,
      error: "No se pudo completar el inicio de sesión.",
    };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

export async function getCurrentProfileAction() {
  const runner = await guardedAction({
    schema: z.object({}).strict(),
    action: async (_input, ctx) => {
      const profile = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      if (!profile) {
        throw new Error("Perfil médico no encontrado.");
      }
      return profile;
    },
  });
  return runner({});
}
