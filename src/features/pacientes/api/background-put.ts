import { pgUuidSchema } from "@/features/configuracion/configuracion.schema";
import { DomainError } from "@/lib/security/action-guard";
import { handleGuardedApi } from "@/lib/security/api-guard";
import { patientBackgroundInputSchema } from "../pacientes.schema";
import { upsertPatientBackground } from "../services/pacientes.service";

const uuidSchema = pgUuidSchema("ID de paciente inválido.");

export async function putPatientBackgroundHandler(request: Request, patientId: string) {
  return handleGuardedApi({
    request,
    schema: patientBackgroundInputSchema.omit({ patientId: true }).strict(),
    requiredRole: "moderator",
    handler: async ({ ctx, actorName, input }) => {
      const parsedId = uuidSchema.safeParse(patientId);
      if (!parsedId.success) {
        throw new DomainError("ID de paciente inválido.");
      }
      return upsertPatientBackground(ctx, actorName, {
        ...input,
        patientId: parsedId.data,
      });
    },
  });
}
