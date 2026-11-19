import { handleGuardedApi } from "@/lib/security/api-guard";
import { deleteCategorySchema } from "../catalog-categories.schema";
import { deleteCategory } from "../services/catalog-categories.service";

export async function deleteCategoryHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: deleteCategorySchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) =>
      deleteCategory(ctx, actorName, input.id, input.scope),
  });
}
