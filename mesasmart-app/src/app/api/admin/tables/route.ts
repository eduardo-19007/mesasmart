import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, readJson } from "@/lib/api";
import { getDatabase } from "@/lib/server-db";
import { getStaffSession } from "@/lib/staff-auth";
import { tableCodeRegex } from "@/lib/table-code";

const createSchema = z.object({
  code: z.string().trim().toUpperCase().regex(tableCodeRegex, "Use una mesa entre M01 y M99"),
  capacity: z.number().int().min(1).max(30),
});

export async function GET() {
  try {
    const actor = await getStaffSession();
    if (actor?.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const rows = await getDatabase()`select id, code, capacity, active from dining_tables where restaurant_id = ${actor.restaurantId} order by code`;
    return NextResponse.json({ data: rows });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await getStaffSession();
    if (actor?.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const parsed = createSchema.safeParse(await readJson(request));
    if (!parsed.success) return NextResponse.json({ error: "Datos de mesa inválidos", details: parsed.error.flatten() }, { status: 400 });
    const created = await getDatabase().begin(async tx => {
      const [row] = await tx`insert into dining_tables (restaurant_id, code, capacity, qr_token_hash)
        values (${actor.restaurantId}, ${parsed.data.code}, ${parsed.data.capacity}, ${randomBytes(32).toString("hex")})
        returning id, code, capacity, active`;
      await tx`insert into table_audit_events (restaurant_id, actor_user_id, table_id, action, metadata)
        values (${actor.restaurantId}, ${actor.userId}, ${row.id}, 'TABLE_CREATED', ${tx.json({ code: row.code, capacity: row.capacity })})`;
      return row;
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return NextResponse.json({ error: "El código de mesa ya existe" }, { status: 409 });
    return apiError(error);
  }
}
