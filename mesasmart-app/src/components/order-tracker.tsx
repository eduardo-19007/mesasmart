"use client";
import { useEffect, useState } from "react";
import type { Order } from "@/lib/orders";
import { AppHeader } from "./app-header";

export function OrderTracker({ id, table, accessToken, onBack }: { id: string; table: string; accessToken?: string; onBack: () => void }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/orders/" + id, { cache: "no-store", signal: controller.signal, headers: accessToken ? { "X-Table-Token": accessToken } : {} });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (!stopped) { setOrder(result.data); setError(""); }
      } catch (e) { if (!stopped) setError(e instanceof Error ? e.message : "No se pudo actualizar el pedido"); }
      finally { if (!stopped) timer = setTimeout(refresh, 5000); }
    }
    void refresh();
    return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, [id, accessToken]);
  return <><AppHeader table={table}/><main className="mx-auto max-w-xl px-5 py-8">
    <p className="text-sm font-bold text-[var(--teal)]">Pedido {id}</p>
    <h1 className="mt-2 text-3xl font-bold" aria-live="polite">{order?.status ?? "Pedido registrado"}</h1>
    {error && <p role="alert" className="mt-3 text-[var(--coral)]">{error}</p>}
    {order && <><p className="mt-3 text-[var(--muted)]">Tiempo orientativo desde el registro: {order.estimate} minutos.</p>
      <ul className="my-6 divide-y divide-[var(--line)]">{order.items.map(item => <li key={item.productId} className="flex justify-between gap-4 py-3"><span>{item.quantity} × {item.name}</span><span className="shrink-0">S/ {(item.quantity * item.unitPrice).toFixed(2)}</span></li>)}</ul>
      <p className="text-lg font-bold">Total registrado: S/ {order.total.toFixed(2)}</p>
      {order.note && <p className="mt-3">Observaciones: {order.note}</p>}
      {order.statusReason && <p className="mt-4 rounded-md bg-[#fbe9e5] p-4 text-[var(--coral)]"><b>Motivo:</b> {order.statusReason}</p>}
      <ol aria-label="Historial del pedido" className="mt-6 divide-y divide-[var(--line)]">{order.history?.map((event, index) => <li key={index} className="flex flex-wrap justify-between gap-2 py-3"><span>{event.status}</span><time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString("es-PE", { timeZone: "America/Lima" })}</time></li>)}</ol>
    </>}
    <button onClick={onBack} className="mt-8 rounded-md border border-[var(--line)] bg-white px-5 py-3 font-bold">Volver a la carta</button>
  </main></>;
}
