import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

try {
  process.loadEnvFile(resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env.local"));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL no está configurada.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const [result] = await sql`
    select
      (select count(*)::int from restaurants) as restaurantes,
      (select count(*)::int from dining_tables) as mesas,
      (select count(*)::int from products) as productos,
      (select count(*)::int from schema_migrations) as migraciones`;
  console.log(JSON.stringify(result, null, 2));
} finally {
  await sql.end();
}
