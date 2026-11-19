import { handleGuardedApi } from "@/lib/security/api-guard";
import { deleteConsultationSchema } from "../consultas.schema";
import { softDeleteConsultation } from "../services/consultas.service";

export async function deleteConsultationHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: deleteConsultationSchema,
    requiredRole: "admin",
    handler: async ({ ctx, actorName, input }) =>
      softDeleteConsultation(ctx, actorName, input.id),
  });
}
