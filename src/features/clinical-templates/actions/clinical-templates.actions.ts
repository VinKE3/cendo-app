"use server";

import { revalidatePath } from "next/cache";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import { DomainError, guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import {
  createClinicalTemplateSchema,
  deleteClinicalTemplateSchema,
  restoreOfficialTemplatesSchema,
  updateClinicalTemplateSchema,
} from "../clinical-templates.schema";
import {
  createClinicalTemplate,
  deleteClinicalTemplate,
  restoreOfficialClinicalTemplates,
  updateClinicalTemplate,
} from "../services/clinical-templates.service";

function revalidateTemplateRoutes() {
  revalidatePath("/pacientes/[id]", "page");
}

export async function createClinicalTemplateAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: createClinicalTemplateSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`ct-create:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;
      const created = await createClinicalTemplate(ctx, actorName, input);
      revalidateTemplateRoutes();
      return created;
    },
  });
  return runner(rawData);
}

export async function updateClinicalTemplateAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: updateClinicalTemplateSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`ct-update:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;
      const updated = await updateClinicalTemplate(ctx, actorName, input);
      revalidateTemplateRoutes();
      return updated;
    },
  });
  return runner(rawData);
}

export async function deleteClinicalTemplateAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: deleteClinicalTemplateSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`ct-del:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;
      const deleted = await deleteClinicalTemplate(ctx, actorName, input.id);
      revalidateTemplateRoutes();
      return deleted;
    },
  });
  return runner(rawData);
}

export async function restoreOfficialClinicalTemplatesAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: restoreOfficialTemplatesSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`ct-restore:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;
      const items = await restoreOfficialClinicalTemplates(
        ctx,
        actorName,
        input.scope
      );
      revalidateTemplateRoutes();
      return items;
    },
  });
  return runner(rawData);
}
