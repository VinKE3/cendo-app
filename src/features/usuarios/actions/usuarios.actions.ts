"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DomainError, guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import {
  createDoctorSchema,
  deleteDoctorSchema,
  updateDoctorSchema,
} from "../usuarios.schema";
import {
  createDoctor,
  listDoctors,
  softDeleteDoctor,
  updateDoctor,
} from "../services/usuarios.service";

export async function listDoctorsAction() {
  const runner = await guardedAction({
    schema: z.object({}).strict(),
    requiredRole: "admin",
    action: async (_input, ctx) => {
      if (!ctx.tenantId) throw new DomainError("Sede no asociada a la sesión.");
      return listDoctors(ctx.tenantId);
    },
  });
  return runner({});
}

export async function createDoctorAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: createDoctorSchema,
    requiredRole: "admin",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`usuarios:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const created = await createDoctor(ctx, actorName, input);
      revalidatePath("/usuarios");
      return created;
    },
  });
  return runner(rawData);
}

export async function updateDoctorAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: updateDoctorSchema,
    requiredRole: "admin",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`usuarios:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const updated = await updateDoctor(ctx, actorName, input);
      revalidatePath("/usuarios");
      return updated;
    },
  });
  return runner(rawData);
}

export async function deleteDoctorAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: deleteDoctorSchema,
    requiredRole: "admin",
    action: async (input, ctx) => {
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const res = await softDeleteDoctor(ctx, actorName, input.id);
      revalidatePath("/usuarios");
      return res;
    },
  });
  return runner(rawData);
}
