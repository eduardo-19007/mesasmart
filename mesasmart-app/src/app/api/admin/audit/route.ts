import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getDatabase } from "@/lib/server-db";
import { getStaffSession } from "@/lib/staff-auth";

export async function GET(request: Request) {
  try {
    const actor = await getStaffSession();
    if (actor?.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
    if (!Number.isInteger(page) || page < 1 || page > 100000) return NextResponse.json({ error: "Página inválida" }, { status: 400 });
    const rows = await getDatabase()`
      select * from (
        select 'Personal' as area, sae.action, coalesce(au.username, 'Sistema') as actor,
          coalesce(tu.username, 'Usuario eliminado') as target, sae.metadata, sae.occurred_at as "occurredAt"
        from staff_audit_events sae left join restaurant_users au on au.id = sae.actor_user_id
          left join restaurant_users tu on tu.id = sae.target_user_id where sae.restaurant_id = ${actor.restaurantId}
        union all
        select 'Carta', pae.action, coalesce(au.username, 'Sistema'), coalesce(p.name, 'Producto eliminado'), pae.metadata, pae.occurred_at
        from product_audit_events pae left join restaurant_users au on au.id = pae.actor_user_id
          left join products p on p.id = pae.product_id where pae.restaurant_id = ${actor.restaurantId}
        union all
        select 'Mesas', tae.action, coalesce(au.username, 'Sistema'), coalesce(dt.code, 'Mesa eliminada'), tae.metadata, tae.occurred_at
        from table_audit_events tae left join restaurant_users au on au.id = tae.actor_user_id
          left join dining_tables dt on dt.id = tae.table_id where tae.restaurant_id = ${actor.restaurantId}
        union all
        select 'Pedidos', 'ORDER_' || oe.to_status::text, coalesce(au.username, 'Cliente / sistema'), o.public_code, oe.metadata, oe.occurred_at
        from order_events oe join orders o on o.id=oe.order_id
          left join restaurant_users au on au.id=oe.actor_user_id where o.restaurant_id=${actor.restaurantId}
      ) events order by "occurredAt" desc, area, action, target limit 101 offset ${(page - 1) * 100}`;
    return NextResponse.json({ data: rows.slice(0, 100), page, hasMore: rows.length > 100 });
  } catch (error) { return apiError(error); }
}
