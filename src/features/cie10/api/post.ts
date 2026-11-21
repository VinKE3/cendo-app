import { handleGuardedApi } from "@/lib/security/api-guard";
import { cie10InputSchema } from "../cie10.schema";
import { createCie10Code } from "../services/cie10.service";

export async function postCie10Handler(request: Request) {
  return handleGuardedApi({
    request,
    schema: cie10InputSchema,
    requiredRole: "moderator",
    status: 201,
    handler: async ({ ctx, actorName, input }) =>
      createCie10Code(ctx, actorName, input),
  });
}
