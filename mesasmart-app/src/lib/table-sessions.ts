import "server-only";
import { createHash } from "node:crypto";
import { getDatabase } from "./server-db";
import { restaurantId } from "./server-config";
import { createTableToken, isDemoMode, verifyTableToken } from "./table-access";
import { ApiError } from "./api";
import { tableCodeRegex } from "./table-code";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export async function openTableSession(table: string, lifetime: number) {
  if (!tableCodeRegex.test(table)) throw new ApiError(400, "Mesa inválida");
  const access = createTableToken(table, lifetime);
  if (isDemoMode()) return access;
  const tenant = await restaurantId();
  await getDatabase().begin(async tx => {
    const [row] = await tx`select id from dining_tables where restaurant_id = ${tenant} and code = ${table} and active = true for update`;
    if (!row) throw new ApiError(404, "Mesa no disponible");
    await tx`update table_sessions set closed_at = now() where table_id = ${row.id} and closed_at is null`;
    await tx`insert into table_sessions (table_id, token_hash, expires_at) values (${row.id}, ${digest(access.token)}, ${new Date(access.expiresAt)})`;
  });
  return access;
}

export async function validTableSession(token: string | undefined, table: string, allowClosed = false) {
  if (isDemoMode()) return /^M(0[1-9]|1[0-2])$/.test(table) ? { id: "demo", table } : null;
  if (!token || !verifyTableToken(token, table, allowClosed)) return null;
  const tenant = await restaurantId();
  const [row] = await getDatabase()`select ts.id, (ts.closed_at is not null or ts.expires_at <= now()) as read_only from table_sessions ts join dining_tables dt on dt.id = ts.table_id
    where ts.token_hash = ${digest(token)} and dt.code = ${table} and dt.restaurant_id = ${tenant}
    and dt.active = true and (${allowClosed} or ts.closed_at is null)
    and (ts.expires_at > now() or (${allowClosed} and exists (select 1 from orders o where o.table_session_id=ts.id
      and (o.status in ('CONFIRMED','PREPARING','READY','DELIVERED') or coalesce(o.closed_at, (select max(e.occurred_at) from order_events e where e.order_id=o.id)) > now()-interval '24 hours'))))`;
  return row ? { id: row.id as string, table, closed: Boolean(row.read_only) } : null;
}

export async function validOrderTableSession(token: string | undefined, table: string, sessionId: string) {
  if (isDemoMode()) return /^M(0[1-9]|1[0-2])$/.test(table);
  if (!token || !verifyTableToken(token, table, true)) return false;
  const tenant = await restaurantId();
  const [row] = await getDatabase()`select ts.id from table_sessions ts join dining_tables dt on dt.id = ts.table_id
    where ts.id = ${sessionId} and ts.token_hash = ${digest(token)} and dt.code = ${table}
    and dt.restaurant_id = ${tenant} and dt.active = true
    and (ts.expires_at > now() or exists (select 1 from orders o where o.table_session_id=ts.id
      and (o.status in ('CONFIRMED','PREPARING','READY','DELIVERED') or coalesce(o.closed_at, (select max(e.occurred_at) from order_events e where e.order_id=o.id)) > now()-interval '24 hours')))`;
  return Boolean(row);
}
