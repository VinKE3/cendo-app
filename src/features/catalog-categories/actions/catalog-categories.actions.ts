"use server";

import { revalidatePath } from "next/cache";
import { DomainError, guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import {
  createCategorySchema,
  deleteCategorySchema,
  renameCategorySchema,
} from "../catalog-categories.schema";
import {
  createCategory,
  deleteCategory,
  renameCategory,
} from "../services/catalog-categories.service";

export async function createCategoryAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: createCategorySchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`cat:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const created = await createCategory(ctx, actorName, input);
      revalidatePath(input.scope === "tariff" ? "/tarifario" : "/vademecum");
      return created;
    },
  });
  return runner(rawData);
}

export async function renameCategoryAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: renameCategorySchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`cat:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const updated = await renameCategory(ctx, actorName, input);
      revalidatePath(input.scope === "tariff" ? "/tarifario" : "/vademecum");
      return updated;
    },
  });
  return runner(rawData);
}

export async function deleteCategoryAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: deleteCategorySchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const res = await deleteCategory(ctx, actorName, input.id, input.scope);
      revalidatePath(input.scope === "tariff" ? "/tarifario" : "/vademecum");
      return res;
    },
  });
  return runner(rawData);
}
