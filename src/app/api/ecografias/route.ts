import {
  createUltrasoundSchema,
  deleteUltrasoundSchema,
  listUltrasoundsSchema,
  updateUltrasoundSchema,
} from "@/features/ecografias/ecografias.schema";
import {
  createUltrasound,
  listUltrasoundsByPatient,
  softDeleteUltrasound,
  updateUltrasound,
} from "@/features/ecografias/services/ecografias.service";
import { DomainError } from "@/lib/security/action-guard";
import { handleGuardedApi } from "@/lib/security/api-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawPatientId = searchParams.get("patientId")?.trim() ?? "";

  return handleGuardedApi({
    handler: async ({ ctx }) => {
      const parsed = listUltrasoundsSchema.safeParse({ patientId: rawPatientId });
      if (!parsed.success) {
        throw new DomainError("Debe indicar un patientId válido.");
      }
      return listUltrasoundsByPatient(ctx.tenantId!, parsed.data.patientId);
    },
  });
}

export async function POST(request: Request) {
  return handleGuardedApi({
    request,
    schema: createUltrasoundSchema,
    requiredRole: "moderator",
    status: 201,
    handler: async ({ ctx, actorName, input }) => {
      const rate = mutationLimiter.check(`eco-api:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      return createUltrasound(ctx, actorName, input);
    },
  });
}

export async function PATCH(request: Request) {
  return handleGuardedApi({
    request,
    schema: updateUltrasoundSchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) => {
      const rate = mutationLimiter.check(`eco-api:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      return updateUltrasound(ctx, actorName, input);
    },
  });
}

export async function DELETE(request: Request) {
  return handleGuardedApi({
    request,
    schema: deleteUltrasoundSchema,
    requiredRole: "admin",
    handler: async ({ ctx, actorName, input }) => {
      const rate = mutationLimiter.check(`eco-api-del:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(`Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`);
      }
      return softDeleteUltrasound(ctx, actorName, input.id);
    },
  });
}
