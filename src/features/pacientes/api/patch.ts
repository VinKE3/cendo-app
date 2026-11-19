import { handleGuardedApi } from "@/lib/security/api-guard";
import { updatePatientSchema } from "../pacientes.schema";
import { updatePatient } from "../services/pacientes.service";

export async function patchPatientHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: updatePatientSchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) => updatePatient(ctx, actorName, input),
  });
}
