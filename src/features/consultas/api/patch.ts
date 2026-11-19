import { handleGuardedApi } from "@/lib/security/api-guard";
import { updateConsultationSchema } from "../consultas.schema";
import { updateConsultation } from "../services/consultas.service";

export async function patchConsultationHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: updateConsultationSchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) =>
      updateConsultation(ctx, actorName, input),
  });
}
