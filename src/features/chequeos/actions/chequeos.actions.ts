"use server";

import { revalidatePath } from "next/cache";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import { DomainError, guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import {
  createCheckupSchema,
  deleteCheckupSchema,
  listCheckupsSchema,
  updateCheckupSchema,
} from "../chequeos.schema";
import {
  createCheckup,
  listCheckupsByPatient,
  softDeleteCheckup,
  updateCheckup,
} from "../services/chequeos.service";

function revalidateCheckupRoutes(patientId?: string) {
  if (patientId) {
    revalidatePath(`/pacientes/${patientId}`);
  } else {
    revalidatePath("/pacientes/[id]", "page");
  }
  revalidatePath("/pacientes");
  revalidatePath("/dashboard");
}

export async function listCheckupsAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: listCheckupsSchema,
    action: async (input, ctx) => {
      if (!ctx.tenantId) throw new DomainError("Sede no asociada a la sesión.");
      return listCheckupsByPatient(ctx.tenantId, input.patientId);
    },
  });
  return runner(rawData);
}

export async function createCheckupAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: createCheckupSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`chk:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;
      const created = await createCheckup(ctx, actorName, input);
      revalidateCheckupRoutes(input.patientId);
      return created;
    },
  });
  return runner(rawData);
}

export async function updateCheckupAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: updateCheckupSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`chk:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;
      const updated = await updateCheckup(ctx, actorName, input);
      revalidateCheckupRoutes(input.patientId);
      return updated;
    },
  });
  return runner(rawData);
}

export async function deleteCheckupAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: deleteCheckupSchema,
    requiredRole: "admin",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`chk-del:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor
        ? `${actor.doctorTitle} ${actor.fullName}`
        : ctx.userId;
      const deleted = await softDeleteCheckup(ctx, actorName, input.id);
      revalidateCheckupRoutes(deleted.patientId);
      return deleted;
    },
  });
  return runner(rawData);
}
