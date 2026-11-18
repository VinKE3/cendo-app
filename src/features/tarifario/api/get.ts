import { handleGuardedApi } from "@/lib/security/api-guard";
import { listTariffs } from "../services/tarifario.service";

export async function getTariffsHandler() {
  return handleGuardedApi({
    handler: async ({ ctx }) => listTariffs(ctx.tenantId!),
  });
}
