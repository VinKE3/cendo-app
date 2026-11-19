import { handleGuardedApi } from "@/lib/security/api-guard";
import { updateLabTemplateSchema } from "../laboratorio.schema";
import { updateLabTemplate } from "../services/laboratorio.service";

export async function patchLabTemplateHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: updateLabTemplateSchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) =>
      updateLabTemplate(ctx, actorName, input),
  });
}
