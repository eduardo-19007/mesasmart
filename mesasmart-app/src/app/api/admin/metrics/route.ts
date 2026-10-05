import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/staff-auth";
import { getDatabase } from "@/lib/server-db";
import { restaurantId } from "@/lib/server-config";
import { apiError, ApiError } from "@/lib/api";
const day = (date: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
export async function GET(request: Request) {
  try {
    if (!await isAuthorized(["ADMIN"])) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const from = params.get("from") || day(new Date());
    const to = params.get("to") || day(new Date());
    const valid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
    if (!valid(from) || !valid(to) || from > to || Date.parse(to) - Date.parse(from) > 366 * 86400000) throw new ApiError(400, "Use un rango válido de hasta 366 días");
    const tenant = await restaurantId();
    const sql = getDatabase();
    const [summary] = await sql`select count(*)::integer as orders,
      count(*) filter (where status='CLOSED')::integer as completed,
      round((percentile_cont(0.5) within group (order by extract(epoch from (ready_at-created_at))/60) filter (where ready_at is not null))::numeric,1) as median
      from orders where restaurant_id=${tenant}
      and created_at >= (${from}::date::timestamp at time zone 'America/Lima')
      and created_at < ((${to}::date+1)::timestamp at time zone 'America/Lima')`;
    const [active] = await sql`select count(*)::integer as count,
      count(*) filter (where now()-created_at > estimated_minutes * interval '1 minute')::integer as delayed
      from orders where restaurant_id=${tenant} and status in ('CONFIRMED','PREPARING')`;
    const hours = await sql`select extract(hour from created_at at time zone 'America/Lima')::integer as hour, count(*)::integer as count
      from orders where restaurant_id=${tenant}
      and created_at >= (${from}::date::timestamp at time zone 'America/Lima')
      and created_at < ((${to}::date+1)::timestamp at time zone 'America/Lima') group by 1`;
    const [products] = await sql`select count(*)::integer as count from products where restaurant_id=${tenant} and available=true`;
    const hourlyOrders = Array.from({ length: 24 }, (_, hour) => ({ hour, count: Number(hours.find(h => h.hour === hour)?.count ?? 0) }));
    return NextResponse.json({ data: {
      ordersToday: summary.orders, medianMinutes: summary.median === null ? null : Number(summary.median),
      completedOrders: summary.completed,
      activeOrders: active.count, delayedOrders: active.delayed,
      availableProducts: products.count, hourlyOrders, from, to,
    } });
  } catch (error) { return apiError(error); }
}
