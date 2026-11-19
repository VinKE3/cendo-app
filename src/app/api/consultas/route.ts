import { getConsultationsHandler } from "@/features/consultas/api/get";
import { postConsultationHandler } from "@/features/consultas/api/post";
import { patchConsultationHandler } from "@/features/consultas/api/patch";
import { deleteConsultationHandler } from "@/features/consultas/api/delete";

export async function GET(request: Request) {
  return getConsultationsHandler(request);
}

export async function POST(request: Request) {
  return postConsultationHandler(request);
}

export async function PATCH(request: Request) {
  return patchConsultationHandler(request);
}

export async function DELETE(request: Request) {
  return deleteConsultationHandler(request);
}
