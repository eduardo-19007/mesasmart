import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/server-db";
import { getStaffSession, hashPassword } from "@/lib/staff-auth";

const updateSchema = z.object({ role: z.enum(["ADMIN", "KITCHEN", "WAITER"]).optional(), active: z.boolean().optional(), password: z.string().min(12).max(128).optional() }).refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getStaffSession();
  if (actor?.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Modificación inválida" }, { status: 400 });
  if (id === actor.userId && (parsed.data.active === false || (parsed.data.role && parsed.data.role !== "ADMIN"))) return NextResponse.json({ error: "No puede desactivar ni degradar su propia cuenta" }, { status: 409 });
  const sql = getDatabase();
  const result = await sql.begin(async (tx) => {
    const [current] = await tx`select id, restaurant_id, username, role, active from restaurant_users where id = ${id} and restaurant_id = ${actor.restaurantId} and username is not null`;
    if (!current) return null;
    const passwordHash = parsed.data.password ? hashPassword(parsed.data.password, randomBytes(16).toString("base64url")) : null;
    const [updated] = await tx`update restaurant_users set role = coalesce(${parsed.data.role ?? null}::user_role, role), active = coalesce(${parsed.data.active ?? null}, active), password_hash = coalesce(${passwordHash}, password_hash) where id = ${id} returning id, username, role, active, last_login_at as "lastLoginAt"`;
    await tx`insert into staff_audit_events (restaurant_id, actor_user_id, target_user_id, action, metadata) values (${current.restaurant_id}, ${actor.userId}, ${id}, 'STAFF_UPDATED', ${tx.json({ role: parsed.data.role, active: parsed.data.active, passwordReset: Boolean(parsed.data.password) })})`;
    return updated;
  });
  return result ? NextResponse.json({ data: result }) : NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
}
