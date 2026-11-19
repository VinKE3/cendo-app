import { handleGuardedApi } from "@/lib/security/api-guard";
import { updateLabOrderSchema } from "../laboratorio.schema";
import { updateLabOrder } from "../services/laboratorio.service";

export async function patchLabOrderHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: updateLabOrderSchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) =>
      updateLabOrder(ctx, actorName, input),
  });
}
