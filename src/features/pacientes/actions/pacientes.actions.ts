"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import { guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import {
  deletePatientSchema,
  patientBackgroundInputSchema,
  patientInputSchema,
  updatePatientSchema,
} from "../pacientes.schema";
import {
  createPatient,
  listPatients,
  softDeletePatient,
  updatePatient,
  upsertPatientBackground,
} from "../services/pacientes.service";

export async function listPatientsAction() {
  const runner = await guardedAction({
    schema: z.object({}).strict(),
    action: async (_input, ctx) => {
      if (!ctx.tenantId) throw new Error("Sede no asociada a la sesión.");
      return listPatients(ctx.tenantId);
    },
  });
  return runner({});
}

export async function createPatientAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: patientInputSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`patient:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const created = await createPatient(ctx, actorName, input);
      revalidatePath("/pacientes");
      revalidatePath("/dashboard");
      return created;
    },
  });
  return runner(rawData);
}

export async function updatePatientAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: updatePatientSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`patient:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const updated = await updatePatient(ctx, actorName, input);
      revalidatePath("/pacientes");
      revalidatePath(`/pacientes/${updated.id}`);
      revalidatePath("/dashboard");
      return updated;
    },
  });
  return runner(rawData);
}

export async function deletePatientAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: deletePatientSchema,
    requiredRole: "admin",
    action: async (input, ctx) => {
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const res = await softDeletePatient(ctx, actorName, input.id);
      revalidatePath("/pacientes");
      revalidatePath("/dashboard");
      return res;
    },
  });
  return runner(rawData);
}

export async function upsertPatientBackgroundAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: patientBackgroundInputSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`background:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const saved = await upsertPatientBackground(ctx, actorName, input);
      revalidatePath("/pacientes");
      revalidatePath(`/pacientes/${input.patientId}`);
      return saved;
    },
  });
  return runner(rawData);
}
