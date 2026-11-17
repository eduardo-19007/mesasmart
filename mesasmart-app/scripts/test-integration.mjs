import assert from "node:assert/strict";
import { randomBytes, randomUUID, scryptSync, createHmac } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import postgres from "postgres";

try { process.loadEnvFile('.env.local'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const sql = postgres(process.env.DATABASE_URL, { max: 3 });
const prefix = "qa_" + randomBytes(5).toString("hex");
const password = randomBytes(24).toString("base64url");
const hash = () => { const salt = randomBytes(16).toString("hex"); return "scrypt$" + salt + "$" + scryptSync(password, salt, 64).toString("base64url"); };
const results = [];
let failure = null;
const userIds = [];
const tableIds = [];
const productIds = [];
let foreignId;
let tenant;
async function request(path, { cookie, token, body, method = "GET", raw, origin } = {}) {
  if (path === '/api/orders' && method === 'POST' && body?.items) {
    const menu = await (await fetch(base + '/api/menu')).json();
    body = { ...body, items: body.items.map(item => ({ ...item, expectedUnitPriceCents: item.expectedUnitPriceCents ?? Math.round((menu.data.find(p => p.id === item.productId)?.price ?? 0) * 100) })) };
  }
  const response = await fetch(base + path, {
    method, redirect: "manual",
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(token ? { "X-Table-Token": token } : {}),
      ...(body !== undefined || raw !== undefined ? { "Content-Type": "application/json" } : {}), ...(origin ? { Origin: origin } : {}) },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = null; }
  return { status: response.status, body: data, cookie: response.headers.get("set-cookie")?.split(";")[0], location: response.headers.get("location") };
}
function check(name, actual, expected) {
  assert.deepEqual(actual, expected, name);
  results.push({ name, status: "PASS" });
  console.log("PASS " + name);
}
async function login(username) {
  const result = await request("/api/auth/login", { method: "POST", body: { username, password } });
  check("Login " + username.split("_").at(-1), result.status, 200);
  assert.ok(result.cookie);
  return result.cookie;
}
try {
  [tenant] = await sql`select id from restaurants where slug = ${process.env.RESTAURANT_SLUG ?? "miraflores"}`;
  assert.ok(tenant, "Restaurante configurado");
  for (const role of ["ADMIN", "KITCHEN", "WAITER"]) {
    const [user] = await sql`insert into restaurant_users (restaurant_id, auth_user_id, username, password_hash, role)
      values (${tenant.id}, ${randomUUID()}, ${prefix + "_" + role.toLowerCase()}, ${hash()}, ${role}::user_role) returning id`;
    userIds.push(user.id);
  }
  const [foreign] = await sql`insert into restaurants (slug, name) values (${prefix}, 'QA aislado') returning id`;
  foreignId = foreign.id;
  const [foreignUser] = await sql`insert into restaurant_users (restaurant_id, auth_user_id, username, password_hash, role)
    values (${foreignId}, ${randomUUID()}, ${prefix + "_foreign"}, ${hash()}, 'ADMIN') returning id`;
  userIds.push(foreignUser.id);
  const [product] = await sql`insert into products (restaurant_id, slug, name, description, category, price_cents, base_minutes)
    values (${tenant.id}, ${prefix}, 'QA producto temporal', 'Producto de prueba', 'Bebidas', 1250, 5) returning id`;
  productIds.push(product.id);
  const [foreignProduct] = await sql`insert into products (restaurant_id, slug, name, category, price_cents, base_minutes)
    values (${foreignId}, ${prefix + "-foreign"}, 'QA externo', 'Bebidas', 100, 1) returning id`;
  productIds.push(foreignProduct.id);
  const tables = [];
  for (let n = 99; n >= 80 && tables.length < 2; n--) {
    const code = "M" + n;
    const [row] = await sql`insert into dining_tables (restaurant_id, code, capacity, qr_token_hash)
      values (${tenant.id}, ${code}, 4, 'qa') on conflict (restaurant_id, code) do nothing returning id`;
    if (row) { tableIds.push(row.id); tables.push(code); }
  }
  assert.equal(tables.length, 2, "Dos mesas temporales libres");
  check("API administrativa sin sesión", (await request("/api/admin/staff")).status, 401);
  check("JSON malformado", (await request("/api/auth/login", { method: "POST", raw: "{" })).status, 400);
  check("Origen externo rechazado", (await request("/api/auth/login", { method: "POST", origin: "https://external.invalid", body: {} })).status, 403);
  check("Usuario de otro restaurante no inicia sesión", (await request("/api/auth/login", { method: "POST", body: { username: prefix + "_foreign", password } })).status, 401);
  const admin = await login(prefix + "_admin");
  let kitchen = await login(prefix + "_kitchen");
  let waiter = await login(prefix + "_waiter");
  const oldWaiterCookie = waiter;
  const ownPassword = await request("/api/account/password", { method: "POST", cookie: waiter, body: { currentPassword: password, newPassword: password + "-personal" } });
  check("Cambio de contraseña propia", ownPassword.status, 200);
  waiter = ownPassword.cookie;
  assert.ok(waiter, "El cambio de contraseña renueva la cookie");
  check("Cookie anterior revocada tras cambio propio", (await request("/atencion", { cookie: oldWaiterCookie })).location, "/login");
  check("Nueva sesión continúa activa", (await request("/atencion", { cookie: waiter })).status, 200);
  check("Cocina sin permiso administrativo", (await request("/api/admin/products", { cookie: kitchen })).status, 401);
  check("Atención tiene pantalla propia", (await request("/atencion", { cookie: waiter })).status, 200);
  check("Cocina redirige fuera de administración", (await request("/admin", { cookie: kitchen })).location, "/cocina");
  let managedCode = "";
  for (let n = 79; n >= 70 && !managedCode; n--) {
    const code = "M" + n;
    const [exists] = await sql`select id from dining_tables where restaurant_id = ${tenant.id} and code = ${code}`;
    if (!exists) managedCode = code;
  }
  assert.ok(managedCode, "Código libre para administrar mesa");
  const managed = await request("/api/admin/tables", { method: "POST", cookie: admin, body: { code: managedCode, capacity: 6 } });
  check("Crear mesa desde administración", managed.status, 201);
  tableIds.push(managed.body.data.id);
  check("Editar capacidad de mesa", (await request("/api/admin/tables/" + managed.body.data.id, { method: "PATCH", cookie: admin, body: { capacity: 8 } })).body.data.capacity, 8);
  check("Desactivar mesa sin pedidos", (await request("/api/admin/tables/" + managed.body.data.id, { method: "PATCH", cookie: admin, body: { active: false } })).body.data.active, false);
  check("Mesa inactiva no genera QR", (await request("/api/table-sessions", { method: "POST", cookie: admin, body: { table: managedCode } })).status, 404);
  check("Reactivar mesa", (await request("/api/admin/tables/" + managed.body.data.id, { method: "PATCH", cookie: admin, body: { active: true } })).body.data.active, true);
  const tableList = await request("/api/admin/tables", { cookie: admin });
  check("Listado de mesas incluye nueva mesa", tableList.body.data.some(table => table.id === managed.body.data.id), true);
  const people = await request("/api/admin/staff", { cookie: admin });
  check("Listado sin cuentas de otro restaurante", people.body.data.some(x => x.id === foreignUser.id), false);
  check("No modificar personal externo", (await request("/api/admin/staff/" + foreignUser.id, { method: "PATCH", cookie: admin, body: { active: false } })).status, 404);
  check("No modificar productos externos", (await request("/api/admin/products/" + prefix + "-foreign", { method: "PATCH", cookie: admin, body: { price: 5 } })).status, 404);
  check("No degradarse a sí mismo", (await request("/api/admin/staff/" + userIds[0], { method: "PATCH", cookie: admin, body: { role: "WAITER" } })).status, 409);
  check("UUID inválido", (await request("/api/admin/staff/not-uuid", { method: "PATCH", cookie: admin, body: { active: false } })).status, 400);
  check("Desactivar cocina temporal", (await request("/api/admin/staff/" + userIds[1], { method: "PATCH", cookie: admin, body: { active: false } })).status, 200);
  check("Cookie desactivada revocada", (await request("/api/kitchen/orders", { cookie: kitchen })).status, 401);
  await request("/api/admin/staff/" + userIds[1], { method: "PATCH", cookie: admin, body: { active: true } });
  check("Reactivar no revive cookie anterior", (await request("/api/kitchen/orders", { cookie: kitchen })).status, 401);
  kitchen = await login(prefix + "_kitchen");
  await request("/api/admin/staff/" + userIds[1], { method: "PATCH", cookie: admin, body: { password: password + "reset" } });
  check("Restablecimiento revoca sesión", (await request("/api/kitchen/orders", { cookie: kitchen })).status, 401);
  await request("/api/admin/staff/" + userIds[1], { method: "PATCH", cookie: admin, body: { password } });
  kitchen = await login(prefix + "_kitchen");
  await request("/api/admin/staff/" + userIds[1], { method: "PATCH", cookie: admin, body: { role: "WAITER" } });
  check("Cambio de rol revoca cookie anterior", (await request("/api/kitchen/orders", { cookie: kitchen })).status, 401);
  await request("/api/admin/staff/" + userIds[1], { method: "PATCH", cookie: admin, body: { role: "KITCHEN" } });
  kitchen = await login(prefix + "_kitchen");
  const publicMenu = await request("/api/menu");
  check("Carta sin productos externos", publicMenu.body.data.some(x => x.id === prefix + "-foreign"), false);
  const qr = await request("/api/table-sessions", { method: "POST", cookie: admin, body: { table: tables[0] } });
  check("QR generado", qr.status, 201);
  const token = new URL(qr.body.data.accessUrl).searchParams.get("token");
  const qr2 = await request("/api/table-sessions", { method: "POST", cookie: admin, body: { table: tables[1] } });
  const otherToken = new URL(qr2.body.data.accessUrl).searchParams.get("token");
  const body = { table: tables[0], idempotencyKey: randomUUID(), expectedTotalCents: 2500, items: [{ productId: prefix, quantity: 2 }], note: "QA regression" };
  check("Pedido sin QR rechazado", (await request("/api/orders", { method: "POST", body })).status, 401);
  check("QR de otra mesa rechazado", (await request("/api/orders", { method: "POST", token: otherToken, body })).status, 401);
  check("QR manipulado rechazado", (await request("/api/orders", { method: "POST", token: token + "x", body })).status, 401);
  const expiredPayload = tables[0] + "." + (Date.now()-1000) + ".qa";
  const expired = expiredPayload + "." + createHmac("sha256", process.env.QR_SIGNING_SECRET).update(expiredPayload).digest("base64url");
  check("QR vencido rechazado", (await request("/api/orders", { method: "POST", token: expired, body })).status, 401);
  check("Cantidad negativa", (await request("/api/orders", { method: "POST", token, body: { ...body, items: [{ productId: prefix, quantity: -1 }] } })).status, 400);
  check("Líneas duplicadas", (await request("/api/orders", { method: "POST", token, body: { ...body, items: [...body.items, ...body.items] } })).status, 400);
  const [one,two] = await Promise.all([request("/api/orders", { method: "POST", token, body }), request("/api/orders", { method: "POST", token, body })]);
  check("Registro correcto", one.status, 201);
  check("Reintento concurrente devuelve mismo pedido", one.body.data.id, two.body.data.id);
  const id = one.body.data.id;
  if (process.env.TEST_ML_SHADOW === 'true') {
    const events = await sql`select e.metadata from order_events e join orders o on o.id=e.order_id where o.public_code=${id} and o.restaurant_id=${tenant.id} and e.to_status='CONFIRMED'`;
    check('ML comparación única pese a reintento', events.length, 1);
    const shadow = events[0].metadata.shadowEstimate;
    check('ML experimental registrado', shadow?.mode, 'SHADOW');
    check('ML no sustituye estimación operativa', shadow.operational, false);
    check('ML referencia coincide con minutos visibles', shadow.baselineMinutes, one.body.data.estimate);
    check('ML cantidad registrada', shadow.quantity, 2);
    check('ML predicción y versión válidas', Number.isFinite(shadow.minutes) && shadow.minutes >= 1 && /^[a-f0-9]{64}$/.test(shadow.modelSha256), true);
  }
  check("Precio calculado por servidor", one.body.data.total, 25);
  check("Misma clave con otro contenido", (await request("/api/orders", { method: "POST", token, body: { ...body, note: "Distinto" } })).status, 409);
  check("Detalle anónimo protegido", (await request("/api/orders/" + id)).status, 403);
  check("Otra mesa no puede consultar", (await request("/api/orders/" + id, { token: otherToken })).status, 403);
  check("Mesa propietaria consulta", (await request("/api/orders/" + id, { token })).status, 200);
  check("Salto a listo rechazado", (await request("/api/orders/" + id + "/status", { method: "PATCH", cookie: kitchen, body: { status: "Listo" } })).status, 409);
  const race = await Promise.all([1,2].map(() => request("/api/orders/" + id + "/status", { method: "PATCH", cookie: kitchen, body: { status: "En preparación" } })));
  check("Transición concurrente única", race.map(x => x.status).sort(), [200,409]);
  check("Pedido listo", (await request("/api/orders/" + id + "/status", { method: "PATCH", cookie: kitchen, body: { status: "Listo" } })).status, 200);
  check("Cocina no puede entregar", (await request("/api/orders/" + id + "/status", { method: "PATCH", cookie: kitchen, body: { status: "Entregado" } })).status, 403);
  check("Atención confirma entrega", (await request("/api/orders/" + id + "/status", { method: "PATCH", cookie: waiter, body: { status: "Entregado" } })).status, 200);
  check("Atención cierra", (await request("/api/orders/" + id + "/status", { method: "PATCH", cookie: waiter, body: { status: "Cerrado" } })).status, 200);
  const queue = await request("/api/kitchen/orders", { cookie: kitchen });
  check("Cerrado fuera de cocina", queue.body.data.some(x => x.id === id), false);
  const [events] = await sql`select count(*)::int as count from order_events e join orders o on o.id=e.order_id where o.public_code=${id}`;
  check("Historial completo sin eventos duplicados", events.count, 5);
  const metrics = await request("/api/admin/metrics", { cookie: admin });
  check("Indicadores sin porcentajes inventados", "availability" in metrics.body.data || "selfServiceRate" in metrics.body.data, false);
  check("Histograma coincide con pedidos de hoy", metrics.body.data.hourlyOrders.reduce((s,x)=>s+x.count,0), metrics.body.data.ordersToday);
  check("Precio editable", (await request("/api/admin/products/" + prefix, { method: "PATCH", cookie: admin, body: { price: 17.75, available: false } })).status, 200);
  check("No disponible oculto en carta", (await request("/api/menu")).body.data.some(x => x.id === prefix), false);
  check("No disponible rechazado en pedido", (await request("/api/orders", { method: "POST", token, body: { ...body, idempotencyKey: randomUUID() } })).status, 409);
  await request("/api/admin/products/" + prefix, { method: "PATCH", cookie: admin, body: { available: true } });
  const changed = await request("/api/orders", { method: "POST", token, body: { ...body, idempotencyKey: randomUUID() } });
  check("Cambio de precio exige reconfirmación", [changed.status, changed.body.code, changed.body.details.currentTotalCents], [409, "PRICE_CHANGED", 3550]);
  const current = await request("/api/orders", { method: "POST", token, body: { ...body, idempotencyKey: randomUUID(), expectedTotalCents: 3550 } });
  check("Nuevo pedido toma nuevo precio", current.body.data.total, 35.5);
  check("Cancelación requiere motivo", (await request("/api/orders/" + current.body.data.id + "/status", { method: "PATCH", cookie: admin, body: { status: "Cancelado" } })).status, 400);
  check("Cancelación motivada", (await request("/api/orders/" + current.body.data.id + "/status", { method: "PATCH", cookie: admin, body: { status: "Cancelado", reason: "Prueba de excepción" } })).status, 200);
  check("Motivo visible en el pedido", (await request("/api/orders/" + current.body.data.id, { cookie: admin })).body.data.statusReason, "Prueba de excepción");
  await request("/api/table-sessions", { method: "POST", cookie: admin, body: { table: tables[0] } });
  check("Regenerar QR revoca anterior", (await request("/api/orders", { method: "POST", token, body: { ...body, idempotencyKey: randomUUID() } })).status, 401);
  check("QR anterior conserva seguimiento", (await request("/api/orders/" + current.body.data.id, { token })).status, 200);
  const audit = await request("/api/admin/audit", { cookie: admin });
  check("HU09 filtro inválido rechazado", (await request('/api/admin/metrics?from=2026-02-30&to=2026-03-01', { cookie: admin })).status, 400);
  check("HU09 rango invertido rechazado", (await request('/api/admin/metrics?from=2026-10-05&to=2026-10-04', { cookie: admin })).status, 400);
  check("HU09 periodo vacío", (await request('/api/admin/metrics?from=2100-01-01&to=2100-01-02', { cookie: admin })).body.data.ordersToday, 0);
  check("HU10 auditoría incluye pedidos", audit.body.data.some(event => event.area === 'Pedidos'), true);
  check("HU10 auditoría incluye acceso", audit.body.data.some(event => event.action === 'LOGIN_SUCCEEDED'), true);
  check("HU10 paginación inválida rechazada", (await request('/api/admin/audit?page=0', { cookie: admin })).status, 400);
  check("Auditoría administrativa disponible", audit.status, 200);
  check("Auditoría registra mesas", audit.body.data.some(event => event.action === "TABLE_CREATED" && event.target === managedCode), true);
  check("Auditoría registra contraseña propia", audit.body.data.some(event => event.action === "PASSWORD_CHANGED"), true);
  check("Logout", (await request("/api/auth/logout", { method: "POST", cookie: kitchen })).status, 303);
  check("Cookie copiada revocada tras logout", (await request("/api/kitchen/orders", { cookie: kitchen })).status, 401);
  for(let n=0;n<11;n++) {
    const result = await request("/api/auth/login", { method: "POST", body: { username: prefix + "_blocked", password: "incorrect-password" } });
    if(n===10) check("Límite de intentos persistente", result.status, 429);
  }
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  // Remove only fixture IDs inserted by this run; never touch operational users/orders.
  await sql.begin(async tx => {
    if(tableIds.length) {
      await tx`delete from order_events where order_id in (select o.id from orders o join table_sessions ts on ts.id=o.table_session_id where ts.table_id in ${tx(tableIds)})`;
      await tx`delete from order_items where order_id in (select o.id from orders o join table_sessions ts on ts.id=o.table_session_id where ts.table_id in ${tx(tableIds)})`;
      await tx`delete from orders where table_session_id in (select id from table_sessions where table_id in ${tx(tableIds)})`;
      await tx`delete from table_sessions where table_id in ${tx(tableIds)}`;
      await tx`delete from table_audit_events where table_id in ${tx(tableIds)} or actor_user_id in ${tx(userIds)}`;
      await tx`delete from dining_tables where id in ${tx(tableIds)}`;
    }
    if(productIds.length) {
      await tx`delete from product_audit_events where product_id in ${tx(productIds)}`;
      await tx`delete from products where id in ${tx(productIds)}`;
    }
    if(userIds.length) {
      await tx`delete from staff_audit_events where actor_user_id in ${tx(userIds)} or target_user_id in ${tx(userIds)}`;
      await tx`delete from restaurant_users where id in ${tx(userIds)}`;
    }
    await tx`delete from auth_attempts where username like ${prefix + "%"}`;
    if(foreignId) await tx`delete from restaurants where id=${foreignId}`;
  });
  await sql.end();
  await mkdir("qa", { recursive: true });
  await writeFile("qa/integration-results.json", JSON.stringify({ date: new Date().toISOString(), base, status: failure ? "FAIL" : "PASS", error: failure, passed: results.length, results }, null, 2));
}
console.log("Completadas: " + results.length + " comprobaciones; fixtures eliminados.");
