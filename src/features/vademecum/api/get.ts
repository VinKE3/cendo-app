import { handleGuardedApi } from "@/lib/security/api-guard";
import { listMedications } from "../services/vademecum.service";

export async function getVademecumHandler() {
  return handleGuardedApi({
    handler: async ({ ctx }) => listMedications(ctx.tenantId!),
  });
}
