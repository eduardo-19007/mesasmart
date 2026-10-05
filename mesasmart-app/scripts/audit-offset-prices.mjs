import { randomUUID, randomBytes, createHmac, createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import postgres from 'postgres';
import assert from 'node:assert/strict';

try { process.loadEnvFile('.env.local'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const ids = [];
const prefix = 'audit_' + randomBytes(5).toString('hex');
let table;
let evidence;
try {
  const [restaurant] = await sql`select id from restaurants where slug=${process.env.RESTAURANT_SLUG ?? 'miraflores'}`;
  for (let n = 59; n >= 50 && !table; n--) {
    [table] = await sql`insert into dining_tables (restaurant_id,code,capacity,qr_token_hash)
      values (${restaurant.id},${'M'+n},4,'audit') on conflict (restaurant_id,code) do nothing returning id,code`;
  }
  if (!table) throw new Error('No free audit table');
  for (const [i, price] of [1000, 2000].entries()) {
    const [p] = await sql`insert into products (restaurant_id,slug,name,category,price_cents,base_minutes)
      values (${restaurant.id},${prefix+i},'Audit price','Bebidas',${price},5) returning id,slug`;
    ids.push(p);
  }
  const expiry = Date.now()+600000;
  const payload = `${table.code}.${expiry}.${randomBytes(8).toString('hex')}`;
  const token = payload+'.'+createHmac('sha256',process.env.QR_SIGNING_SECRET).update(payload).digest('base64url');
  await sql`insert into table_sessions (table_id,token_hash,expires_at)
    values (${table.id},${createHash('sha256').update(token).digest('hex')},${new Date(expiry)})`;
  await sql`update products set price_cents=1100 where id=${ids[0].id}`;
  await sql`update products set price_cents=1900 where id=${ids[1].id}`;
  const base = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
  const response = await fetch(base + '/api/orders', {
    method:'POST', headers:{'Content-Type':'application/json','X-Table-Token':token},
    body:JSON.stringify({table:table.code,idempotencyKey:randomUUID(),expectedTotalCents:3000,
      items:ids.map((p,i)=>({productId:p.slug,quantity:1,expectedUnitPriceCents:[1000,2000][i]}))}),
  });
  const result = await response.json();
  assert.equal(response.status,409);
  assert.equal(result.code,'PRICE_CHANGED');
  const checks = ['Precios compensados requieren confirmación'];
  const send = async (prices, access = token, key = randomUUID()) => {
    const r = await fetch(base + '/api/orders', { method: 'POST', headers: { 'Content-Type':'application/json', 'X-Table-Token':access },
      body: JSON.stringify({ table:table.code,idempotencyKey:key,expectedTotalCents:prices.reduce((a,b)=>a+b,0),items:ids.map((p,i)=>({productId:p.slug,quantity:1,expectedUnitPriceCents:prices[i]})) }) });
    return { status:r.status, body:await r.json() };
  };
  await sql`update products set price_cents=1200 where id=${ids[0].id}`;
  assert.equal((await send([1100,1900])).status,409);
  checks.push('Segundo cambio antes de reconfirmar bloqueado');
  const key = randomUUID();
  const created = await send([1200,1900], token, key);
  assert.equal(created.status,201);
  assert.equal(created.body.data.history[0].status,'Confirmado');
  assert.ok(created.body.data.history[0].occurredAt);
  assert.equal((await send([1200,1900], token, key)).body.data.id,created.body.data.id);
  checks.push('Reconfirmación, replay único e historial con hora');
  const pastExpiry = Date.now()-60000;
  const pastPayload = `${table.code}.${pastExpiry}.${randomBytes(8).toString('hex')}`;
  const expired = pastPayload+'.'+createHmac('sha256',process.env.QR_SIGNING_SECRET).update(pastPayload).digest('base64url');
  await sql`update table_sessions set token_hash=${createHash('sha256').update(expired).digest('hex')},opened_at=${new Date(pastExpiry-60000)},expires_at=${new Date(pastExpiry)} where table_id=${table.id}`;
  const detail = () => fetch(base+'/api/orders/'+created.body.data.id,{headers:{'X-Table-Token':expired}});
  assert.equal((await detail()).status,200);
  assert.equal((await send([1200,1900],expired)).status,401);
  const reopened = await fetch(base+'/mesa/'+table.code+'?token='+encodeURIComponent(expired));
  assert.ok((await reopened.text()).includes('Acceso de seguimiento'));
  checks.push('QR vencido: lectura activa y reapertura, sin nuevos pedidos');
  await sql`update orders set status='CLOSED',closed_at=now() where public_code=${created.body.data.id}`;
  assert.equal((await detail()).status,200);
  await sql`update orders set closed_at=now()-interval '25 hours' where public_code=${created.body.data.id}`;
  assert.equal((await detail()).status,403);
  checks.push('Ventana de lectura de 24 horas al cerrar');
  evidence = {date:new Date().toISOString(), oldUnitCents:[1000,2000], newUnitCents:[1100,1900],
    unchangedTotalCents:3000, httpStatus:response.status,
    recordedUnitPrices:result.data?.items.map(i=>i.unitPrice),
    defectReproduced:response.status===201, expectedForAnyPriceChange:409, checks, status:'PASS'};
} finally {
  try {
    await sql.begin(async tx=>{
      if(table) {
        await tx`delete from order_events where order_id in (select id from orders where table_session_id in (select id from table_sessions where table_id=${table.id}))`;
        await tx`delete from order_items where order_id in (select id from orders where table_session_id in (select id from table_sessions where table_id=${table.id}))`;
        await tx`delete from orders where table_session_id in (select id from table_sessions where table_id=${table.id})`;
        await tx`delete from table_sessions where table_id=${table.id}`;
        await tx`delete from dining_tables where id=${table.id}`;
      }
      for(const p of ids) await tx`delete from products where id=${p.id}`;
    });
  } finally { await sql.end(); }
}
evidence.fixturesRemoved = true;
await writeFile('qa/correction-price-qr-results.json',JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence,null,2));
