import { deleteLabOrderHandler } from "@/features/laboratorio/api/delete";
import { getLabOrdersHandler } from "@/features/laboratorio/api/get";
import { patchLabOrderHandler } from "@/features/laboratorio/api/patch";
import { postLabOrderHandler } from "@/features/laboratorio/api/post";

export {
  getLabOrdersHandler as GET,
  postLabOrderHandler as POST,
  patchLabOrderHandler as PATCH,
  deleteLabOrderHandler as DELETE,
};
