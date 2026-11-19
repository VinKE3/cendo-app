import {
  createColposcopySchema,
  deleteColposcopySchema,
  listColposcopiesSchema,
  updateColposcopySchema,
} from "@/features/colposcopia/colposcopia.schema";
import {
  createColposcopy,
  listColposcopiesByPatient,
  softDeleteColposcopy,
  updateColposcopy,
} from "@/features/colposcopia/services/colposcopia.service";
import { DomainError } from "@/lib/security/action-guard";
import { handleGuardedApi } from "@/lib/security/api-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawPatientId = searchParams.get("patientId")?.trim() ?? "";

  return handleGuardedApi({
    handler: async ({ ctx }) => {
      const parsed = listColposcopiesSchema.safeParse({ patientId: rawPatientId });
      if (!parsed.success) {
        throw new DomainError("Debe indicar un patientId válido.");
      }
      return listColposcopiesByPatient(ctx.tenantId!, parsed.data.patientId);
    },
  });
}

export async function POST(request: Request) {
  return handleGuardedApi({
    request,
    schema: createColposcopySchema,
    requiredRole: "moderator",
    status: 201,
    handler: async ({ ctx, actorName, input }) => {
      const rate = mutationLimiter.check(`colpo-api:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      return createColposcopy(ctx, actorName, input);
    },
  });
}

export async function PATCH(request: Request) {
  return handleGuardedApi({
    request,
    schema: updateColposcopySchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) => {
      const rate = mutationLimiter.check(`colpo-api:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      return updateColposcopy(ctx, actorName, input);
    },
  });
}

export async function DELETE(request: Request) {
  return handleGuardedApi({
    request,
    schema: deleteColposcopySchema,
    requiredRole: "admin",
    handler: async ({ ctx, actorName, input }) => {
      const rate = mutationLimiter.check(`colpo-api-del:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      return softDeleteColposcopy(ctx, actorName, input.id);
    },
  });
}
