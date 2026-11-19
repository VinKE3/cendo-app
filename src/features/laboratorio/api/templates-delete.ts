import { handleGuardedApi } from "@/lib/security/api-guard";
import { deleteLabTemplateSchema } from "../laboratorio.schema";
import { softDeleteLabTemplate } from "../services/laboratorio.service";

export async function deleteLabTemplateHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: deleteLabTemplateSchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) =>
      softDeleteLabTemplate(ctx, actorName, input.id),
  });
}
