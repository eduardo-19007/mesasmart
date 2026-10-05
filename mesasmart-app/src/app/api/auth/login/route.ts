import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, setStaffSession } from "@/lib/staff-auth";
import { getDatabase } from "@/lib/server-db";
import { apiError, readJson } from "@/lib/api";

const schema = z.object({ username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/), password: z.string().min(8).max(128) });
export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) return NextResponse.json({ error: "Ingrese usuario y contraseña válidos" }, { status: 400 });
    const sql = getDatabase();
    const [attempt] = await sql`insert into auth_attempts (username, attempts) values (${parsed.data.username}, 1)
      on conflict (username) do update set
        attempts = case when auth_attempts.window_started < now() - interval '15 minutes' then 1 else auth_attempts.attempts + 1 end,
        window_started = case when auth_attempts.window_started < now() - interval '15 minutes' then now() else auth_attempts.window_started end
      returning attempts`;
    if (attempt.attempts > 10) return NextResponse.json({ error: "Demasiados intentos. Intente en 15 minutos." }, { status: 429, headers: { "Retry-After": "900" } });
    const session = await authenticate(parsed.data.username, parsed.data.password);
    if (!session) return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    await sql`delete from auth_attempts where username = ${parsed.data.username}`;
    await sql`insert into staff_audit_events (restaurant_id,actor_user_id,target_user_id,action) values (${session.restaurantId},${session.userId},${session.userId},'LOGIN_SUCCEEDED')`;
    await setStaffSession(session);
    return NextResponse.json({ data: { username: session.username, role: session.role } });
  } catch (error) { return apiError(error); }
}
