"use server";

import { revalidatePath } from "next/cache";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import { DomainError, guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import {
  createColposcopySchema,
  deleteColposcopySchema,
  listColposcopiesSchema,
  updateColposcopySchema,
} from "../colposcopia.schema";
import {
  createColposcopy,
  listColposcopiesByPatient,
  softDeleteColposcopy,
  updateColposcopy,
} from "../services/colposcopia.service";

function revalidateColposcopyRoutes(patientId?: string) {
  if (patientId) {
    revalidatePath(`/pacientes/${patientId}`);
  } else {
    revalidatePath("/pacientes/[id]", "page");
  }
  revalidatePath("/pacientes");
  revalidatePath("/dashboard");
}

export async function listColposcopiesAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: listColposcopiesSchema,
    action: async (input, ctx) => {
      if (!ctx.tenantId) throw new DomainError("Sede no asociada a la sesión.");
      return listColposcopiesByPatient(ctx.tenantId, input.patientId);
    },
  });
  return runner(rawData);
}

export async function createColposcopyAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: createColposcopySchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`colpo:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const created = await createColposcopy(ctx, actorName, input);
      revalidateColposcopyRoutes(input.patientId);
      return created;
    },
  });
  return runner(rawData);
}

export async function updateColposcopyAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: updateColposcopySchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`colpo:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const updated = await updateColposcopy(ctx, actorName, input);
      revalidateColposcopyRoutes(input.patientId);
      return updated;
    },
  });
  return runner(rawData);
}

export async function deleteColposcopyAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: deleteColposcopySchema,
    requiredRole: "admin",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`colpo-del:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const deleted = await softDeleteColposcopy(ctx, actorName, input.id);
      revalidateColposcopyRoutes();
      return deleted;
    },
  });
  return runner(rawData);
}
