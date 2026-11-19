import { DomainError } from "@/lib/security/action-guard";
import { handleGuardedApi } from "@/lib/security/api-guard";
import {
  CATEGORY_SCOPES,
  type CategoryScope,
} from "../catalog-categories.schema";
import { listCategories } from "../services/catalog-categories.service";

export async function getCategoriesHandler(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") ?? "tariff";

  return handleGuardedApi({
    handler: async ({ ctx }) => {
      if (!(CATEGORY_SCOPES as readonly string[]).includes(scope)) {
        throw new DomainError("Ámbito de catálogo inválido.");
      }
      return listCategories(ctx.tenantId!, scope as CategoryScope);
    },
  });
}
