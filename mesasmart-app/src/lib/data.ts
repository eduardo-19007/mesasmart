export type Category = "Entradas" | "Fondos" | "Bebidas" | "Postres";
export type MenuItem = { id: string; name: string; description: string; price: number; category: Category; image: string; minutes: number; available: boolean; tag?: string };

export const menu: MenuItem[] = [
  { id: "anticuchos", name: "Anticuchos de corazón", description: "Papas doradas, choclo y salsa de ají amarillo.", price: 26, category: "Entradas", minutes: 15, available: true, tag: "Favorito", image: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=900&q=85" },
  { id: "causa", name: "Causa limeña", description: "Papa amarilla, pollo, palta y huevo de corral.", price: 22, category: "Entradas", minutes: 12, available: true, image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85" },
  { id: "lomo", name: "Lomo saltado", description: "Lomo fino, cebolla, tomate, papas y arroz.", price: 42, category: "Fondos", minutes: 24, available: true, tag: "Más pedido", image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=85" },
  { id: "pasta", name: "Pasta al pesto", description: "Fettuccine, pesto de albahaca, queso y tomate confitado.", price: 34, category: "Fondos", minutes: 20, available: true, image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=85" },
  { id: "burger", name: "Hamburguesa criolla", description: "Carne, queso, cebolla caramelizada y papas nativas.", price: 36, category: "Fondos", minutes: 18, available: true, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85" },
  { id: "chicha", name: "Chicha morada", description: "Maíz morado, piña, canela y limón.", price: 10, category: "Bebidas", minutes: 3, available: true, image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=85" },
  { id: "limonada", name: "Limonada de hierbaluisa", description: "Limón fresco y hierbaluisa de la casa.", price: 12, category: "Bebidas", minutes: 4, available: true, image: "https://images.unsplash.com/photo-1523371054106-bbf80586c38c?auto=format&fit=crop&w=900&q=85" },
  { id: "suspiro", name: "Suspiro limeño", description: "Manjar de yemas y merengue al oporto.", price: 18, category: "Postres", minutes: 8, available: true, image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=85" },
];

export type KitchenOrder = { id: string; table: string; status: "Confirmado" | "En preparación" | "Listo"; elapsed: number; estimate: number; items: string[]; note?: string };
export const initialOrders: KitchenOrder[] = [
  { id: "MS-1042", table: "M08", status: "Confirmado", elapsed: 3, estimate: 22, items: ["2 Lomo saltado", "1 Limonada"] },
  { id: "MS-1041", table: "M03", status: "En preparación", elapsed: 14, estimate: 18, items: ["1 Hamburguesa criolla", "1 Chicha morada"], note: "Sin cebolla" },
  { id: "MS-1040", table: "M11", status: "En preparación", elapsed: 19, estimate: 24, items: ["2 Pasta al pesto", "1 Causa limeña"] },
  { id: "MS-1039", table: "M05", status: "Listo", elapsed: 21, estimate: 20, items: ["1 Lomo saltado", "2 Chicha morada"] },
];
