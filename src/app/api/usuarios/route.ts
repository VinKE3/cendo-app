import { getUsuariosHandler } from "@/features/usuarios/api/get";
import { postUsuariosHandler } from "@/features/usuarios/api/post";
import { patchUsuariosHandler } from "@/features/usuarios/api/patch";
import { deleteUsuariosHandler } from "@/features/usuarios/api/delete";

export async function GET() {
  return getUsuariosHandler();
}

export async function POST(request: Request) {
  return postUsuariosHandler(request);
}

export async function PATCH(request: Request) {
  return patchUsuariosHandler(request);
}

export async function DELETE(request: Request) {
  return deleteUsuariosHandler(request);
}
