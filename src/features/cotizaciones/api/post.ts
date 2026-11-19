import { handleGuardedApi } from "@/lib/security/api-guard";
import { createQuoteSchema } from "../cotizaciones.schema";
import { createQuote } from "../services/cotizaciones.service";

export async function postQuoteHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: createQuoteSchema,
    requiredRole: "moderator",
    status: 201,
    handler: async ({ ctx, actorName, input }) =>
      createQuote(ctx, actorName, input),
  });
}
