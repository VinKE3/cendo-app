import { handleGuardedApi } from "@/lib/security/api-guard";
import { createPrescriptionSchema } from "../recetas.schema";
import { createPrescription } from "../services/recetas.service";

export async function postPrescriptionHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: createPrescriptionSchema,
    requiredRole: "moderator",
    status: 201,
    handler: async ({ ctx, actorName, input }) =>
      createPrescription(ctx, actorName, input),
  });
}
