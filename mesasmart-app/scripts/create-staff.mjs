import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

try { process.loadEnvFile(resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env.local")); } catch (error) { if (error?.code !== "ENOENT") throw error; }
const [username, role = "ADMIN"] = process.argv.slice(2);
const password = process.env.STAFF_PASSWORD;
if (!process.env.DATABASE_URL || !username || !password || password.length < 12 || !["ADMIN", "KITCHEN", "WAITER"].includes(role)) {
  console.error("Uso: $env:STAFF_PASSWORD='clave-de-12-caracteres'; node scripts/create-staff.mjs usuario ADMIN|KITCHEN|WAITER");
  process.exit(1);
}
const salt = randomBytes(16).toString("base64url");
const passwordHash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("base64url")}`;
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const [restaurant] = await sql`select id from restaurants where slug=${process.env.RESTAURANT_SLUG ?? 'miraflores'}`;
  if (!restaurant) throw new Error("No existe un restaurante. Ejecute primero las migraciones.");
  await sql.begin(async tx => {
    const [user] = await tx`insert into restaurant_users (restaurant_id, auth_user_id, username, password_hash, role, active) values (${restaurant.id}, ${randomUUID()}, ${username}, ${passwordHash}, ${role}::user_role, true) on conflict (lower(username)) where username is not null do update set password_hash = excluded.password_hash, role = excluded.role, active = true where restaurant_users.restaurant_id = excluded.restaurant_id returning id`;
    if (!user) throw new Error('El usuario pertenece a otro restaurante; no se modificó.');
    await tx`insert into staff_audit_events (restaurant_id,target_user_id,action,metadata) values (${restaurant.id},${user.id},'STAFF_PROVISIONED','{"source":"CLI"}')`;
  });
  console.log(`Usuario ${username} creado o actualizado con rol ${role}.`);
} finally { await sql.end(); }
