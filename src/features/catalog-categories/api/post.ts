import { handleGuardedApi } from "@/lib/security/api-guard";
import { createCategorySchema } from "../catalog-categories.schema";
import { createCategory } from "../services/catalog-categories.service";

export async function postCategoryHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: createCategorySchema,
    requiredRole: "moderator",
    status: 201,
    handler: async ({ ctx, actorName, input }) =>
      createCategory(ctx, actorName, input),
  });
}
