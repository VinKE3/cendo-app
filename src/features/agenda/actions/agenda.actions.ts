"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionDoctorProfile } from "@/features/auth/services/auth.service";
import { pgUuidSchema } from "@/features/configuracion/configuracion.schema";
import { guardedAction } from "@/lib/security/action-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";
import {
  APPOINTMENT_STATUSES,
  createAppointmentSchema,
  deleteAppointmentSchema,
  quickPatchAppointmentSchema,
  updateAppointmentSchema,
} from "../agenda.schema";
import {
  createAppointment,
  listAppointments,
  patchAppointmentQuick,
  softDeleteAppointment,
  updateAppointment,
} from "../services/agenda.service";

const listFilterSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    fromDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    toDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    doctorId: z.string().optional(),
    status: z.enum([...APPOINTMENT_STATUSES, "ALL"]).optional(),
    patientId: pgUuidSchema("ID de paciente inválido.").optional(),
  })
  .strict();

function revalidateAgendaViews(patientId?: string) {
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/pacientes");
  if (patientId) {
    revalidatePath(`/pacientes/${patientId}`);
  }
}

export async function listAppointmentsAction(rawData: unknown = {}) {
  const runner = await guardedAction({
    schema: listFilterSchema,
    action: async (input, ctx) => {
      if (!ctx.tenantId) throw new Error("Sede no asociada a la sesión.");
      return listAppointments(ctx.tenantId, input);
    },
  });
  return runner(rawData);
}

export async function createAppointmentAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: createAppointmentSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`agenda:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const result = await createAppointment(ctx, actorName, input);
      revalidateAgendaViews(result.appointment.patientId);
      return result;
    },
  });
  return runner(rawData);
}

export async function updateAppointmentAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: updateAppointmentSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`agenda:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const updated = await updateAppointment(ctx, actorName, input);
      revalidateAgendaViews(updated.patientId);
      return updated;
    },
  });
  return runner(rawData);
}

export async function patchAppointmentQuickAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: quickPatchAppointmentSchema,
    requiredRole: "moderator",
    action: async (input, ctx) => {
      const rate = mutationLimiter.check(`agenda:${ctx.userId}`);
      if (!rate.success) {
        throw new Error(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const updated = await patchAppointmentQuick(ctx, actorName, input);
      revalidateAgendaViews(updated.patientId);
      return updated;
    },
  });
  return runner(rawData);
}

export async function deleteAppointmentAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: deleteAppointmentSchema,
    requiredRole: "admin",
    action: async (input, ctx) => {
      const actor = await getSessionDoctorProfile(ctx.userId, ctx.tenantId);
      const actorName = actor ? `${actor.doctorTitle} ${actor.fullName}` : ctx.userId;
      const res = await softDeleteAppointment(ctx, actorName, input.id);
      revalidateAgendaViews(res.patientId);
      return res;
    },
  });
  return runner(rawData);
}
