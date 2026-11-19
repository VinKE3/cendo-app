import { handleGuardedApi } from "@/lib/security/api-guard";
import { deleteQuoteSchema } from "../cotizaciones.schema";
import { softDeleteQuote } from "../services/cotizaciones.service";

export async function deleteQuoteHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: deleteQuoteSchema,
    requiredRole: "admin",
    handler: async ({ ctx, actorName, input }) =>
      softDeleteQuote(ctx, actorName, input.id),
  });
}
