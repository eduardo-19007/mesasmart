import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

try {
  process.loadEnvFile(resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env.local"));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL no está configurada.");
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrations = ["database/schema.sql", "database/002_operational_fields_and_seed.sql", "database/003_staff_authentication.sql", "database/004_staff_audit.sql", "database/005_product_audit.sql", "database/006_review_integrity.sql", "database/007_table_audit.sql"];
const sql = postgres(databaseUrl, { max: 1 });

try {
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  for (const name of migrations) {
    const [applied] = await sql`select name from schema_migrations where name = ${name}`;
    if (applied) {
      console.log(`Omitida: ${name}`);
      continue;
    }
    const source = await readFile(resolve(root, name), "utf8");
    await sql.begin(async (transaction) => {
      await transaction.unsafe(source);
      await transaction`insert into schema_migrations (name) values (${name})`;
    });
    console.log(`Aplicada: ${name}`);
  }
} finally {
  await sql.end();
}
