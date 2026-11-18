import { handleGuardedApi } from "@/lib/security/api-guard";
import { createDoctorSchema } from "../usuarios.schema";
import { createDoctor } from "../services/usuarios.service";

export async function postUsuariosHandler(request: Request) {
  return handleGuardedApi({
    request,
    schema: createDoctorSchema,
    requiredRole: "admin",
    status: 201,
    handler: async ({ ctx, actorName, input }) => createDoctor(ctx, actorName, input),
  });
}
