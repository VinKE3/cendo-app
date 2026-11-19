import { z } from "zod";
import { handleGuardedApi } from "@/lib/security/api-guard";
import {
  quickPatchAppointmentSchema,
  updateAppointmentSchema,
} from "../agenda.schema";
import {
  patchAppointmentQuick,
  updateAppointment,
} from "../services/agenda.service";

const patchAppointmentUnionSchema = z.union([
  updateAppointmentSchema,
  quickPatchAppointmentSchema,
]);

export async function patchAppointmentHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: patchAppointmentUnionSchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) => {
      if ("appointmentDate" in input) {
        return updateAppointment(ctx, actorName, input);
      }
      return patchAppointmentQuick(ctx, actorName, input);
    },
  });
}
