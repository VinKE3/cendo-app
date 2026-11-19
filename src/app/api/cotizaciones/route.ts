import { deleteQuoteHandler } from "@/features/cotizaciones/api/delete";
import { getQuotesHandler } from "@/features/cotizaciones/api/get";
import { patchQuoteHandler } from "@/features/cotizaciones/api/patch";
import { postQuoteHandler } from "@/features/cotizaciones/api/post";

export {
  getQuotesHandler as GET,
  postQuoteHandler as POST,
  patchQuoteHandler as PATCH,
  deleteQuoteHandler as DELETE,
};
