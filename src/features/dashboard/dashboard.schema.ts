import { z } from "zod";

export const globalSearchSchema = z
  .object({
    query: z.string().trim().max(120).default(""),
  })
  .strict();

export type GlobalSearchInput = z.infer<typeof globalSearchSchema>;
