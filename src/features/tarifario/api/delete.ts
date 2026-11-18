import { handleGuardedApi } from "@/lib/security/api-guard";
import { deleteTariffSchema } from "../tarifario.schema";
import { softDeleteTariff } from "../services/tarifario.service";

export async function deleteTariffHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: deleteTariffSchema,
    requiredRole: "admin",
    handler: async ({ ctx, actorName, input }) =>
      softDeleteTariff(ctx, actorName, input.id),
  });
}
