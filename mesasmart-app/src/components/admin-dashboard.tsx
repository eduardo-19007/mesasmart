"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { LogoutButton } from "./logout-button";

type Metrics = { ordersToday: number; medianMinutes: number | null; completedOrders: number; activeOrders: number; delayedOrders: number; availableProducts: number; hourlyOrders: { hour: number; count: number }[] };
export function AdminDashboard() {
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/metrics?" + new URLSearchParams({ from, to }), { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result.data); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo conectar"); }
  }, [from, to]);
  // The initial request synchronizes the view with the server.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); const timer = setInterval(() => { void load(); }, 10000); return () => clearInterval(timer); }, [load]);
  const cards = data ? [
    ["Pedidos del periodo", data.ordersToday], ["Mediana hasta listo", data.medianMinutes === null ? "Sin datos" : data.medianMinutes + " min"],
    ["En cocina ahora", data.activeOrders], ["Cerrados del periodo", data.completedOrders],
  ] : [];
  return <main className="mx-auto max-w-7xl p-5"><header className="mb-6 flex items-center justify-between gap-4"><div><p className="text-sm text-[var(--teal)]">MesaSmart · Administración</p><h1 className="mt-1 text-3xl font-bold">Resumen del restaurante</h1></div><LogoutButton/></header>
    <nav className="mb-6 flex flex-wrap gap-3">{[["/admin/productos","Carta"],["/admin/personal","Personal"],["/admin/mesas","Mesas y QR"],["/admin/auditoria","Auditoría"],["/cocina","Cocina"],["/atencion","Atención"]].map(([href,label]) => <Link key={href} href={href} className="rounded-md border border-[var(--line)] bg-white px-4 py-2 font-bold">{label}</Link>)}<button onClick={() => void load()} title="Actualizar indicadores" className="px-3"><RefreshCw size={18}/></button></nav>
    {error && <p role="alert" className="mb-4 text-[var(--coral)]">{error}</p>}
    <div className="mb-6 flex flex-wrap gap-4"><label>Desde<input aria-label="Desde" type="date" value={from} onChange={e => setFrom(e.target.value)} className="ml-2 rounded border p-2"/></label><label>Hasta<input aria-label="Hasta" type="date" value={to} onChange={e => setTo(e.target.value)} className="ml-2 rounded border p-2"/></label></div>
    {!data && !error && <p role="status">Cargando indicadores...</p>}
    {data && <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label,value]) => <article key={label} className="rounded-md border border-[var(--line)] bg-white p-5"><h2 className="text-sm text-[var(--muted)]">{label}</h2><p className="mt-3 text-2xl font-bold">{value}</p></article>)}</div>
      <section className="mt-8"><h2 className="text-xl font-bold">Pedidos por hora · Lima</h2><div className="mt-4 overflow-x-auto"><div className="flex h-64 min-w-[650px] items-end gap-2 border-b border-[var(--line)]">{data.hourlyOrders.map(({hour,count}) => <div key={hour} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"><span className="mb-1 text-xs">{count}</span><div className="bg-[var(--teal)]" style={{ height: count ? 180 * count / Math.max(1,...data.hourlyOrders.map(x => x.count)) : 0 }}/><span className="mt-2 text-xs">{hour}</span></div>)}</div></div></section>
      <section className="mt-8 border-t border-[var(--line)] pt-5"><h2 className="font-bold">Control operativo</h2><p className="mt-3">Productos disponibles: {data.availableProducts}</p><p>Pedidos activos fuera del tiempo estimado: {data.delayedOrders}</p></section>
    </>}
  </main>;
}



