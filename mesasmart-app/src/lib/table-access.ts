import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { signingSecret } from "./server-config";

export type TableAccess = { table: string; expiresAt: number };

export function createTableToken(table: string, lifetimeMinutes = 720) {
  const expiresAt = Date.now() + lifetimeMinutes * 60_000;
  const payload = `${table}.${expiresAt}.${randomBytes(8).toString("hex")}`;
  const signature = createHmac("sha256", signingSecret("QR_SIGNING_SECRET")).update(payload).digest("base64url");
  return { token: `${payload}.${signature}`, expiresAt };
}

export function verifyTableToken(token: string | undefined, expectedTable: string, allowExpired = false): TableAccess | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [table, rawExpiry, nonce, signature] = parts;
  const payload = `${table}.${rawExpiry}.${nonce}`;
  const expected = createHmac("sha256", signingSecret("QR_SIGNING_SECRET")).update(payload).digest("base64url");
  const givenBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (givenBuffer.length !== expectedBuffer.length || !timingSafeEqual(givenBuffer, expectedBuffer)) return null;
  const expiresAt = Number(rawExpiry);
  if (table !== expectedTable || !Number.isFinite(expiresAt) || (!allowExpired && expiresAt <= Date.now())) return null;
  return { table, expiresAt };
}

export function isDemoMode() {
  return process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true";
}
