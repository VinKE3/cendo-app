import { handleGuardedApi } from "@/lib/security/api-guard";
import { listDoctors } from "../services/usuarios.service";

export async function getUsuariosHandler() {
  return handleGuardedApi({
    requiredRole: "admin",
    handler: async ({ ctx }) => listDoctors(ctx.tenantId!),
  });
}
