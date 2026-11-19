import { handleGuardedApi } from "@/lib/security/api-guard";
import { patientInputSchema } from "../pacientes.schema";
import { createPatient } from "../services/pacientes.service";

export async function postPatientHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: patientInputSchema,
    requiredRole: "moderator",
    status: 201,
    handler: async ({ ctx, actorName, input }) => createPatient(ctx, actorName, input),
  });
}
