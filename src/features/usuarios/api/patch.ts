import { handleGuardedApi } from "@/lib/security/api-guard";
import { updateDoctorSchema } from "../usuarios.schema";
import { updateDoctor } from "../services/usuarios.service";

export async function patchUsuariosHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: updateDoctorSchema,
    requiredRole: "admin",
    handler: async ({ ctx, actorName, input }) => updateDoctor(ctx, actorName, input),
  });
}
