import { getCategoriesHandler } from "@/features/catalog-categories/api/get";
import { postCategoryHandler } from "@/features/catalog-categories/api/post";
import { patchCategoryHandler } from "@/features/catalog-categories/api/patch";
import { deleteCategoryHandler } from "@/features/catalog-categories/api/delete";

export async function GET(request: Request) {
  return getCategoriesHandler(request);
}

export async function POST(request: Request) {
  return postCategoryHandler(request);
}

export async function PATCH(request: Request) {
  return patchCategoryHandler(request);
}

export async function DELETE(request: Request) {
  return deleteCategoryHandler(request);
}
