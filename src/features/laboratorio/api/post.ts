import { handleGuardedApi } from "@/lib/security/api-guard";
import { createLabOrderSchema } from "../laboratorio.schema";
import { createLabOrder } from "../services/laboratorio.service";

export async function postLabOrderHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: createLabOrderSchema,
    requiredRole: "moderator",
    status: 201,
    handler: async ({ ctx, actorName, input }) =>
      createLabOrder(ctx, actorName, input),
  });
}
