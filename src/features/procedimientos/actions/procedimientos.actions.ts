"use server";

import { revalidatePath } from "next/cache";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import { DomainError, guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import {
  createMinorProcedureSchema,
  deleteMinorProcedureSchema,
  updateMinorProcedureSchema,
} from "../procedimientos.schema";
import {
  createMinorProcedure,
  softDeleteMinorProcedure,
  updateMinorProcedure,
} from "../services/procedimientos.service";

export async function createMinorProcedureAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: createMinorProcedureSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`proc-create:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;
      const created = await createMinorProcedure(ctx, actorName, input);
      revalidatePath(`/pacientes/${input.patientId}`);
      return created;
    },
  });
  return runner(rawData);
}

export async function updateMinorProcedureAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: updateMinorProcedureSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`proc-update:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;
      const updated = await updateMinorProcedure(ctx, actorName, input);
      revalidatePath(`/pacientes/${input.patientId}`);
      return updated;
    },
  });
  return runner(rawData);
}

export async function deleteMinorProcedureAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: deleteMinorProcedureSchema,
    requiredRole: "admin",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`proc-delete:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;
      const deleted = await softDeleteMinorProcedure(ctx, actorName, input.id);
      revalidatePath("/pacientes");
      return deleted;
    },
  });
  return runner(rawData);
}
