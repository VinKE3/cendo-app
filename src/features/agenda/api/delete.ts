import { handleGuardedApi } from "@/lib/security/api-guard";
import { deleteAppointmentSchema } from "../agenda.schema";
import { softDeleteAppointment } from "../services/agenda.service";

export async function deleteAppointmentHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: deleteAppointmentSchema,
    requiredRole: "admin",
    handler: async ({ ctx, actorName, input }) =>
      softDeleteAppointment(ctx, actorName, input.id),
  });
}
