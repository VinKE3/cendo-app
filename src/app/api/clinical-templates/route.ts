import {
  createClinicalTemplateSchema,
  deleteClinicalTemplateSchema,
  listClinicalTemplatesQuerySchema,
  restoreOfficialTemplatesSchema,
  updateClinicalTemplateSchema,
} from "@/features/clinical-templates/clinical-templates.schema";
import {
  createClinicalTemplate,
  deleteClinicalTemplate,
  listClinicalTemplates,
  restoreOfficialClinicalTemplates,
  updateClinicalTemplate,
} from "@/features/clinical-templates/services/clinical-templates.service";
import { DomainError } from "@/lib/security/action-guard";
import { handleGuardedApi } from "@/lib/security/api-guard";
import { mutationLimiter } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawScope = searchParams.get("scope")?.trim() || undefined;

  return handleGuardedApi({
    handler: async ({ ctx }) => {
      const parsed = listClinicalTemplatesQuerySchema.safeParse({
        scope: rawScope,
      });
      if (!parsed.success) {
        throw new DomainError(
          "Parámetro scope inválido (use ULTRASOUND o COLPOSCOPY)."
        );
      }
      return listClinicalTemplates(ctx.tenantId!, parsed.data.scope);
    },
  });
}

export async function POST(request: Request) {
  return handleGuardedApi({
    request,
    schema: createClinicalTemplateSchema,
    requiredRole: "moderator",
    status: 201,
    handler: async ({ ctx, actorName, input }) => {
      const rate = mutationLimiter.check(`ct-api-create:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      return createClinicalTemplate(ctx, actorName, input);
    },
  });
}

export async function PATCH(request: Request) {
  return handleGuardedApi({
    request,
    schema: updateClinicalTemplateSchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) => {
      const rate = mutationLimiter.check(`ct-api-update:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      return updateClinicalTemplate(ctx, actorName, input);
    },
  });
}

export async function PUT(request: Request) {
  return handleGuardedApi({
    request,
    schema: restoreOfficialTemplatesSchema,
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) => {
      const rate = mutationLimiter.check(`ct-api-restore:${ctx.userId}`);
      if (!rate.success) {
        throw new DomainError(
          `Demasiadas solicitudes. Espere ${rate.resetInSeconds}s.`
        );
      }
      return restoreOfficialClinicalTemplates(ctx, actorName, input.scope);
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryId = searchParams.get("id")?.trim();

  return handleGuardedApi({
    requiredRole: "moderator",
    handler: async ({ ctx, actorName }) => {
      const rate = mutationLimiter.check(`ct-api-del:${ctx.userId}`);
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
          throw new DomainError("Debe indicar el identificador de plantilla.");
        }
      }

      const parsed = deleteClinicalTemplateSchema.parse(rawPayload);
      return deleteClinicalTemplate(ctx, actorName, parsed.id);
    },
  });
}
