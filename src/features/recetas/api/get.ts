import { DomainError } from "@/lib/security/action-guard";
import { handleGuardedApi } from "@/lib/security/api-guard";
import { listPrescriptionsForTenantPatient } from "../services/recetas.service";

const PG_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getPrescriptionsHandler(request: Request) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId")?.trim() ?? "";

  return handleGuardedApi({
    handler: async ({ ctx }) => {
      if (!PG_UUID_REGEX.test(patientId)) {
        throw new DomainError("Debe indicar un patientId válido.");
      }
      return listPrescriptionsForTenantPatient(ctx.tenantId!, patientId);
    },
  });
}
