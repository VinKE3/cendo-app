import { z } from "zod";
import { DomainError } from "@/lib/security/action-guard";
import { handleGuardedApi } from "@/lib/security/api-guard";
import { getPatientBackground } from "../services/pacientes.service";

const uuidSchema = z.string().uuid("ID de paciente inválido.");

export async function getPatientBackgroundHandler(patientId: string) {
  return handleGuardedApi({
    handler: async ({ ctx }) => {
      const parsedId = uuidSchema.safeParse(patientId);
      if (!parsedId.success) {
        throw new DomainError("ID de paciente inválido.");
      }
      const bg = await getPatientBackground(ctx.tenantId!, parsedId.data);
      if (!bg) {
        throw new DomainError("Paciente o antecedentes no encontrados.");
      }
      return bg;
    },
  });
}
