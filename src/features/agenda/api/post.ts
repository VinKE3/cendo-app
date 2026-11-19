import { handleGuardedApi } from "@/lib/security/api-guard";
import { createAppointmentSchema } from "../agenda.schema";
import { createAppointment } from "../services/agenda.service";

export async function postAppointmentHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: createAppointmentSchema,
    requiredRole: "moderator",
    status: 201,
    handler: async ({ ctx, actorName, input }) =>
      createAppointment(ctx, actorName, input),
  });
}
