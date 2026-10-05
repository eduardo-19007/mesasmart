import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, readJson } from "@/lib/api";
import { getDatabase } from "@/lib/server-db";
import { getStaffSession } from "@/lib/staff-auth";

const schema = z.object({ capacity: z.number().int().min(1).max(30).optional(), active: z.boolean().optional() }).refine(value => Object.keys(value).length > 0);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getStaffSession();
    if (actor?.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) return NextResponse.json({ error: "Modificación de mesa inválida" }, { status: 400 });
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });
    const updated = await getDatabase().begin(async tx => {
      const [current] = await tx`select id, code, capacity, active from dining_tables where id = ${id} and restaurant_id = ${actor.restaurantId} for update`;
      if (!current) return null;
      if (parsed.data.active === false) {
        const [activeOrder] = await tx`select o.id from orders o join table_sessions ts on ts.id = o.table_session_id
          where ts.table_id = ${current.id} and o.status not in ('CLOSED', 'CANCELLED', 'REJECTED') limit 1`;
        if (activeOrder) return "ACTIVE_ORDER";
        await tx`update table_sessions set closed_at = now() where table_id = ${current.id} and closed_at is null`;
      }
      const [row] = await tx`update dining_tables set capacity = coalesce(${parsed.data.capacity ?? null}, capacity), active = coalesce(${parsed.data.active ?? null}, active)
        where id = ${current.id} returning id, code, capacity, active`;
      await tx`insert into table_audit_events (restaurant_id, actor_user_id, table_id, action, metadata)
        values (${actor.restaurantId}, ${actor.userId}, ${current.id}, 'TABLE_UPDATED', ${tx.json({ before: { capacity: current.capacity, active: current.active }, changes: parsed.data })})`;
      return row;
    });
    if (updated === "ACTIVE_ORDER") return NextResponse.json({ error: "No se puede desactivar una mesa con pedidos activos" }, { status: 409 });
    return updated ? NextResponse.json({ data: updated }) : NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
  } catch (error) { return apiError(error); }
}
