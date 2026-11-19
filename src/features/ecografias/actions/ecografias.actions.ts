"use server";

import { revalidatePath } from "next/cache";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import { DomainError, guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import {
  createUltrasoundSchema,
  deleteUltrasoundSchema,
  listUltrasoundsSchema,
  updateUltrasoundSchema,
} from "../ecografias.schema";
import {
  createUltrasound,
  listUltrasoundsByPatient,
  softDeleteUltrasound,
  updateUltrasound,
} from "../services/ecografias.service";

function revalidateUltrasoundRoutes(patientId?: string) {
  if (patientId) {
    revalidatePath(`/pacientes/${patientId}`);
  } else {
    revalidatePath("/pacientes/[id]", "page");
  }
  revalidatePath("/pacientes");
  revalidatePath("/dashboard");
}

export async function listUltrasoundsAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: listUltrasoundsSchema,
    action: async (input, ctx) => {
      if (!ctx.tenantId) throw new DomainError("Sede no asociada a la sesión.");
      return listUltrasoundsByPatient(ctx.tenantId, input.patientId);
    },
  });
  return runner(rawData);
}

export async function createUltrasoundAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: createUltrasoundSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`eco:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const created = await createUltrasound(ctx, actorName, input);
      revalidateUltrasoundRoutes(input.patientId);
      return created;
    },
  });
  return runner(rawData);
}

export async function updateUltrasoundAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: updateUltrasoundSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`eco:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const updated = await updateUltrasound(ctx, actorName, input);
      revalidateUltrasoundRoutes(input.patientId);
      return updated;
    },
  });
  return runner(rawData);
}

export async function deleteUltrasoundAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: deleteUltrasoundSchema,
    requiredRole: "admin",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`eco-del:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const deleted = await softDeleteUltrasound(ctx, actorName, input.id);
      revalidateUltrasoundRoutes();
      return deleted;
    },
  });
  return runner(rawData);
}
