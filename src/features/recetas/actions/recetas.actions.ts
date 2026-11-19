"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import { guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import {
  createPrescriptionSchema,
  deletePrescriptionSchema,
  updatePrescriptionSchema,
} from "../recetas.schema";
import {
  createPrescription,
  listPrescriptionsByPatient,
  softDeletePrescription,
  updatePrescription,
} from "../services/recetas.service";

const listByPatientSchema = z
  .object({
    patientId: z
      .string()
      .trim()
      .regex(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        "ID de paciente inválido."
      ),
  })
  .strict();

function revalidatePrescriptionRoutes(patientId: string) {
  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/pacientes");
  revalidatePath("/dashboard");
}

export async function listPrescriptionsAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: listByPatientSchema,
    action: async (input, ctx) => {
      if (!ctx.tenantId) throw new Error("Sede no asociada a la sesión.");
      return listPrescriptionsByPatient(ctx.tenantId, input.patientId);
    },
  });
  return runner(rawData);
}

export async function createPrescriptionAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: createPrescriptionSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`prescription:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const created = await createPrescription(ctx, actorName, input);
      revalidatePrescriptionRoutes(input.patientId);
      return created;
    },
  });
  return runner(rawData);
}

export async function updatePrescriptionAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: updatePrescriptionSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`prescription:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const updated = await updatePrescription(ctx, actorName, input);
      revalidatePrescriptionRoutes(input.patientId);
      return updated;
    },
  });
  return runner(rawData);
}

export async function deletePrescriptionAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: deletePrescriptionSchema,
    requiredRole: "admin",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`prescription:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const removed = await softDeletePrescription(ctx, actorName, input.id);
      revalidatePrescriptionRoutes(removed.patientId);
      return removed;
    },
  });
  return runner(rawData);
}
