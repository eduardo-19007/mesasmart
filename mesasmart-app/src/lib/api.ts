import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public details?: unknown) { super(message); }
}

export async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new ApiError(415, "Se requiere JSON");
  const reader = request.body?.getReader();
  const decoder = new TextDecoder();
  let raw = "", size = 0;
  if (reader) {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 32768) { await reader.cancel(); throw new ApiError(413, "Solicitud demasiado grande"); }
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
    } finally { reader.releaseLock(); }
  }
  try { return JSON.parse(raw); } catch { throw new ApiError(400, "JSON inválido"); }
}

export function apiError(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: error.status });
  const incidentId = randomUUID();
  console.error(JSON.stringify({ event: "API_ERROR", incidentId, errorType: error instanceof Error ? error.name : "Unknown", occurredAt: new Date().toISOString() }));
  return NextResponse.json({ error: "No se pudo completar la operación. Intente nuevamente.", incidentId }, { status: 503 });
}
