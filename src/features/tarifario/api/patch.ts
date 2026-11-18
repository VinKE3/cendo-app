import { handleGuardedApi } from "@/lib/security/api-guard";
import { updateTariffSchema } from "../tarifario.schema";
import { updateTariff } from "../services/tarifario.service";

export async function patchTariffHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: updateTariffSchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) => updateTariff(ctx, actorName, input),
  });
}
