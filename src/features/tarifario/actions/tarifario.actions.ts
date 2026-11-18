"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import {
  deleteTariffSchema,
  tariffInputSchema,
  updateTariffSchema,
} from "../tarifario.schema";
import {
  createTariff,
  listTariffs,
  softDeleteTariff,
  updateTariff,
} from "../services/tarifario.service";

export async function listTariffsAction() {
  const runner = await guardedAction({
    schema: z.object({}).strict(),
    action: async (_input, ctx) => {
      if (!ctx.tenantId) throw new Error("Sede no asociada a la sesión.");
      return listTariffs(ctx.tenantId);
    },
  });
  return runner({});
}

export async function createTariffAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: tariffInputSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`tariff:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const created = await createTariff(ctx, actorName, input);
      revalidatePath("/tarifario");
      revalidatePath("/dashboard");
      return created;
    },
  });
  return runner(rawData);
}

export async function updateTariffAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: updateTariffSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`tariff:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const updated = await updateTariff(ctx, actorName, input);
      revalidatePath("/tarifario");
      revalidatePath("/dashboard");
      return updated;
    },
  });
  return runner(rawData);
}

export async function deleteTariffAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: deleteTariffSchema,
    requiredRole: "admin",
    action: async (input, ctx) => {
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const res = await softDeleteTariff(ctx, actorName, input.id);
      revalidatePath("/tarifario");
      revalidatePath("/dashboard");
      return res;
    },
  });
  return runner(rawData);
}
