import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/server-db";
import { getStaffSession } from "@/lib/staff-auth";
import { listMenu } from "@/lib/server-menu";
import { apiError, readJson } from "@/lib/api";

const schema = z.object({
  id: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,40}$/),
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().min(5).max(240),
  category: z.enum(["Entradas", "Fondos", "Bebidas", "Postres"]),
  price: z.number().positive().max(999),
  minutes: z.number().int().min(1).max(180),
  image: z.string().url().startsWith("https://").max(500),
});

async function getProducts() {
  const session = await getStaffSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ data: await listMenu(true) });
}

async function createProduct(request: Request) {
  const actor = await getStaffSession();
  if (actor?.role !== "ADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Datos del producto inválidos", details: parsed.error.flatten() }, { status: 400 });
  const sql = getDatabase();
  try {
    const product = await sql.begin(async (tx) => {
      const [user] = await tx`select restaurant_id from restaurant_users where id = ${actor.userId}`;
      const [created] = await tx`insert into products (restaurant_id, slug, name, description, category, price_cents, base_minutes, available, image_url) values (${user.restaurant_id}, ${parsed.data.id}, ${parsed.data.name}, ${parsed.data.description}, ${parsed.data.category}, ${Math.round(parsed.data.price * 100)}, ${parsed.data.minutes}, true, ${parsed.data.image}) returning id, slug`;
      await tx`insert into product_audit_events (restaurant_id, actor_user_id, product_id, action, metadata) values (${user.restaurant_id}, ${actor.userId}, ${created.id}, 'PRODUCT_CREATED', ${tx.json({ slug: created.slug })})`;
      return created;
    });
    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return NextResponse.json({ error: "El identificador del producto ya existe" }, { status: 409 });
    throw error;
  }
}

export async function GET() { try { return await getProducts(); } catch (error) { return apiError(error); } }
export async function POST(request: Request) { try { return await createProduct(request); } catch (error) { return apiError(error); } }
