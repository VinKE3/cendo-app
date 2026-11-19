import {
  createCheckupSchema,
  deleteCheckupSchema,
  listCheckupsSchema,
  updateCheckupSchema,
} from "@/features/chequeos/chequeos.schema";
import {
  createCheckup,
  listCheckupsByPatient,
  softDeleteCheckup,
  updateCheckup,
} from "@/features/chequeos/services/chequeos.service";
import { DomainError } from "@/lib/security/action-guard";
import { handleGuardedApi } from "@/lib/security/api-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawPatientId = searchParams.get("patientId")?.trim() ?? "";

  return handleGuardedApi({
    handler: async ({ ctx }) => {
      const parsed = listCheckupsSchema.safeParse({ patientId: rawPatientId });
      if (!parsed.success) {
        throw new DomainError("Debe indicar un patientId válido.");
      }
      return listCheckupsByPatient(ctx.tenantId!, parsed.data.patientId);
    },
  });
}

export async function POST(request: Request) {
  return handleGuardedApi({
    request,
    schema: createCheckupSchema,
    requiredRole: "moderator",
    status: 201,
    handler: async ({ ctx, actorName, input }) => {
      const rate = mutationLimiter.check(`chk-api:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      return createCheckup(ctx, actorName, input);
    },
  });
}

export async function PATCH(request: Request) {
  return handleGuardedApi({
    request,
    schema: updateCheckupSchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) => {
      const rate = mutationLimiter.check(`chk-api:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      return updateCheckup(ctx, actorName, input);
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryId = searchParams.get("id")?.trim();

  return handleGuardedApi({
    requiredRole: "admin",
    handler: async ({ ctx, actorName }) => {
      const rate = mutationLimiter.check(`chk-api-del:${ctx.userId}`);
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
          throw new DomainError("Debe indicar el identificador del chequeo.");
        }
      }

      const parsed = deleteCheckupSchema.parse(rawPayload);
      return softDeleteCheckup(ctx, actorName, parsed.id);
    },
  });
}
