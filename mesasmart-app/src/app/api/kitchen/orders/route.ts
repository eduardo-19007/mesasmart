import { NextResponse } from "next/server";
import { getOrderRepository } from "@/lib/server-order-repository";
import { isAuthorized } from "@/lib/staff-auth";

export async function GET() {
  if (!await isAuthorized(["ADMIN", "KITCHEN"])) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const orders = await getOrderRepository().list({ states: ["Confirmado", "En preparación", "Listo"], limit: 1000 });
  return NextResponse.json({ data: orders.filter((order) => ["Confirmado", "En preparación", "Listo"].includes(order.status)) });
}
