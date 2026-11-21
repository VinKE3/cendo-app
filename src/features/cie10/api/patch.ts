import { handleGuardedApi } from "@/lib/security/api-guard";
import { updateCie10Schema } from "../cie10.schema";
import { updateCie10Code } from "../services/cie10.service";

export async function patchCie10Handler(request: Request) {
  return handleGuardedApi({
    request,
    schema: updateCie10Schema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) =>
      updateCie10Code(ctx, actorName, input),
  });
}
