import "server-only";
import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "@/lib/server-db";
import { restaurantId, signingSecret } from "./server-config";

export type StaffRole = "ADMIN" | "KITCHEN" | "WAITER";
export type StaffSession = { userId: string; username: string; role: StaffRole; expiresAt: number; version: number; restaurantId: string };
const cookieName = "mesasmart_staff";


export function hashPassword(password: string, salt: string) {
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, digest] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !digest) return false;
  const expected = Buffer.from(digest, "base64url");
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function sign(payload: string) { return createHmac("sha256", signingSecret("AUTH_SESSION_SECRET")).update(payload).digest("base64url"); }

export function encodeSession(session: StaffSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(value?: string): StaffSession | null {
  if (!value) return null;
  if (value.split(".").length !== 2) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as StaffSession;
    return typeof session.userId === "string" && Number.isInteger(session.version) && session.expiresAt > Date.now() ? session : null;
  } catch { return null; }
}

export async function authenticate(username: string, password: string) {
  const sql = getDatabase();
  const tenant = await restaurantId();
  const [user] = await sql<Array<{ id: string; username: string; password_hash: string; role: StaffRole; session_version: number }>>`
    select id, username, password_hash, role, session_version from restaurant_users
    where lower(username) = lower(${username}) and active = true and restaurant_id = ${tenant}`;
  if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) return null;
  await sql`update restaurant_users set last_login_at = now() where id = ${user.id}`;
  return { userId: user.id, username: user.username, role: user.role, version: user.session_version, restaurantId: tenant, expiresAt: Date.now() + 8 * 60 * 60_000 } satisfies StaffSession;
}

export async function setStaffSession(session: StaffSession) {
  (await cookies()).set(cookieName, encodeSession(session), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: new Date(session.expiresAt) });
}

export async function clearStaffSession() {
  const session = await getStaffSession();
  if (session) await getDatabase()`update restaurant_users set session_version = session_version + 1 where id = ${session.userId}`;
  (await cookies()).delete(cookieName);
}
export async function getStaffSession() {
  const session = decodeSession((await cookies()).get(cookieName)?.value);
  if (!session) return null;
  const tenant = await restaurantId();
  const [user] = await getDatabase()`select username, role, session_version from restaurant_users
    where id = ${session.userId} and restaurant_id = ${tenant} and active = true`;
  if (!user || user.session_version !== session.version || tenant !== session.restaurantId) return null;
  return { ...session, role: user.role as StaffRole, username: user.username };
}

export async function requireStaff(roles: StaffRole[]) {
  const session = await getStaffSession();
  if (!session) redirect("/login");
  if (!roles.includes(session.role)) redirect(session.role === "KITCHEN" ? "/cocina" : session.role === "WAITER" ? "/atencion" : "/admin");
  return session;
}

export async function isAuthorized(roles: StaffRole[]) {
  const session = await getStaffSession();
  return Boolean(session && roles.includes(session.role));
}
