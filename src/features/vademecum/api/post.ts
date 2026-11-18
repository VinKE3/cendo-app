import { handleGuardedApi } from "@/lib/security/api-guard";
import { vademecumInputSchema } from "../vademecum.schema";
import { createMedication } from "../services/vademecum.service";

export async function postVademecumHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: vademecumInputSchema,
    requiredRole: "moderator",
    status: 201,
    handler: async ({ ctx, actorName, input }) => createMedication(ctx, actorName, input),
  });
}
