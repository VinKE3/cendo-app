import { handleGuardedApi } from "@/lib/security/api-guard";
import { listAppointments } from "../services/agenda.service";

export async function getAppointmentsHandler(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;
  const fromDate = searchParams.get("from") ?? undefined;
  const toDate = searchParams.get("to") ?? undefined;
  const doctorId = searchParams.get("doctorId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const patientId = searchParams.get("patientId") ?? undefined;

  return handleGuardedApi({
    handler: async ({ ctx }) =>
      listAppointments(ctx.tenantId!, {
        date,
        fromDate,
        toDate,
        doctorId,
        status,
        patientId,
      }),
  });
}
