import { updateDoctorConfigSchema } from "@/features/configuracion/configuracion.schema";
import {
  getOwnConfigProfile,
  listTenantSignatureDirectory,
  updateOwnConfigProfile,
} from "@/features/configuracion/services/configuracion.service";
import { DomainError } from "@/lib/security/action-guard";
import { handleGuardedApi } from "@/lib/security/api-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";

export async function GET() {
  return handleGuardedApi({
    handler: async ({ ctx }) => {
      const tenantId = ctx.tenantId!;
      const [profile, signatureDirectory] = await Promise.all([
        getOwnConfigProfile(tenantId, ctx.userId),
        listTenantSignatureDirectory(tenantId),
      ]);

      return {
        profile,
        signatureDirectory,
      };
    },
  });
}

export async function PATCH(request: Request) {
  return handleGuardedApi({
    request,
    schema: updateDoctorConfigSchema,
    handler: async ({ ctx, actorName, input }) => {
      const rate = mutationLimiter.check(`config-api:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }

      const profile = await updateOwnConfigProfile(ctx, actorName, input);
      const signatureDirectory = await listTenantSignatureDirectory(ctx.tenantId!);

      return {
        profile,
        signatureDirectory,
      };
    },
  });
}
