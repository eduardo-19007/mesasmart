import { NextResponse } from "next/server";
import { getOrderRepository } from "@/lib/server-order-repository";
import { updateStatusSchema } from "@/lib/validation";
import { getStaffSession } from "@/lib/staff-auth";
import { apiError, readJson } from "@/lib/api";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getStaffSession();
    if (!actor) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const parsed = updateStatusSchema.safeParse(await readJson(request));
    if (!parsed.success) return NextResponse.json({ error: "Estado o motivo inválido" }, { status: 400 });
    const allowed = actor.role === "ADMIN" || (actor.role === "KITCHEN" && ["En preparación", "Listo", "Rechazado"].includes(parsed.data.status)) || (actor.role === "WAITER" && ["Entregado", "Cerrado"].includes(parsed.data.status));
    if (!allowed) return NextResponse.json({ error: "Su rol no permite esta acción" }, { status: 403 });
    const { id } = await context.params;
    const order = await getOrderRepository().updateStatus(id, parsed.data.status, actor.userId, parsed.data.reason);
    return order ? NextResponse.json({ data: order }) : NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  } catch (error) { return apiError(error); }
}
