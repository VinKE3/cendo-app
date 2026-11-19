"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import { guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import {
  createQuoteSchema,
  deleteQuoteSchema,
  updateQuoteSchema,
} from "../cotizaciones.schema";
import {
  createQuote,
  listQuotesByPatient,
  softDeleteQuote,
  updateQuote,
} from "../services/cotizaciones.service";

const listByPatientSchema = z
  .object({
    patientId: z
      .string()
      .trim()
      .regex(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        "ID de paciente inválido."
      ),
  })
  .strict();

function revalidateQuoteRoutes(patientId: string) {
  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/pacientes");
  revalidatePath("/dashboard");
}

export async function listQuotesAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: listByPatientSchema,
    action: async (input, ctx) => {
      if (!ctx.tenantId) throw new Error("Sede no asociada a la sesión.");
      return listQuotesByPatient(ctx.tenantId, input.patientId);
    },
  });
  return runner(rawData);
}

export async function createQuoteAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: createQuoteSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`quote:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const created = await createQuote(ctx, actorName, input);
      revalidateQuoteRoutes(input.patientId);
      return created;
    },
  });
  return runner(rawData);
}

export async function updateQuoteAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: updateQuoteSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`quote:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const updated = await updateQuote(ctx, actorName, input);
      revalidateQuoteRoutes(input.patientId);
      return updated;
    },
  });
  return runner(rawData);
}

export async function deleteQuoteAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: deleteQuoteSchema,
    requiredRole: "admin",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`quote:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const removed = await softDeleteQuote(ctx, actorName, input.id);
      revalidateQuoteRoutes(removed.patientId);
      return removed;
    },
  });
  return runner(rawData);
}
