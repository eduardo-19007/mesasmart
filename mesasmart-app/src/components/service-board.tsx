"use client";
import { useEffect, useState } from "react";
import type { Order } from "@/lib/orders";
import { LogoutButton } from "./logout-button";

export function ServiceBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  async function load() {
    try {
      const r = await fetch("/api/orders?scope=service", { cache: "no-store" });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      setOrders(result.data); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo conectar"); }
  }
  // The initial request synchronizes the view with the server.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const timer = setInterval(() => { void load(); }, 5000); void load(); return () => clearInterval(timer); }, []);
  async function advance(order: Order) {
    setBusy(order.id);
    try {
      const r = await fetch("/api/orders/" + order.id + "/status", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: order.status === "Listo" ? "Entregado" : "Cerrado" }) });
      const result = await r.json(); if (!r.ok) throw new Error(result.error);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo actualizar"); }
    finally { setBusy(""); }
  }
  const visible = orders.filter(order => ["Listo", "Entregado"].includes(order.status));
  return <main className="mx-auto max-w-6xl p-5"><header className="mb-6 flex items-center justify-between"><h1 className="text-3xl font-bold">Atención de mesas</h1><LogoutButton/></header>
    {error && <p role="alert" className="mb-4 text-[var(--coral)]">{error}</p>}
    {!visible.length && <p>No hay pedidos pendientes de entrega o cierre.</p>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map(order => <article key={order.id} className="rounded-md border border-[var(--line)] bg-white p-5">
      <p className="text-sm">{order.id} · {order.table}</p><h2 className="mt-2 text-xl font-bold">{order.status}</h2>
      <ul className="my-4">{order.items.map(item => <li key={item.productId}>{item.quantity} × {item.name}</li>)}</ul>
      <button disabled={Boolean(busy)} onClick={() => void advance(order)} className="w-full rounded-md bg-[var(--teal)] px-4 py-3 font-bold text-white disabled:opacity-50">{busy === order.id ? "Guardando..." : order.status === "Listo" ? "Confirmar entrega" : "Cerrar pedido"}</button>
    </article>)}</div></main>;
}
