import "server-only";
import { getDatabase } from "./server-db";

export async function restaurantId() {
  const [row] = await getDatabase()`select id from restaurants where slug = ${process.env.RESTAURANT_SLUG ?? "miraflores"}`;
  if (!row) throw new Error("Restaurante no configurado");
  return row.id as string;
}

export function signingSecret(name: "AUTH_SESSION_SECRET" | "QR_SIGNING_SECRET") {
  const value = process.env[name];
  if (!value || value.length < 32) throw new Error(`${name} requiere al menos 32 caracteres`);
  return value;
}
