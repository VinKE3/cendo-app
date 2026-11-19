import { handleGuardedApi } from "@/lib/security/api-guard";
import { createConsultationSchema } from "../consultas.schema";
import { createConsultation } from "../services/consultas.service";

export async function postConsultationHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: createConsultationSchema,
    requiredRole: "moderator",
    status: 201,
    handler: async ({ ctx, actorName, input }) =>
      createConsultation(ctx, actorName, input),
  });
}
