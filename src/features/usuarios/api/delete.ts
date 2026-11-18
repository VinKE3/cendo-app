import { handleGuardedApi } from "@/lib/security/api-guard";
import { deleteDoctorSchema } from "../usuarios.schema";
import { softDeleteDoctor } from "../services/usuarios.service";

export async function deleteUsuariosHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: deleteDoctorSchema,
    requiredRole: "admin",
    handler: async ({ ctx, actorName, input }) =>
      softDeleteDoctor(ctx, actorName, input.id),
  });
}
