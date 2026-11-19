import { handleGuardedApi } from "@/lib/security/api-guard";
import { updatePrescriptionSchema } from "../recetas.schema";
import { updatePrescription } from "../services/recetas.service";

export async function patchPrescriptionHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: updatePrescriptionSchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) =>
      updatePrescription(ctx, actorName, input),
  });
}
