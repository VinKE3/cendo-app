import { handleGuardedApi } from "@/lib/security/api-guard";
import { listLabTemplates } from "../services/laboratorio.service";

export async function getLabTemplatesHandler() {
  return handleGuardedApi({
    handler: async ({ ctx }) => listLabTemplates(ctx.tenantId!),
  });
}
