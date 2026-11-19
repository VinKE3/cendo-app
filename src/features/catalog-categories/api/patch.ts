import { handleGuardedApi } from "@/lib/security/api-guard";
import { renameCategorySchema } from "../catalog-categories.schema";
import { renameCategory } from "../services/catalog-categories.service";

export async function patchCategoryHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: renameCategorySchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) =>
      renameCategory(ctx, actorName, input),
  });
}
