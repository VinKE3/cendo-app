"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DomainError, guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import {
  deleteVademecumSchema,
  updateVademecumSchema,
  vademecumInputSchema,
} from "../vademecum.schema";
import {
  createMedication,
  listMedications,
  softDeleteMedication,
  updateMedication,
} from "../services/vademecum.service";

export async function listMedicationsAction() {
  const runner = await guardedAction({
    schema: z.object({}).strict(),
    action: async (_input, ctx) => {
      if (!ctx.tenantId) throw new DomainError("Sede no asociada a la sesión.");
      return listMedications(ctx.tenantId);
    },
  });
  return runner({});
}

export async function createMedicationAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: vademecumInputSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`vademecum:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const created = await createMedication(ctx, actorName, input);
      revalidatePath("/vademecum");
      revalidatePath("/dashboard");
      return created;
    },
  });
  return runner(rawData);
}

export async function updateMedicationAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: updateVademecumSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`vademecum:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const updated = await updateMedication(ctx, actorName, input);
      revalidatePath("/vademecum");
      revalidatePath("/dashboard");
      return updated;
    },
  });
  return runner(rawData);
}

export async function deleteMedicationAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: deleteVademecumSchema,
    requiredRole: "admin",
    action: async (input, ctx) => {
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const res = await softDeleteMedication(ctx, actorName, input.id);
      revalidatePath("/vademecum");
      revalidatePath("/dashboard");
      return res;
    },
  });
  return runner(rawData);
}
