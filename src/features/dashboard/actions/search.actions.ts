"use server";

import { guardedAction } from "@/lib/security/action-guard";
import { globalSearchSchema } from "../dashboard.schema";
import { globalClinicalSearch } from "../services/dashboard.service";

export async function globalSearchAction(rawData: unknown) {
  const runner = await guardedAction({
    schema: globalSearchSchema,
    action: async (input, ctx) => {
      if (!ctx.tenantId) {
        throw new Error("Contexto de sede no encontrado en la sesión.");
      }
      return globalClinicalSearch(ctx.tenantId, input.query);
    },
  });
  return runner(rawData);
}
