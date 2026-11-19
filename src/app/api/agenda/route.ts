import { getAppointmentsHandler } from "@/features/agenda/api/get";
import { postAppointmentHandler } from "@/features/agenda/api/post";
import { patchAppointmentHandler } from "@/features/agenda/api/patch";
import { deleteAppointmentHandler } from "@/features/agenda/api/delete";

export async function GET(request: Request) {
  return getAppointmentsHandler(request);
}

export async function POST(request: Request) {
  return postAppointmentHandler(request);
}

export async function PATCH(request: Request) {
  return patchAppointmentHandler(request);
}

export async function DELETE(request: Request) {
  return deleteAppointmentHandler(request);
}
