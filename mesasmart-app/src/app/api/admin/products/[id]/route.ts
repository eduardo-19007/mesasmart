import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/server-db";
import { getStaffSession } from "@/lib/staff-auth";

const schema = z.object({ name: z.string().trim().min(3).max(80).optional(), description: z.string().trim().min(5).max(240).optional(), category: z.enum(["Entradas", "Fondos", "Bebidas", "Postres"]).optional(), image: z.string().url().startsWith("https://").max(500).optional(), price: z.number().positive().max(999).optional(), minutes: z.number().int().min(1).max(180).optional(), available: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getStaffSession();
  if (actor?.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Modificación inválida" }, { status: 400 });
  const { id } = await context.params;

  const sql = getDatabase();
  const product = await sql.begin(async (tx) => {
    const [current] = await tx`select id, restaurant_id, slug from products where slug = ${id} and restaurant_id = ${actor.restaurantId}`;
    if (!current) return null;
    const [updated] = await tx`update products set name = coalesce(${parsed.data.name ?? null}, name), description = coalesce(${parsed.data.description ?? null}, description), category = coalesce(${parsed.data.category ?? null}, category), image_url = coalesce(${parsed.data.image ?? null}, image_url), price_cents = coalesce(${parsed.data.price === undefined ? null : Math.round(parsed.data.price * 100)}, price_cents), base_minutes = coalesce(${parsed.data.minutes ?? null}, base_minutes), available = coalesce(${parsed.data.available ?? null}, available) where id = ${current.id} returning slug as id, name, price_cents::numeric / 100 as price, base_minutes as minutes, available`;
    await tx`insert into product_audit_events (restaurant_id, actor_user_id, product_id, action, metadata) values (${current.restaurant_id}, ${actor.userId}, ${current.id}, 'PRODUCT_UPDATED', ${tx.json(parsed.data)})`;
    return updated;
  });
  return product ? NextResponse.json({ data: product }) : NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
}
