import "server-only";
import { createHash } from "node:crypto";
import { type Sql } from "postgres";
import { demoOrderRepository, type Order, type OrderStatus } from "./orders";
import { canTransition } from "./order-rules";
import { getDatabase } from "./server-db";
import { restaurantId } from "./server-config";
import { isDemoMode } from "./table-access";
import { ApiError } from "./api";
import { menu } from "./data";

type Input = { table: string; sessionId: string; idempotencyKey: string; expectedTotalCents: number; note?: string; items: Array<{ productId: string; quantity: number; expectedUnitPriceCents?: number }> };
type ListOptions = { states?: OrderStatus[]; limit?: number; offset?: number };
type DbStatus = "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CLOSED" | "CANCELLED" | "REJECTED";
const db: Record<OrderStatus, DbStatus> = { Confirmado: "CONFIRMED", "En preparación": "PREPARING", Listo: "READY", Entregado: "DELIVERED", Cerrado: "CLOSED", Cancelado: "CANCELLED", Rechazado: "REJECTED" };
const labels = Object.fromEntries(Object.entries(db).map(([a, b]) => [b, a])) as Record<DbStatus, OrderStatus>;
type Row = { id: string; table: string; status: DbStatus; estimate: number; note: string | null; created_at: Date; ready_at: Date | null; session_id: string; total: number; status_reason: string | null; items: Order["items"]; history: Array<{ status: DbStatus; occurredAt: string; reason?: string }> };

class PostgresOrderRepository {
  constructor(private sql: Sql) {}

  private async read(id?: string, options: ListOptions = {}) {
    const tenant = await restaurantId();
    const rows = await this.sql<Row[]>`
      select o.public_code as id, dt.code as table, o.status, o.estimated_minutes as estimate,
        o.notes as note, o.created_at, o.ready_at, ts.id as session_id,
        (o.subtotal_cents::numeric / 100) as total,
        (select coalesce(json_agg(json_build_object('status', e.to_status, 'occurredAt', e.occurred_at, 'reason', e.metadata->>'reason') order by e.occurred_at, e.id), '[]') from order_events e where e.order_id=o.id) as history,
        (select e.metadata->>'reason' from order_events e where e.order_id = o.id and e.to_status in ('CANCELLED', 'REJECTED') order by e.occurred_at desc limit 1) as status_reason,
        coalesce(json_agg(json_build_object('productId', p.slug, 'name', oi.product_name,
          'quantity', oi.quantity, 'unitPrice', oi.unit_price_cents::numeric / 100)
          order by oi.id) filter (where oi.id is not null), '[]') as items
      from orders o join table_sessions ts on ts.id = o.table_session_id
      join dining_tables dt on dt.id = ts.table_id
      left join order_items oi on oi.order_id = o.id left join products p on p.id = oi.product_id
      where o.restaurant_id = ${tenant} ${id ? this.sql`and o.public_code = ${id}` : this.sql``}
      ${options.states?.length ? this.sql`and o.status::text in ${this.sql(options.states.map(s => db[s]))}` : this.sql``}
      group by o.id, dt.code, ts.id order by o.created_at desc, o.id
      limit ${id ? 1 : options.limit ?? 100} offset ${options.offset ?? 0}`;
    return rows.map(row => ({
      id: row.id, table: row.table, status: labels[row.status],
      elapsed: Math.max(0, Math.floor(((row.ready_at ? new Date(row.ready_at).getTime() : Date.now()) - new Date(row.created_at).getTime()) / 60000)),
      estimate: row.estimate, note: row.note ?? undefined, createdAt: new Date(row.created_at).toISOString(),
      readyAt: row.ready_at ? new Date(row.ready_at).toISOString() : undefined,
      sessionId: row.session_id, total: Number(row.total), statusReason: row.status_reason ?? undefined, items: row.items,
      history: row.history.map(event => ({ ...event, status: labels[event.status] })),
    } satisfies Order));
  }
  list(options: ListOptions = {}) { return this.read(undefined, options); }
  async find(id: string) { return (await this.read(id))[0]; }

