import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "@/env";

async function runMigrations() {
  const migrationClient = postgres(env.DATABASE_URL, {
    prepare: false,
    max: 1,
  });

  try {
    const db = drizzle(migrationClient);
    await migrate(db, { migrationsFolder: "./src/db/migrations" });

    // Defensa en profundidad: garantizar RLS habilitado en todas las tablas de public
    await migrationClient.unsafe(`
      DO $$
      DECLARE
        t RECORD;
      BEGIN
        FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
          EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
        END LOOP;
      END $$;
    `);

    const rlsCount = await migrationClient.unsafe(
      "SELECT count(*)::int AS cnt FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true"
    );

    console.log(
      `Migraciones Drizzle aplicadas correctamente. Tablas public con RLS activo: ${rlsCount[0]?.cnt ?? 0}.`
    );
  } finally {
    await migrationClient.end();
  }
}

runMigrations().catch((err) => {
  console.error("Error ejecutando migraciones Drizzle:", err);
  process.exit(1);
});
