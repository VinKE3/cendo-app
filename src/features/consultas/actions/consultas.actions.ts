"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import { guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import {
  createConsultationSchema,
  deleteConsultationSchema,
  updateConsultationSchema,
} from "../consultas.schema";
import {
  createConsultation,
  listConsultationsByPatient,
  softDeleteConsultation,
  updateConsultation,
} from "../services/consultas.service";

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

function revalidateConsultationRoutes(patientId: string) {
  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/pacientes");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

export async function listConsultationsAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: listByPatientSchema,
    action: async (input, ctx) => {
      if (!ctx.tenantId) throw new Error("Sede no asociada a la sesión.");
      return listConsultationsByPatient(ctx.tenantId, input.patientId);
    },
  });
  return runner(rawData);
}

export async function createConsultationAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: createConsultationSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`consultation:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const result = await createConsultation(ctx, actorName, input);
      revalidateConsultationRoutes(input.patientId);
      return result;
    },
  });
  return runner(rawData);
}

export async function updateConsultationAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: updateConsultationSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`consultation:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const updated = await updateConsultation(ctx, actorName, input);
      revalidateConsultationRoutes(updated.patientId);
      return updated;
    },
  });
  return runner(rawData);
}

export async function deleteConsultationAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: deleteConsultationSchema,
    requiredRole: "admin",
    action: async (input, ctx) => {
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const res = await softDeleteConsultation(ctx, actorName, input.id);
      revalidateConsultationRoutes(res.patientId);
      return res;
    },
  });
  return runner(rawData);
}
