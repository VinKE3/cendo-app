import { getPatientBackgroundHandler } from "@/features/pacientes/api/background-get";
import { putPatientBackgroundHandler } from "@/features/pacientes/api/background-put";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return getPatientBackgroundHandler(id);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return putPatientBackgroundHandler(request, id);
}
