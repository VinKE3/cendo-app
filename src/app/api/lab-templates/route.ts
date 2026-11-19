import { deleteLabTemplateHandler } from "@/features/laboratorio/api/templates-delete";
import { getLabTemplatesHandler } from "@/features/laboratorio/api/templates-get";
import { patchLabTemplateHandler } from "@/features/laboratorio/api/templates-patch";
import { postLabTemplateHandler } from "@/features/laboratorio/api/templates-post";

export {
  getLabTemplatesHandler as GET,
  postLabTemplateHandler as POST,
  patchLabTemplateHandler as PATCH,
  deleteLabTemplateHandler as DELETE,
};
