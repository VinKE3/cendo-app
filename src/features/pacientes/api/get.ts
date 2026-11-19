import { handleGuardedApi } from "@/lib/security/api-guard";
import { listPatients } from "../services/pacientes.service";

export async function getPatientsHandler() {
  return handleGuardedApi({
    handler: async ({ ctx }) => listPatients(ctx.tenantId!),
  });
}
