import { handleGuardedApi } from "@/lib/security/api-guard";
import { updateQuoteSchema } from "../cotizaciones.schema";
import { updateQuote } from "../services/cotizaciones.service";

export async function patchQuoteHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: updateQuoteSchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) =>
      updateQuote(ctx, actorName, input),
  });
}
