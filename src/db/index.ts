import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/env";

const globalForDb = globalThis as unknown as {
  cendoPgClient?: ReturnType<typeof postgres>;
};

// Supavisor Transaction Pooler (puerto 6543) no soporta sentencias preparadas ni pipelining
// de múltiples consultas por conexión (postgres v4 usa max_pipeline=100 por defecto y bloquea en ClientRead).
const client =
  globalForDb.cendoPgClient ??
  postgres(env.DATABASE_URL, {
    prepare: false,
    max_pipeline: 1,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 15,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.cendoPgClient = client;
}

export const db = drizzle(client, { schema });
