import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/server-db";
import { getStaffSession, hashPassword } from "@/lib/staff-auth";
import { apiError, readJson } from "@/lib/api";

const createSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, "Use entre 3 y 30 letras, números, punto, guion o guion bajo"),
  password: z.string().min(12).max(128),
  role: z.enum(["ADMIN", "KITCHEN", "WAITER"]),
});

async function adminSession() {
  const session = await getStaffSession();
  return session?.role === "ADMIN" ? session : null;
}

async function getStaff() {
  const actor = await adminSession();
  if (!actor) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const sql = getDatabase();
  const users = await sql`select id, username, role, active, last_login_at as "lastLoginAt" from restaurant_users where restaurant_id = ${actor.restaurantId} and username is not null order by active desc, username`;
  return NextResponse.json({ data: users });
}

async function createStaff(request: Request) {
  const actor = await adminSession();
  if (!actor) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = createSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Datos del usuario inválidos", details: parsed.error.flatten() }, { status: 400 });
  const sql = getDatabase();
  try {
    const user = await sql.begin(async (tx) => {
      const [restaurant] = await tx`select restaurant_id from restaurant_users where id = ${actor.userId}`;
      const salt = randomBytes(16).toString("base64url");
      const [created] = await tx`insert into restaurant_users (restaurant_id, auth_user_id, username, password_hash, role, active) values (${restaurant.restaurant_id}, ${randomUUID()}, ${parsed.data.username}, ${hashPassword(parsed.data.password, salt)}, ${parsed.data.role}::user_role, true) returning id, username, role, active, last_login_at as "lastLoginAt"`;
      await tx`insert into staff_audit_events (restaurant_id, actor_user_id, target_user_id, action, metadata) values (${restaurant.restaurant_id}, ${actor.userId}, ${created.id}, 'STAFF_CREATED', ${tx.json({ role: parsed.data.role })})`;
      return created;
    });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return NextResponse.json({ error: "El nombre de usuario ya existe" }, { status: 409 });
    throw error;
  }
}

export async function GET() { try { return await getStaff(); } catch (error) { return apiError(error); } }
export async function POST(request: Request) { try { return await createStaff(request); } catch (error) { return apiError(error); } }
