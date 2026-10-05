import { menu } from "@/lib/data";

export const orderStatuses = ["Confirmado", "En preparación", "Listo", "Entregado", "Cerrado", "Cancelado", "Rechazado"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export type OrderLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type Order = {
  id: string;
  table: string;
  status: OrderStatus;
  elapsed: number;
  estimate: number;
  items: OrderLine[];
  note?: string;
  statusReason?: string;
  createdAt: string;
  total: number;
  readyAt?: string;
  sessionId?: string;
  history?: Array<{ status: OrderStatus; occurredAt: string; reason?: string }>;
};

export const nextOrderStatus: Record<OrderStatus, OrderStatus | null> = {
  Confirmado: "En preparación",
  "En preparación": "Listo",
  Listo: "Entregado",
  Entregado: "Cerrado",
  Cerrado: null,
  Cancelado: null,
  Rechazado: null,
};

const seed = [
  { id: "MS-1042", table: "M08", status: "Confirmado", elapsed: 3, estimate: 22, products: [["lomo", 2], ["limonada", 1]], note: undefined },
  { id: "MS-1041", table: "M03", status: "En preparación", elapsed: 14, estimate: 18, products: [["burger", 1], ["chicha", 1]], note: "Sin cebolla" },
  { id: "MS-1040", table: "M11", status: "En preparación", elapsed: 19, estimate: 24, products: [["pasta", 2], ["causa", 1]], note: undefined },
  { id: "MS-1039", table: "M05", status: "Listo", elapsed: 21, estimate: 20, products: [["lomo", 1], ["chicha", 2]], note: undefined },
] satisfies Array<{ id: string; table: string; status: OrderStatus; elapsed: number; estimate: number; products: Array<[string, number]>; note?: string }>;

function createSeedOrders(): Order[] {
  return seed.map((order, index) => {
    const items = order.products.map(([productId, quantity]) => {
      const product = menu.find((item) => item.id === productId)!;
      return { productId, name: product.name, quantity, unitPrice: product.price };
    });
    return {
      id: order.id,
      table: order.table,
      status: order.status,
      elapsed: order.elapsed,
      estimate: order.estimate,
      note: order.note,
      items,
      createdAt: new Date(Date.now() - (index + 1) * 8 * 60_000).toISOString(),
      total: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    };
  });
}

export class DemoOrderRepository {
  private orders = createSeedOrders();
  private sequence = 1043;

  list() {
    return [...this.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  find(id: string) {
    return this.orders.find((order) => order.id === id);
  }

  create(input: { table: string; note?: string; items: Array<{ productId: string; quantity: number }> }) {
    const items = input.items.map(({ productId, quantity }) => {
      const product = menu.find((item) => item.id === productId && item.available);
      if (!product) throw new Error(`Producto no disponible: ${productId}`);
      return { productId, name: product.name, quantity, unitPrice: product.price };
    });
    const order: Order = {
      id: `MS-${this.sequence++}`,
      table: input.table,
      status: "Confirmado",
      elapsed: 0,
      estimate: Math.max(12, ...items.map((line) => menu.find((item) => item.id === line.productId)!.minutes)),
      items,
      note: input.note,
      createdAt: new Date().toISOString(),
      total: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    };
    this.orders.unshift(order);
    return order;
  }

  updateStatus(id: string, status: OrderStatus) {
    const order = this.find(id);
    if (!order) return undefined;
    const allowed = nextOrderStatus[order.status];
    if (allowed !== status) throw new Error(`Transición no permitida: ${order.status} a ${status}`);
    order.status = status;
    return order;
  }
}

const globalStore = globalThis as typeof globalThis & { mesaSmartOrders?: DemoOrderRepository };
export const demoOrderRepository = globalStore.mesaSmartOrders ??= new DemoOrderRepository();
