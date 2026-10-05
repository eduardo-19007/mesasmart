import { mkdir, writeFile } from 'node:fs/promises';
import postgres from 'postgres';

process.loadEnvFile('.env.local');
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const rows = await sql`select o.created_at, o.estimated_minutes as baseline_minutes,
    sum(oi.quantity)::integer as quantity,
    extract(epoch from (o.ready_at-o.confirmed_at))/60 as actual_minutes
    from orders o join restaurants r on r.id=o.restaurant_id
    join order_items oi on oi.order_id=o.id
    where r.slug=${process.env.RESTAURANT_SLUG ?? 'miraflores'}
    and o.status in ('READY','DELIVERED','CLOSED') and o.ready_at > o.confirmed_at
    group by o.id order by o.created_at`;
  await mkdir('ml/data', { recursive: true });
  const csv = ['created_at,baseline_minutes,quantity,actual_minutes', ...rows.map(row =>
    [new Date(row.created_at).toISOString(), row.baseline_minutes, row.quantity, Number(row.actual_minutes)].join(','))].join('\n');
  await writeFile('ml/data/observed.csv', csv + '\n');
  console.log(JSON.stringify({ exported: rows.length, path: 'ml/data/observed.csv', warning: 'Revisar procedencia: la base local puede contener ensayos, no equivale al piloto.' }));
} finally { await sql.end(); }
