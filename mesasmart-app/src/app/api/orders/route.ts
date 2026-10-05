import { NextResponse } from "next/server";
import { getOrderRepository } from "@/lib/server-order-repository";
import { createOrderSchema } from "@/lib/validation";
import { validTableSession } from "@/lib/table-sessions";
import { isAuthorized } from "@/lib/staff-auth";
import { apiError, readJson } from "@/lib/api";

export async function GET(request: Request) {
  try {
    if (!await isAuthorized(["ADMIN", "KITCHEN", "WAITER"])) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const page = Number(params.get("page") ?? 1);
    if (!Number.isInteger(page) || page < 1 || page > 100000) return NextResponse.json({ error: "Página inválida" }, { status: 400 });
    const active = params.get("scope") === "service";
    return NextResponse.json({ data: await getOrderRepository().list({ states: active ? ["Listo", "Entregado"] : undefined, limit: active ? 1000 : 100, offset: active ? 0 : (page - 1) * 100 }), page });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    const parsed = createOrderSchema.safeParse(await readJson(request));
    if (!parsed.success) return NextResponse.json({ error: "Pedido inválido", details: parsed.error.flatten() }, { status: 400 });
    // Closed sessions may replay a committed request, never create a new order.
    const session = await validTableSession(request.headers.get("X-Table-Token") ?? undefined, parsed.data.table, true);
    if (!session) return NextResponse.json({ error: "La sesión de mesa no es válida o venció" }, { status: 401 });
    return NextResponse.json({ data: await getOrderRepository().create({ ...parsed.data, sessionId: session.id }) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
