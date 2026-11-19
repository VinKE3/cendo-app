"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import { DomainError, guardedAction } from "@/lib/security/action-guard";
import { authLimiter, mutationLimiter } from "@/lib/security/rate-limit";
import {
  changePasswordSchema,
  updateDoctorConfigSchema,
} from "../configuracion.schema";
import {
  changeOwnPassword,
  deleteOwnSignature,
  listTenantSignatureDirectory,
  updateOwnConfigProfile,
} from "../services/configuracion.service";

function revalidateConfigRoutes() {
  revalidatePath("/configuracion");
  revalidatePath("/dashboard");
  revalidatePath("/pacientes");
  revalidatePath("/pacientes/[id]", "page");
}

export async function updateDoctorConfigAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: updateDoctorConfigSchema,
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`config:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }

      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;

      const updated = await updateOwnConfigProfile(ctx, actorName, input);
      revalidateConfigRoutes();
      return updated;
    },
  });
  return runner(rawData);
}

export async function deleteOwnSignatureAction() {
  const runner = await guardedAction({
    schema: z.object({}).strict(),
    action: async (_input, ctx) => {
      const rate = mutationLimiter.check(`firma-del:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }

      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;

      const result = await deleteOwnSignature(ctx, actorName);
      revalidateConfigRoutes();
      return result;
    },
  });
  return runner({});
}

export async function listSignatureDirectoryAction() {
  const runner = await guardedAction({
    schema: z.object({}).strict(),
    action: async (_input, ctx) => {
      if (!ctx.tenantId) {
        throw new DomainError("Sede no asociada a la sesión.");
      }
      return listTenantSignatureDirectory(ctx.tenantId);
    },
  });
  return runner({});
}

export async function changeOwnPasswordAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: changePasswordSchema,
    action: async (input, ctx) => {
      const rate = authLimiter.check(`pwd-change:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiados intentos de cambio de clave. Espere ${rate.resetInSeconds}s.`
        );
      }

      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;

      return changeOwnPassword(ctx, actorName, input);
    },
  });
  return runner(rawData);
}
