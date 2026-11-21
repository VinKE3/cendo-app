import { handleGuardedApi } from "@/lib/security/api-guard";
import { listCie10Codes } from "../services/cie10.service";

export async function getCie10Handler() {
  return handleGuardedApi({
    handler: async ({ ctx }) => listCie10Codes(ctx.tenantId!),
  });
}
