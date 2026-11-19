import { handleGuardedApi } from "@/lib/security/api-guard";
import { deletePatientSchema } from "../pacientes.schema";
import { softDeletePatient } from "../services/pacientes.service";

export async function deletePatientHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: deletePatientSchema,
    requiredRole: "admin",
    handler: async ({ ctx, actorName, input }) => softDeletePatient(ctx, actorName, input.id),
  });
}
