import "server-only";
import postgres, { Sql } from "postgres";

const globalDatabase = globalThis as typeof globalThis & { mesaSmartSql?: Sql };

export function getDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está configurada");
  globalDatabase.mesaSmartSql ??= postgres(process.env.DATABASE_URL, { max: 10, idle_timeout: 20 });
  return globalDatabase.mesaSmartSql;
}
