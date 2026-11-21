import { handleGuardedApi } from "@/lib/security/api-guard";
import { deleteCie10Schema } from "../cie10.schema";
import { softDeleteCie10Code } from "../services/cie10.service";

export async function deleteCie10Handler(request: Request) {
  return handleGuardedApi({
    request,
    schema: deleteCie10Schema,
    requiredRole: "admin",
    handler: async ({ ctx, actorName, input }) =>
      softDeleteCie10Code(ctx, actorName, input.id),
  });
}
