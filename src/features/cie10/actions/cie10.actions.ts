"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import { DomainError, guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import {
  cie10InputSchema,
  deleteCie10Schema,
  toggleCie10FavoriteSchema,
  updateCie10Schema,
} from "../cie10.schema";
import {
  createCie10Code,
  listCie10Codes,
  softDeleteCie10Code,
  toggleCie10Favorite,
  updateCie10Code,
} from "../services/cie10.service";

function revalidateCie10Routes() {
  revalidatePath("/cie-10");
  revalidatePath("/dashboard");
  revalidatePath("/pacientes");
}

export async function listCie10Action() {
  const runner = await guardedAction({
    schema: z.object({}).strict(),
    action: async (_input, ctx) => {
      if (!ctx.tenantId) throw new DomainError("Sede no asociada a la sesión.");
      return listCie10Codes(ctx.tenantId);
    },
  });
  return runner({});
}

export async function createCie10Action(rawData: unknown) {
  const runner = await guardedAction({
    schema: cie10InputSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`cie10:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;
      const created = await createCie10Code(ctx, actorName, input);
      revalidateCie10Routes();
      return created;
    },
  });
  return runner(rawData);
}

export async function updateCie10Action(rawData: unknown) {
  const runner = await guardedAction({
    schema: updateCie10Schema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`cie10:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;
      const updated = await updateCie10Code(ctx, actorName, input);
      revalidateCie10Routes();
      return updated;
    },
  });
  return runner(rawData);
}

export async function toggleCie10FavoriteAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: toggleCie10FavoriteSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`cie10:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;
      const updated = await toggleCie10Favorite(
        ctx,
        actorName,
        input.id,
        input.isFavorite
      );
      revalidateCie10Routes();
      return updated;
    },
  });
  return runner(rawData);
}

export async function deleteCie10Action(rawData: unknown) {
  const runner = await guardedAction({
    schema: deleteCie10Schema,
    requiredRole: "admin",
    action: async (input, ctx) => {
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;
      const res = await softDeleteCie10Code(ctx, actorName, input.id);
      revalidateCie10Routes();
      return res;
    },
  });
  return runner(rawData);
}
