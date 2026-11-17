"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, CheckCircle2, ChefHat, Clock3, Flame, LoaderCircle, RefreshCw, X } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { StaffNavigation } from "@/components/staff-navigation";
import { nextOrderStatus, Order, OrderStatus } from "@/lib/orders";

const columns: OrderStatus[] = ["Confirmado", "En preparación", "Listo"];

export function KitchenBoard({ role }: { role: "ADMIN" | "KITCHEN" | "WAITER" }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [exception, setException] = useState<{ order: Order; status: "Cancelado" | "Rechazado" } | null>(null);
  const [reason, setReason] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/kitchen/orders", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setOrders((await response.json()).data);
    } catch { setError("No se pudo actualizar la cola de cocina."); }
    finally { setLoading(false); }
  }, []);
  // The initial request synchronizes this client view with the server queue.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); const timer = setInterval(() => { void load(); }, 5000); return () => clearInterval(timer); }, [load]);

  async function advance(order: Order) {
    const status = nextOrderStatus[order.status];
    if (!status || busy) return;
    setBusy(order.id); setError("");
    try {
    const response = await fetch(`/api/orders/${order.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.ok) setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
    else setError((await response.json()).error ?? "No se pudo cambiar el estado.");
    } catch { setError("No se pudo conectar. Actualice antes de reintentar."); }
    finally { setBusy(""); }
  }

  async function applyException() {
    if (!exception || reason.trim().length < 5 || busy) return;
    setBusy(exception.order.id); setError("");
    try {
      const response = await fetch(`/api/orders/${exception.order.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: exception.status, reason: reason.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo registrar la excepción.");
      setOrders(current => current.filter(item => item.id !== exception.order.id));
      setException(null); setReason("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo registrar la excepción."); }
    finally { setBusy(""); }
  }

  function openException(order: Order, status: "Cancelado" | "Rechazado") {
    setReason(""); setException({ order, status });
  }

  return <div className="min-h-screen bg-[#eef2f3]"><header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--ink)] text-white"><ChefHat size={20}/></span><div><b>Cocina</b><p className="text-xs text-[var(--muted)]">Servicio de almuerzo</p></div></div><div className="flex gap-2"><button onClick={() => void load()} title="Actualizar" className="grid h-9 w-9 place-items-center rounded-md border border-[var(--line)]"><RefreshCw size={17}/></button><LogoutButton/></div></div></header>
    <main className="mx-auto max-w-7xl px-5 py-6"><div className="mb-5"><StaffNavigation role={role}/></div><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-[var(--teal)]">Cola operativa</p><h1 className="text-3xl font-bold">Pedidos en cocina</h1></div><div className="flex gap-5 text-sm"><span><b>{orders.filter((order) => order.status !== "Listo").length}</b> activos</span><span className="text-[var(--coral)]"><b>{orders.filter((order) => order.status !== "Listo" && order.elapsed > order.estimate).length}</b> demorados</span></div></div>
      {error && <p role="alert" className="mb-4 rounded-md bg-[#fbe9e5] p-3 text-sm text-[var(--coral)]">{error}</p>}
      {loading ? <div className="grid h-52 place-items-center"><LoaderCircle className="animate-spin text-[var(--teal)]"/></div> : <div className="grid gap-5 lg:grid-cols-3">{columns.map((status) => <section key={status}><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold">{status === "Confirmado" ? <Clock3 size={18}/> : status === "En preparación" ? <Flame size={18}/> : <CheckCircle2 size={18}/>} {status}</h2><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold">{orders.filter((order) => order.status === status).length}</span></div><div className="space-y-3">{orders.filter((order) => order.status === status).map((order) => <article key={order.id} className={`rounded-md border bg-white p-4 ${order.elapsed > order.estimate ? "border-[var(--coral)]" : "border-[var(--line)]"}`}><div className="flex items-start justify-between"><div><p className="text-xs text-[var(--muted)]">{order.id}</p><h3 className="text-xl font-bold">Mesa {order.table.replace("M", "")}</h3></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${order.elapsed > order.estimate ? "bg-[#fbe9e5] text-[var(--coral)]" : "bg-[var(--paper)]"}`}>{order.elapsed} / {order.estimate} min</span></div><ul className="my-4 space-y-2">{order.items.map((item) => <li key={item.productId}>{item.quantity} {item.name}</li>)}</ul>{order.note && <p className="mb-4 rounded-md bg-[#fff2cf] px-3 py-2 text-sm"><b>Nota:</b> {order.note}</p>}<div className="grid gap-2">{status !== "Listo" && nextOrderStatus[status] && <button disabled={Boolean(busy)} onClick={() => void advance(order)} className="w-full rounded-md bg-[var(--ink)] px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50">{status === "Confirmado" ? "Iniciar preparación" : "Marcar como listo"}</button>}{status === "Confirmado" && <button disabled={Boolean(busy)} onClick={() => openException(order, "Rechazado")} className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--coral)] px-3 py-2 text-sm font-bold text-[var(--coral)]"><Ban size={16}/> Rechazar pedido</button>}{role === "ADMIN" && status !== "Listo" && <button disabled={Boolean(busy)} onClick={() => openException(order, "Cancelado")} className="w-full px-3 py-2 text-sm font-bold text-[var(--muted)] underline">Cancelar pedido</button>}</div></article>)}</div></section>)}</div>}
    </main>{exception && <div className="fixed inset-0 z-50 grid place-items-center bg-[#10223599] p-4" onMouseDown={() => setException(null)}><form role="dialog" aria-modal="true" aria-label={`${exception.status} pedido ${exception.order.id}`} onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); void applyException(); }} className="w-full max-w-md rounded-md bg-white p-5 shadow-xl"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-[var(--muted)]">{exception.order.id} · Mesa {exception.order.table.replace("M", "")}</p><h2 className="text-xl font-bold">{exception.status === "Rechazado" ? "Rechazar pedido" : "Cancelar pedido"}</h2></div><button type="button" aria-label="Cerrar" onClick={() => setException(null)} className="grid h-9 w-9 place-items-center"><X size={20}/></button></div><label className="mt-5 block text-sm font-bold">Motivo<textarea autoFocus required minLength={5} maxLength={250} value={reason} onChange={event => setReason(event.target.value)} className="mt-2 h-28 w-full resize-none rounded-md border border-[var(--line)] p-3 font-normal" placeholder="Explique el motivo al cliente"/></label><p className="mt-2 text-xs text-[var(--muted)]">El motivo quedará registrado y se mostrará en el seguimiento del pedido.</p><div className="mt-5 flex gap-3"><button disabled={busy === exception.order.id || reason.trim().length < 5} type="submit" className="flex-1 rounded-md bg-[var(--coral)] px-4 py-3 font-bold text-white disabled:opacity-50">{busy === exception.order.id ? "Guardando..." : "Confirmar"}</button><button disabled={Boolean(busy)} type="button" onClick={() => setException(null)} className="rounded-md border border-[var(--line)] px-4 py-3 font-bold">Volver</button></div></form></div>}</div>;
}

