import { handleGuardedApi } from "@/lib/security/api-guard";
import { updateVademecumSchema } from "../vademecum.schema";
import { updateMedication } from "../services/vademecum.service";

export async function patchVademecumHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: updateVademecumSchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) => updateMedication(ctx, actorName, input),
  });
}
