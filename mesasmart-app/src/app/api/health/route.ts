import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/server-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    await getDatabase()`select 1`;
    return NextResponse.json({ status: "ok", database: "ok", checkedAt: new Date().toISOString(), responseMs: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "unavailable", database: "unavailable", checkedAt: new Date().toISOString(), responseMs: Date.now() - started }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
