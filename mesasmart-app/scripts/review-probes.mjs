import assert from 'node:assert/strict';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import postgres from 'postgres';

try { process.loadEnvFile('.env.local'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const base = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const prefix = 'review_' + randomBytes(4).toString('hex');
const password = randomBytes(24).toString('base64url');
const salt = randomBytes(16).toString('hex');
const results = [];
let userId;
const tables = [];
let cookie;
async function request(path, method = 'GET', body, token) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { 'X-Table-Token': token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json; try { json = JSON.parse(text); } catch { /* HTML page */ }
  return { status: response.status, json, text, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
try {
  const [tenant] = await sql`select id from restaurants where slug=${process.env.RESTAURANT_SLUG ?? 'miraflores'}`;
  const [user] = await sql`insert into restaurant_users (restaurant_id,auth_user_id,username,password_hash,role)
    values (${tenant.id},${randomUUID()},${prefix},${'scrypt$' + salt + '$' + scryptSync(password,salt,64).toString('base64url')},'ADMIN') returning id`;
  userId = user.id;
  cookie = (await request('/api/auth/login', 'POST', { username: prefix, password })).cookie;
  assert.ok(cookie);
  const adminCookie=cookie;
  const [m00] = await sql`select id from dining_tables where restaurant_id=${tenant.id} and code='M00'`;
  if (!m00) {
    const created = await request('/api/admin/tables','POST',{code:'M00',capacity:4});
    assert.equal(created.status,400);
    results.push({ case: 'M00 rechazada al crear', passed: true });
  } else results.push({ case: 'M00', skipped: 'Ya existe; no modificar datos del usuario' });
  let table;
  for (let n=69;n>=60 && !table;n--) {
    const code='M'+n;
    const [row]=await sql`insert into dining_tables (restaurant_id,code,capacity,qr_token_hash) values (${tenant.id},${code},4,'review') on conflict (restaurant_id,code) do nothing returning id,code`;
    if(row) { table=row; tables.push(row.id); }
  }
  assert.ok(table);
  const qr=await request('/api/table-sessions','POST',{table:table.code});
  const token=new URL(qr.json.data.accessUrl).searchParams.get('token');
  const menu=await request('/api/menu');
  const product=menu.json.data[0];
  assert.ok(product);
  const payload={table:table.code,idempotencyKey:randomUUID(),expectedTotalCents:Math.round(product.price*100),items:[{productId:product.id,quantity:1,expectedUnitPriceCents:Math.round(product.price*100)}]};
  const order=await request('/api/orders','POST',payload,token);
  assert.equal(order.status,201);
  const deactivate=await request('/api/admin/tables/'+table.id,'PATCH',{active:false});
  results.push({case:'Desactivar mesa con pedido activo',status:deactivate.status,expected:409,passed:deactivate.status===409});
  const rotated=await request('/api/table-sessions','POST',{table:table.code});
  const newToken=new URL(rotated.json.data.accessUrl).searchParams.get('token');
  cookie=undefined;
  const detail=await request('/api/orders/'+order.json.data.id,'GET',undefined,token);
  const page=await request('/mesa/'+table.code+'?token='+encodeURIComponent(token));
  assert.equal(detail.status,200);
  assert.notEqual((await request('/api/orders/'+order.json.data.id,'GET',undefined,newToken)).status,200);
  assert.equal(page.text.includes('Acceso no válido'),false);
  assert.ok(page.text.includes(order.json.data.id));
  const replay=await request('/api/orders','POST',payload,token);
  assert.equal(replay.status,201);
  assert.equal(replay.json.data.id,order.json.data.id);
  assert.equal((await request('/api/orders','POST',{...payload,idempotencyKey:randomUUID()},token)).status,401);
  results.push({case:'QR renovado: reapertura, lectura, reintento sin duplicado y prohibición de nuevo pedido',passed:true});
  cookie=adminCookie;
  const passwords=await Promise.all([1,2].map(() => request('/api/account/password','POST',{currentPassword:password,newPassword:randomBytes(24).toString('base64url')})));
  assert.equal(passwords.filter(result=>result.status===200).length,1);
  assert.ok(passwords.some(result=>[401,403].includes(result.status)));
  const [audit]=await sql`select count(*)::integer as n from staff_audit_events where target_user_id=${userId} and action='PASSWORD_CHANGED'`;
  assert.equal(audit.n,1);
  results.push({case:'Cambio de contraseña concurrente: un commit y un evento de auditoría',passed:true});
} finally {
  await sql.begin(async tx=>{
    if(tables.length) {
      await tx`delete from orders where table_session_id in (select id from table_sessions where table_id in ${tx(tables)})`;
      await tx`delete from table_sessions where table_id in ${tx(tables)}`;
      await tx`delete from table_audit_events where table_id in ${tx(tables)}`;
      await tx`delete from dining_tables where id in ${tx(tables)}`;
    }
    if(userId) {
      await tx`delete from staff_audit_events where actor_user_id=${userId} or target_user_id=${userId}`;
      await tx`delete from restaurant_users where id=${userId}`;
    }
    await tx`delete from auth_attempts where username=${prefix}`;
  });
  await sql.end();
  await mkdir('qa',{recursive:true});
  await writeFile('qa/correction-regressions.json',JSON.stringify({date:new Date().toISOString(),results},null,2));
}
console.log(JSON.stringify(results,null,2));
