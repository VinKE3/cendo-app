import {
  createMinorProcedureSchema,
  deleteMinorProcedureSchema,
  listMinorProceduresSchema,
  updateMinorProcedureSchema,
} from "@/features/procedimientos/procedimientos.schema";
import {
  createMinorProcedure,
  listMinorProceduresByPatient,
  softDeleteMinorProcedure,
  updateMinorProcedure,
} from "@/features/procedimientos/services/procedimientos.service";
import { DomainError } from "@/lib/security/action-guard";
import { handleGuardedApi } from "@/lib/security/api-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawPatientId = searchParams.get("patientId")?.trim() ?? "";

  return handleGuardedApi({
    handler: async ({ ctx }) => {
      const parsed = listMinorProceduresSchema.safeParse({
        patientId: rawPatientId,
      });
      if (!parsed.success) {
        throw new DomainError("Debe indicar un patientId válido.");
      }
      return listMinorProceduresByPatient(ctx.tenantId!, parsed.data.patientId);
    },
  });
}

export async function POST(request: Request) {
  return handleGuardedApi({
    request,
    schema: createMinorProcedureSchema,
    requiredRole: "moderator",
    status: 201,
    handler: async ({ ctx, actorName, input }) => {
      const rate = mutationLimiter.check(`proc-api:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      return createMinorProcedure(ctx, actorName, input);
    },
  });
}

export async function PATCH(request: Request) {
  return handleGuardedApi({
    request,
    schema: updateMinorProcedureSchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) => {
      const rate = mutationLimiter.check(`proc-api:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      return updateMinorProcedure(ctx, actorName, input);
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryId = searchParams.get("id")?.trim();

  return handleGuardedApi({
    requiredRole: "admin",
    handler: async ({ ctx, actorName }) => {
      const rate = mutationLimiter.check(`proc-api-del:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }

      let rawPayload: unknown = queryId ? { id: queryId } : undefined;
      if (!rawPayload) {
        try {
          rawPayload = await request.json();
        } catch {
          throw new DomainError(
            "Debe indicar el identificador del procedimiento."
          );
        }
      }

      const parsed = deleteMinorProcedureSchema.parse(rawPayload);
      return softDeleteMinorProcedure(ctx, actorName, parsed.id);
    },
  });
}
