import { getVademecumHandler } from "@/features/vademecum/api/get";
import { postVademecumHandler } from "@/features/vademecum/api/post";
import { patchVademecumHandler } from "@/features/vademecum/api/patch";
import { deleteVademecumHandler } from "@/features/vademecum/api/delete";

export async function GET() {
  return getVademecumHandler();
}

export async function POST(request: Request) {
  return postVademecumHandler(request);
}

export async function PATCH(request: Request) {
  return patchVademecumHandler(request);
}

export async function DELETE(request: Request) {
  return deleteVademecumHandler(request);
}
