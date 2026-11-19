import { changePasswordSchema } from "@/features/configuracion/configuracion.schema";
import { changeOwnPassword } from "@/features/configuracion/services/configuracion.service";
import { DomainError } from "@/lib/security/action-guard";
import { handleGuardedApi } from "@/lib/security/api-guard";
import { authLimiter } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  return handleGuardedApi({
    request,
    schema: changePasswordSchema,
    handler: async ({ ctx, actorName, input }) => {
      const rate = authLimiter.check(`pwd-change:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiados intentos de cambio de clave. Espere ${rate.resetInSeconds}s.`
        );
      }

      return changeOwnPassword(ctx, actorName, input);
    },
  });
}
