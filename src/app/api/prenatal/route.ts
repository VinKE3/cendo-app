import { z } from "zod";
import {
  deletePrenatalCardSchema,
  upsertPrenatalCardInputSchema,
} from "@/features/prenatal/prenatal.schema";
import {
  getPrenatalCardById,
  getPrenatalCardByPatient,
  softDeletePrenatalCard,
  upsertPrenatalCard,
} from "@/features/prenatal/services/prenatal.service";
import { DomainError } from "@/lib/security/action-guard";
import { handleGuardedApi } from "@/lib/security/api-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";

const pgUuidSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawId = searchParams.get("id")?.trim();
  const rawPatientId = searchParams.get("patientId")?.trim();

  return handleGuardedApi({
    handler: async ({ ctx }) => {
      if (rawId) {
        const parsedId = pgUuidSchema.safeParse(rawId);
        if (!parsedId.success) {
          throw new DomainError("ID de carnet prenatal inválido.");
        }
        return getPrenatalCardById(ctx.tenantId!, parsedId.data);
      }

      const parsedPatientId = pgUuidSchema.safeParse(rawPatientId ?? "");
      if (!parsedPatientId.success) {
        throw new DomainError("Debe indicar un patientId o id válido.");
      }

      return getPrenatalCardByPatient(ctx.tenantId!, parsedPatientId.data);
    },
  });
}

export async function POST(request: Request) {
  return handleGuardedApi({
    request,
    schema: upsertPrenatalCardInputSchema,
    requiredRole: "moderator",
    status: 201,
    handler: async ({ ctx, actorName, input }) => {
      const rate = mutationLimiter.check(`prenatal-api:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      return upsertPrenatalCard(ctx, actorName, input);
    },
  });
}

export async function PATCH(request: Request) {
  return handleGuardedApi({
    request,
    schema: upsertPrenatalCardInputSchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) => {
      const rate = mutationLimiter.check(`prenatal-api:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      return upsertPrenatalCard(ctx, actorName, input);
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryId = searchParams.get("id")?.trim();

  return handleGuardedApi({
    requiredRole: "admin",
    handler: async ({ ctx, actorName }) => {
      const rate = mutationLimiter.check(`prenatal-api-del:${ctx.userId}`);
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
          throw new DomainError("Debe indicar el ID del carnet prenatal.");
        }
      }

      const parsed = deletePrenatalCardSchema.parse(rawPayload);
      return softDeletePrenatalCard(ctx, actorName, parsed.id);
    },
  });
}
