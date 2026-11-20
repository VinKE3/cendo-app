"use server";

import { revalidatePath } from "next/cache";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import { DomainError, guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import {
  deletePrenatalCardSchema,
  upsertPrenatalCardInputSchema,
} from "../prenatal.schema";
import {
  softDeletePrenatalCard,
  upsertPrenatalCard,
} from "../services/prenatal.service";

export async function upsertPrenatalCardAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: upsertPrenatalCardInputSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`prenatal-upsert:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;
      const saved = await upsertPrenatalCard(ctx, actorName, input);
      revalidatePath(`/pacientes/${input.patientId}`);
      return saved;
    },
  });

  return runner(rawData);
}

export async function deletePrenatalCardAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: deletePrenatalCardSchema,
    requiredRole: "admin",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`prenatal-delete:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;
      const deleted = await softDeletePrenatalCard(ctx, actorName, input.id);
      revalidatePath("/pacientes");
      return deleted;
    },
  });

  return runner(rawData);
}
