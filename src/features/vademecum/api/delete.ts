import { handleGuardedApi } from "@/lib/security/api-guard";
import { deleteVademecumSchema } from "../vademecum.schema";
import { softDeleteMedication } from "../services/vademecum.service";

export async function deleteVademecumHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: deleteVademecumSchema,
    requiredRole: "admin",
    handler: async ({ ctx, actorName, input }) =>
      softDeleteMedication(ctx, actorName, input.id),
  });
}
