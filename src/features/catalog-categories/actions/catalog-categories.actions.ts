"use server";

import { revalidatePath } from "next/cache";
import { DomainError, guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import {
  createCategorySchema,
  deleteCategorySchema,
  renameCategorySchema,
  type CategoryScope,
} from "../catalog-categories.schema";
import {
  createCategory,
  deleteCategory,
  renameCategory,
} from "../services/catalog-categories.service";

function revalidateScopeRoute(scope: CategoryScope) {
  if (scope === "tariff" || scope === "external_lab") {
    revalidatePath("/tarifario");
  } else if (scope === "vademecum") {
    revalidatePath("/vademecum");
  } else if (scope === "appointment_type") {
    revalidatePath("/agenda");
    revalidatePath("/dashboard");
  } else {
    revalidatePath("/pacientes");
  }
}

export async function createCategoryAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: createCategorySchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`cat:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const created = await createCategory(ctx, actorName, input);
      revalidateScopeRoute(input.scope);
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
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const updated = await renameCategory(ctx, actorName, input);
      revalidateScopeRoute(input.scope);
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
      revalidateScopeRoute(input.scope);
      return res;
    },
  });
  return runner(rawData);
}
