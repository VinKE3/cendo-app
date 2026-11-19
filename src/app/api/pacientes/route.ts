import { getPatientsHandler } from "@/features/pacientes/api/get";
import { postPatientHandler } from "@/features/pacientes/api/post";
import { patchPatientHandler } from "@/features/pacientes/api/patch";
import { deletePatientHandler } from "@/features/pacientes/api/delete";

export async function GET() {
  return getPatientsHandler();
}

export async function POST(request: Request) {
  return postPatientHandler(request);
}

export async function PATCH(request: Request) {
  return patchPatientHandler(request);
}

export async function DELETE(request: Request) {
  return deletePatientHandler(request);
}
