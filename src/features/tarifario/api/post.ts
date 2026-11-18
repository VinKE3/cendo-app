import { handleGuardedApi } from "@/lib/security/api-guard";
import { tariffInputSchema } from "../tarifario.schema";
import { createTariff } from "../services/tarifario.service";

export async function postTariffHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: tariffInputSchema,
    requiredRole: "moderator",
    status: 201,
    handler: async ({ ctx, actorName, input }) => createTariff(ctx, actorName, input),
  });
}