  async create(input: Input) {
    const tenant = await restaurantId();
    const fingerprint = createHash("sha256").update(JSON.stringify({
      table: input.table, session: input.sessionId, note: input.note ?? "",
      items: input.items.map(({ productId, quantity }) => ({ productId, quantity })).sort((a, b) => a.productId.localeCompare(b.productId)),
    })).digest("hex");
    const code = await this.sql.begin(async tx => {
      // Serialize replays before checking the unique key, including concurrent requests.
      await tx`select pg_advisory_xact_lock(hashtextextended(${tenant + input.idempotencyKey}, 0))`;
      const [previous] = await tx`select public_code, request_hash from orders where restaurant_id = ${tenant} and idempotency_key = ${input.idempotencyKey}`;
      if (previous) {
        if (previous.request_hash !== fingerprint) throw new ApiError(409, "La clave de reintento corresponde a otro pedido");
        return previous.public_code as string;
      }
      const [session] = await tx`select ts.id from table_sessions ts join dining_tables dt on dt.id = ts.table_id
        where ts.id = ${input.sessionId} and dt.restaurant_id = ${tenant} and dt.code = ${input.table}
        and dt.active = true and ts.closed_at is null and ts.expires_at > now() for share of ts, dt`;
      if (!session) throw new ApiError(401, "La sesión de mesa ha vencido");
      const products = await tx<Array<{ id: string; slug: string; name: string; price_cents: number; base_minutes: number }>>`
        select id, slug, name, price_cents, base_minutes from products
        where restaurant_id = ${tenant} and slug in ${tx(input.items.map(item => item.productId))} and available = true for share`;
      if (products.length !== input.items.length) throw new ApiError(409, "Uno o más productos ya no están disponibles", "PRODUCT_UNAVAILABLE");
      const subtotal = input.items.reduce((sum, item) => sum + products.find(p => p.slug === item.productId)!.price_cents * item.quantity, 0);
      const changed = input.items.filter(item => item.expectedUnitPriceCents !== products.find(p => p.slug === item.productId)!.price_cents);
      if (subtotal !== input.expectedTotalCents || changed.length) throw new ApiError(409, "Revise los precios actualizados y confirme nuevamente.", "PRICE_CHANGED", { currentTotalCents: subtotal, changes: changed.map(item => { const p = products.find(p => p.slug === item.productId)!; return { productId: p.slug, name: p.name, previousCents: item.expectedUnitPriceCents, currentCents: p.price_cents }; }) });
      const estimate = Math.max(...products.map(p => p.base_minutes));
      const [order] = await tx`insert into orders
        (restaurant_id, table_session_id, status, notes, subtotal_cents, estimated_minutes, idempotency_key, request_hash, confirmed_at)
        values (${tenant}, ${session.id}, 'CONFIRMED', ${input.note ?? null}, ${subtotal}, ${estimate}, ${input.idempotencyKey}, ${fingerprint}, now()) returning id, public_code`;
      for (const item of input.items) {
        const p = products.find(p => p.slug === item.productId)!;
        await tx`insert into order_items (order_id, product_id, product_name, unit_price_cents, quantity)
          values (${order.id}, ${p.id}, ${p.name}, ${p.price_cents}, ${item.quantity})`;
      }
      await tx`insert into order_events (order_id, to_status, metadata) values (${order.id}, 'CONFIRMED', '{"source":"TABLE_QR"}')`;
      return order.public_code as string;
    });
    return (await this.find(code))!;
  }

  async updateStatus(id: string, status: OrderStatus, actor?: string, reason?: string) {
    const tenant = await restaurantId();
    const found = await this.sql.begin(async tx => {
      const [current] = await tx`select id, status from orders where public_code = ${id} and restaurant_id = ${tenant} for update`;
      if (!current) return false;
      if (!canTransition(labels[current.status as DbStatus], status)) throw new ApiError(409, "El estado cambió o la transición no está permitida");
      await tx`update orders set status = ${db[status]}::order_status,
        preparing_at = case when ${db[status]} = 'PREPARING' then now() else preparing_at end,
        ready_at = case when ${db[status]} = 'READY' then now() else ready_at end,
        delivered_at = case when ${db[status]} = 'DELIVERED' then now() else delivered_at end,
        closed_at = case when ${db[status]} = 'CLOSED' then now() else closed_at end where id = ${current.id}`;
      await tx`insert into order_events (order_id, from_status, to_status, actor_user_id, metadata)
        values (${current.id}, ${current.status}::order_status, ${db[status]}::order_status, ${actor ?? null}, ${tx.json({ reason: reason ?? null })})`;
      return true;
    });
    return found ? this.find(id) : undefined;
  }
}

const replays = new Map<string, { fingerprint: string; order: Order }>();
const demo = {
  list: (options: ListOptions = {}) => demoOrderRepository.list().filter(o => !options.states || options.states.includes(o.status)).slice(options.offset ?? 0, (options.offset ?? 0) + (options.limit ?? 100)),
  find: (id: string) => demoOrderRepository.find(id),
  create(input: Input) {
    const fingerprint = JSON.stringify(input);
    const prior = replays.get(input.idempotencyKey);
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw new ApiError(409, "Clave de reintento ya utilizada");
      return prior.order;
    }
    const products = input.items.map(item => menu.find(p => p.id === item.productId && p.available));
    if (products.some(p => !p)) throw new ApiError(409, "Producto no disponible", "PRODUCT_UNAVAILABLE");
    const subtotal = input.items.reduce((sum, item, i) => sum + Math.round(products[i]!.price * 100) * item.quantity, 0);
    if (subtotal !== input.expectedTotalCents || input.items.some((item, i) => item.expectedUnitPriceCents !== Math.round(products[i]!.price * 100))) throw new ApiError(409, "Confirme los precios de la carta", "PRICE_CHANGED", { currentTotalCents: subtotal });
    const order = demoOrderRepository.create(input);
    order.sessionId = "demo";
    order.history = [{ status: "Confirmado", occurredAt: order.createdAt }];
    replays.set(input.idempotencyKey, { fingerprint, order });
    return order;
  },
  updateStatus(id: string, status: OrderStatus, _actor?: string, _reason?: string) {
    void _actor; void _reason;
    const order = demoOrderRepository.find(id);
    if (!order) return undefined;
    if (!canTransition(order.status, status)) throw new ApiError(409, "Transición no permitida");
    order.status = status;
    order.history ??= [];
    order.history.push({ status, occurredAt: new Date().toISOString(), reason: _reason });
    order.statusReason = _reason;
    if (status === "Listo") order.readyAt = new Date().toISOString();
    return order;
  },
};

export function getOrderRepository() {
  return isDemoMode() ? demo : new PostgresOrderRepository(getDatabase());
}
