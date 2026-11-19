import { deletePrescriptionHandler } from "@/features/recetas/api/delete";
import { getPrescriptionsHandler } from "@/features/recetas/api/get";
import { patchPrescriptionHandler } from "@/features/recetas/api/patch";
import { postPrescriptionHandler } from "@/features/recetas/api/post";

export {
  getPrescriptionsHandler as GET,
  postPrescriptionHandler as POST,
  patchPrescriptionHandler as PATCH,
  deletePrescriptionHandler as DELETE,
};
