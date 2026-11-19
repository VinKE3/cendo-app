import { handleGuardedApi } from "@/lib/security/api-guard";
import { deletePrescriptionSchema } from "../recetas.schema";
import { softDeletePrescription } from "../services/recetas.service";

export async function deletePrescriptionHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: deletePrescriptionSchema,
    requiredRole: "admin",
    handler: async ({ ctx, actorName, input }) =>
      softDeletePrescription(ctx, actorName, input.id),
  });
}
