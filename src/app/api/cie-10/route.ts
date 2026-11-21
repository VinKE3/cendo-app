import { getCie10Handler } from "@/features/cie10/api/get";
import { postCie10Handler } from "@/features/cie10/api/post";
import { patchCie10Handler } from "@/features/cie10/api/patch";
import { deleteCie10Handler } from "@/features/cie10/api/delete";

export async function GET() {
  return getCie10Handler();
}

export async function POST(request: Request) {
  return postCie10Handler(request);
}

export async function PATCH(request: Request) {
  return patchCie10Handler(request);
}

export async function DELETE(request: Request) {
  return deleteCie10Handler(request);
}
