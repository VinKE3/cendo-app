import { handleGuardedApi } from "@/lib/security/api-guard";
import { createLabTemplateSchema } from "../laboratorio.schema";
import { createLabTemplate } from "../services/laboratorio.service";

export async function postLabTemplateHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: createLabTemplateSchema,
    requiredRole: "moderator",
    status: 201,
    handler: async ({ ctx, actorName, input }) =>
      createLabTemplate(ctx, actorName, input),
  });
}
