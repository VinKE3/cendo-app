"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import { guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import {
  createLabOrderSchema,
  createLabTemplateSchema,
  deleteLabOrderSchema,
  deleteLabTemplateSchema,
  updateLabOrderSchema,
  updateLabTemplateSchema,
} from "../laboratorio.schema";
import {
  createLabOrder,
  createLabTemplate,
  listLabOrdersByPatient,
  listLabTemplates,
  softDeleteLabOrder,
  softDeleteLabTemplate,
  updateLabOrder,
  updateLabTemplate,
} from "../services/laboratorio.service";

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

function revalidateLabRoutes(patientId?: string) {
  if (patientId) {
    revalidatePath(`/pacientes/${patientId}`);
  }
  revalidatePath("/pacientes");
  revalidatePath("/dashboard");
}

export async function listLabOrdersAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: listByPatientSchema,
    action: async (input, ctx) => {
      if (!ctx.tenantId) throw new Error("Sede no asociada a la sesión.");
      return listLabOrdersByPatient(ctx.tenantId, input.patientId);
    },
  });
  return runner(rawData);
}

export async function createLabOrderAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: createLabOrderSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`lab-order:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const created = await createLabOrder(ctx, actorName, input);
      revalidateLabRoutes(input.patientId);
      return created;
    },
  });
  return runner(rawData);
}

export async function updateLabOrderAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: updateLabOrderSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`lab-order:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const updated = await updateLabOrder(ctx, actorName, input);
      revalidateLabRoutes(input.patientId);
      return updated;
    },
  });
  return runner(rawData);
}

export async function deleteLabOrderAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: deleteLabOrderSchema,
    requiredRole: "admin",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`lab-order:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const removed = await softDeleteLabOrder(ctx, actorName, input.id);
      revalidateLabRoutes(removed.patientId);
      return removed;
    },
  });
  return runner(rawData);
}

export async function listLabTemplatesAction() {
  const runner = await guardedAction({
    schema: z.object({}).strict(),
    action: async (_input, ctx) => {
      if (!ctx.tenantId) throw new Error("Sede no asociada a la sesión.");
      return listLabTemplates(ctx.tenantId);
    },
  });
  return runner({});
}

export async function createLabTemplateAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: createLabTemplateSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`lab-tmpl:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const created = await createLabTemplate(ctx, actorName, input);
      revalidateLabRoutes();
      return created;
    },
  });
  return runner(rawData);
}

export async function updateLabTemplateAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: updateLabTemplateSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`lab-tmpl:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const updated = await updateLabTemplate(ctx, actorName, input);
      revalidateLabRoutes();
      return updated;
    },
  });
  return runner(rawData);
}

export async function deleteLabTemplateAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: deleteLabTemplateSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`lab-tmpl:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const removed = await softDeleteLabTemplate(ctx, actorName, input.id);
      revalidateLabRoutes();
      return removed;
    },
  });
  return runner(rawData);
}
