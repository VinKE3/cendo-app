import { getTariffsHandler } from "@/features/tarifario/api/get";
import { postTariffHandler } from "@/features/tarifario/api/post";
import { patchTariffHandler } from "@/features/tarifario/api/patch";
import { deleteTariffHandler } from "@/features/tarifario/api/delete";

export async function GET() {
  return getTariffsHandler();
}

export async function POST(request: Request) {
  return postTariffHandler(request);
}

export async function PATCH(request: Request) {
  return patchTariffHandler(request);
}

export async function DELETE(request: Request) {
  return deleteTariffHandler(request);
}
