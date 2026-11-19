import { handleGuardedApi } from "@/lib/security/api-guard";
import { deleteLabOrderSchema } from "../laboratorio.schema";
import { softDeleteLabOrder } from "../services/laboratorio.service";

export async function deleteLabOrderHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: deleteLabOrderSchema,
    requiredRole: "admin",
    handler: async ({ ctx, actorName, input }) =>
      softDeleteLabOrder(ctx, actorName, input.id),
  });
}
