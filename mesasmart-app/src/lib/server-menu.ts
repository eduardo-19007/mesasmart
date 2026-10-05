import "server-only";
import { menu, MenuItem } from "@/lib/data";
import { getDatabase } from "@/lib/server-db";
import { restaurantId } from "./server-config";
import { isDemoMode } from "./table-access";

type ProductRow = { slug: string; name: string; description: string; category: MenuItem["category"]; price_cents: number; image_url: string | null; base_minutes: number; available: boolean };

function mapProduct(row: ProductRow): MenuItem {
  return { id: row.slug, name: row.name, description: row.description, category: row.category, price: row.price_cents / 100, image: row.image_url ?? "", minutes: row.base_minutes, available: row.available };
}

export async function listMenu(includeUnavailable = false) {
  if (isDemoMode()) return includeUnavailable ? menu : menu.filter((item) => item.available);
  const sql = getDatabase();
  const tenant = await restaurantId();
  const rows = includeUnavailable
    ? await sql<ProductRow[]>`select slug, name, description, category, price_cents, image_url, base_minutes, available from products where restaurant_id = ${tenant} order by category, name`
    : await sql<ProductRow[]>`select slug, name, description, category, price_cents, image_url, base_minutes, available from products where restaurant_id = ${tenant} and available = true order by category, name`;
  return rows.map(mapProduct);
}
