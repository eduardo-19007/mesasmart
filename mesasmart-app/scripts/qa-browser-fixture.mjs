import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { writeFile, readFile, mkdir, unlink } from "node:fs/promises";
import postgres from "postgres";
process.loadEnvFile(".env.local");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const file = ".qa-browser-fixture.json";
try {
  if (process.argv[2] === "cleanup") {
    const fixture = JSON.parse(await readFile(file, "utf8"));
    await sql.begin(async tx => {
      await tx`delete from order_events where order_id in (select o.id from orders o join table_sessions s on s.id=o.table_session_id where s.table_id=${fixture.tableId})`;
      await tx`delete from order_items where order_id in (select o.id from orders o join table_sessions s on s.id=o.table_session_id where s.table_id=${fixture.tableId})`;
      await tx`delete from orders where table_session_id in (select id from table_sessions where table_id=${fixture.tableId})`;
      await tx`delete from table_sessions where table_id=${fixture.tableId}`;
      await tx`delete from dining_tables where id=${fixture.tableId}`;
      await tx`delete from restaurant_users where id=${fixture.id}`;
    });
    await unlink(file); console.log("Fixture visual eliminado.");
  } else {
    try { await readFile(file); throw new Error("Ya existe un fixture, use cleanup antes de recrearlo"); }
    catch(e) { if(e.code !== "ENOENT") throw e; }
    const username = "qa_ui_" + randomBytes(5).toString("hex");
    const password = randomBytes(18).toString("base64url");
    const salt = randomBytes(16).toString("hex");
    const hash = "scrypt$" + salt + "$" + scryptSync(password,salt,64).toString("base64url");
    const [r] = await sql`select id from restaurants where slug=${process.env.RESTAURANT_SLUG ?? "miraflores"}`;
    const fixture = await sql.begin(async tx => {
      const [user] = await tx`insert into restaurant_users (restaurant_id,auth_user_id,username,password_hash,role) values (${r.id},${randomUUID()},${username},${hash},'ADMIN') returning id`;
      const [table] = await tx`insert into dining_tables (restaurant_id,code,capacity,qr_token_hash) values (${r.id},'M97',4,'qa') returning id`;
      return { id:user.id, tableId:table.id };
    });
    await mkdir("qa",{recursive:true});
    await writeFile(file,JSON.stringify(fixture));
    const login = await fetch("http://localhost:3000/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const access = await fetch("http://localhost:3000/api/table-sessions",{method:"POST",headers:{"Content-Type":"application/json",Cookie:cookie},body:JSON.stringify({table:"M97"})});
    const result = await access.json();
    console.log(JSON.stringify({username,password,accessUrl:result.data.accessUrl}));
  }
} finally { await sql.end(); }
