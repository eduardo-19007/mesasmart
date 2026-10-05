import { NextResponse } from "next/server";
import { getOrderRepository } from "@/lib/server-order-repository";
import { isAuthorized } from "@/lib/staff-auth";
import { validOrderTableSession } from "@/lib/table-sessions";
import { apiError } from "@/lib/api";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const staff = await isAuthorized(["ADMIN", "KITCHEN", "WAITER"]);
    const { id } = await context.params;
    const order = await getOrderRepository().find(id);
    if (!staff) {
      const allowed = order && order.sessionId && await validOrderTableSession(request.headers.get("X-Table-Token") ?? undefined, order.table, order.sessionId);
      if (!allowed) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    return order ? NextResponse.json({ data: order }) : NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  } catch (error) { return apiError(error); }
}
