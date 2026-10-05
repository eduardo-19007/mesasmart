import { z } from "zod";
import { orderStatuses } from "@/lib/orders";
import { tableCodeRegex } from "./table-code";

export const createOrderSchema = z.object({
  idempotencyKey: z.uuid(),
  expectedTotalCents: z.number().int().min(0),
  table: z.string().trim().regex(tableCodeRegex, "Use una mesa entre M01 y M99"),
  note: z.string().trim().max(250).optional(),
  items: z.array(z.object({
    productId: z.string().trim().min(1).max(40),
    quantity: z.number().int().min(1).max(20),
    expectedUnitPriceCents: z.number().int().min(0).optional(),
  })).min(1).max(50).refine(items => new Set(items.map(item => item.productId)).size === items.length, "Productos duplicados"),
});

export const updateStatusSchema = z.object({ status: z.enum(orderStatuses), reason: z.string().trim().min(5).max(250).optional() }).refine(value => !["Cancelado", "Rechazado"].includes(value.status) || Boolean(value.reason), "Se requiere motivo");
