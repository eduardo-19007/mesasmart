import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, apiError, readJson } from "@/lib/api";
import { getDatabase } from "@/lib/server-db";
import { getStaffSession, hashPassword, setStaffSession, verifyPassword } from "@/lib/staff-auth";

const schema = z.object({ currentPassword: z.string().min(8).max(128), newPassword: z.string().min(12).max(128) })
  .refine(value => value.currentPassword !== value.newPassword, { message: "La nueva contraseña debe ser diferente" });

export async function POST(request: Request) {
  try {
    const actor = await getStaffSession();
    if (!actor) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Contraseña inválida" }, { status: 400 });
    const sql = getDatabase();
    const passwordHash = hashPassword(parsed.data.newPassword, randomBytes(16).toString("base64url"));
    const updated = await sql.begin(async tx => {
      const [current] = await tx`select password_hash, session_version from restaurant_users
        where id = ${actor.userId} and restaurant_id = ${actor.restaurantId} and active = true for update`;
      if (!current || current.session_version !== actor.version) throw new ApiError(401, "La sesión ha cambiado; vuelva a ingresar");
      if (!verifyPassword(parsed.data.currentPassword, current.password_hash)) throw new ApiError(403, "La contraseña actual no es correcta");
      const [row] = await tx`update restaurant_users set password_hash = ${passwordHash} where id = ${actor.userId} returning session_version`;
      await tx`insert into staff_audit_events (restaurant_id, actor_user_id, target_user_id, action, metadata)
        values (${actor.restaurantId}, ${actor.userId}, ${actor.userId}, 'PASSWORD_CHANGED', '{}')`;
      return row;
    });
    await setStaffSession({ ...actor, version: updated.session_version });
    return NextResponse.json({ data: { changed: true } });
  } catch (error) { return apiError(error); }
}
