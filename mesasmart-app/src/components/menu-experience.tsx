"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Minus, Plus, Search, ShoppingBag, Sparkles, X } from "lucide-react";
import { AppHeader } from "./app-header";
import { Category, MenuItem } from "@/lib/data";
import { createIdempotencyKey } from "@/lib/idempotency";

import { OrderTracker } from "./order-tracker";

type Cart = Record<string, number>;
const categories: Array<"Todos" | Category> = ["Todos", "Entradas", "Fondos", "Bebidas", "Postres"];

export function MenuExperience({ table, accessToken }: { table: string; accessToken?: string }) {
  const [category, setCategory] = useState<(typeof categories)[number]>("Todos");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Cart>({});
  const [open, setOpen] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [menuError, setMenuError] = useState("");
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [priceChange, setPriceChange] = useState<{ previous: number; current: number } | null>(null);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const pendingKey = `mesasmart:pending:${table}:${accessToken ?? "demo"}`;
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(pendingKey);
      if (saved) queueMicrotask(() => setPending(saved));
    } catch { /* Submission will report unavailable storage before sending. */ }
  }, [pendingKey]);
  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/menu", { cache: "no-store", signal: abort.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(result => setProducts(result.data))
      .catch(() => { if (!abort.signal.aborted) setMenuError("No se pudo cargar la carta."); })
      .finally(() => { if (!abort.signal.aborted) setLoadingMenu(false); });
    return () => abort.abort();
  }, []);
  const filtered = products.filter((item) => (category === "Todos" || item.category === category) && item.name.toLowerCase().includes(query.toLowerCase()));
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = products.reduce((sum, item) => sum + item.price * (cart[item.id] ?? 0), 0);
  const estimate = useMemo(() => Math.max(1, ...products.filter((item) => cart[item.id]).map((item) => item.minutes)), [cart, products]);
  const change = (id: string, delta: number) => { setPriceChange(null); setCart((current) => ({ ...current, [id]: Math.min(20, Math.max(0, (current[id] ?? 0) + delta)) })); };

  async function submitOrder() {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = { table, note: note || undefined, expectedTotalCents: Math.round(total * 100), items: Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([productId, quantity]) => ({ productId, quantity, expectedUnitPriceCents: Math.round((products.find(p => p.id === productId)?.price ?? 0) * 100) })) };
      const fingerprint = JSON.stringify(payload);
      if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: createIdempotencyKey() };
      const body = pending ?? JSON.stringify({ ...payload, idempotencyKey: attempt.current.key });
      // Persist before sending: a reload must replay the exact intent and key.
      localStorage.setItem(pendingKey, body);
      setPending(body);
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accessToken ? { "X-Table-Token": accessToken } : {}) },
        body,
      });
      const result = await response.json();
      if (response.status >= 400 && response.status < 500) {
        localStorage.removeItem(pendingKey); setPending(null);
      }
      if (response.status === 409 && ["PRICE_CHANGED", "PRODUCT_UNAVAILABLE"].includes(result.code)) {
        const submitted = JSON.parse(body) as { items: Array<{ productId: string; quantity: number }>; note?: string; expectedTotalCents: number };
        setCart(Object.fromEntries(submitted.items.map(item => [item.productId, item.quantity])));
        setNote(submitted.note ?? "");
        setOpen(true);
        const menuResponse = await fetch("/api/menu", { cache: "no-store" });
        const menuResult = await menuResponse.json();
        if (!menuResponse.ok) throw new Error("El precio cambió, pero no se pudo actualizar la carta.");
        const available = menuResult.data as MenuItem[];
        const remaining = submitted.items.filter(item => available.some(p => p.id === item.productId));
        setCart(Object.fromEntries(remaining.map(item => [item.productId, item.quantity])));
        const current = remaining.reduce((sum, item) => sum + available.find(p => p.id === item.productId)!.price * item.quantity, 0);
        setProducts(available); setPriceChange(current !== submitted.expectedTotalCents / 100 ? { previous: submitted.expectedTotalCents / 100, current } : null); attempt.current = null;
        const details = (result.details?.changes ?? []) as Array<{ name: string; previousCents?: number; currentCents: number }>;
        setError(result.code === "PRODUCT_UNAVAILABLE" ? "Se retiraron los productos agotados. Revise el pedido antes de confirmar." : "Precios actualizados: " + details.map(p => `${p.name}: ${p.previousCents === undefined ? "sin confirmar" : `S/ ${(p.previousCents / 100).toFixed(2)}`} a S/ ${(p.currentCents / 100).toFixed(2)}`).join("; ") + ". Revise y confirme nuevamente.");
        return;
      }
      if (!response.ok) throw new Error(result.error ?? "No se pudo registrar el pedido");
      localStorage.removeItem(pendingKey); setPending(null);
      const url = new URL(window.location.href);
      url.searchParams.set("order", result.data.id);
      window.location.replace(url.toString());
      setOrderId(result.data.id);
      setOpen(false);
      setOrdered(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo registrar el pedido"); }
    finally { setSubmitting(false); }
  }

  if (ordered) return <OrderTracker id={orderId} table={table} accessToken={accessToken} onBack={() => { setOrdered(false); setCart({}); setNote(""); attempt.current = null; }}/>;
  if (pending) return <main className="mx-auto max-w-lg p-6"><h1 className="text-xl font-bold">Confirmación pendiente</h1><p className="my-4">Compruebe el resultado del último envío antes de realizar otro pedido.</p>{error && <p role="alert">{error}</p>}<button disabled={submitting} onClick={() => void submitOrder()} className="mt-4 rounded-md bg-[var(--teal)] p-3 text-white">{submitting ? "Comprobando..." : "Comprobar pedido"}</button></main>;
  if (loadingMenu || menuError) return <><AppHeader table={table}/><main className="p-6 text-center"><p role={menuError ? "alert" : "status"}>{menuError || "Cargando carta..."}</p>{menuError && <button className="mt-4 underline" onClick={() => window.location.reload()}>Reintentar</button>}</main></>;

  return <div className="min-h-screen bg-[var(--paper)] pb-28"><AppHeader table={table}/><main className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><section className="mb-6 flex flex-col gap-5 border-b border-[var(--line)] pb-6 md:flex-row md:items-end md:justify-between"><div><p className="mb-1 text-sm font-bold text-[var(--teal)]">Carta digital</p><h1 className="text-3xl font-bold sm:text-4xl">¿Qué te provoca hoy?</h1><p className="mt-2 text-sm text-[var(--muted)]">Precios y disponibilidad actualizados.</p></div><label className="flex h-11 items-center gap-3 rounded-md border border-[var(--line)] bg-white px-3 md:w-80"><Search size={18} className="text-[var(--muted)]"/><input aria-label="Buscar en la carta" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar en la carta" className="min-w-0 flex-1 outline-none"/></label></section><div className="scrollbar-none mb-6 flex gap-2 overflow-x-auto pb-1">{categories.map((item)=><button key={item} onClick={()=>setCategory(item)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${category===item?"border-[var(--ink)] bg-[var(--ink)] text-white":"border-[var(--line)] bg-white"}`}>{item}</button>)}</div>{filtered.length === 0 && <p role="status">No hay productos disponibles para esta búsqueda.</p>}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((item)=><article key={item.id} className="overflow-hidden rounded-md border border-[var(--line)] bg-white"><div className="relative aspect-[4/3] overflow-hidden bg-[#e9edef]"><img src={item.image} alt={item.name} className="h-full w-full object-cover"/>{item.tag&&<span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-bold shadow-sm">{item.tag}</span>}</div><div className="p-4"><div className="flex items-start justify-between gap-3"><h2 className="font-bold">{item.name}</h2><span className="shrink-0 font-bold">S/ {item.price.toFixed(2)}</span></div><p className="mt-2 min-h-10 text-sm leading-5 text-[var(--muted)]">{item.description}</p><div className="mt-4 flex items-center justify-between"><span className="text-xs text-[var(--muted)]">~ {item.minutes} min</span>{cart[item.id]?<div className="flex items-center gap-3"><button aria-label={`Quitar ${item.name}`} onClick={()=>change(item.id,-1)} className="grid h-9 w-9 place-items-center rounded-md border border-[var(--line)]"><Minus size={16}/></button><b>{cart[item.id]}</b><button aria-label={`Agregar ${item.name}`} onClick={()=>change(item.id,1)} className="grid h-9 w-9 place-items-center rounded-md bg-[var(--ink)] text-white"><Plus size={16}/></button></div>:<button onClick={()=>change(item.id,1)} className="flex h-9 items-center gap-2 rounded-md bg-[var(--teal)] px-3 text-sm font-bold text-white"><Plus size={16}/> Agregar</button>}</div></div></article>)}</div></main>
  {count>0&&<div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-white px-4 pt-3"><div className="mx-auto flex max-w-7xl items-center gap-4"><div className="hidden sm:block"><p className="text-xs text-[var(--muted)]">{count} productos</p><p className="font-bold">S/ {total.toFixed(2)}</p></div><button onClick={()=>setOpen(true)} className="flex h-12 flex-1 items-center justify-between rounded-md bg-[var(--coral)] px-4 font-bold text-white"><span className="flex items-center gap-2"><ShoppingBag size={19}/> Revisar pedido</span><span className="flex items-center">S/ {total.toFixed(2)} <ChevronRight size={18}/></span></button></div></div>}
  {open&&<div className="fixed inset-0 z-50 bg-[#10223599]" onClick={()=>setOpen(false)}><aside onClick={(e)=>e.stopPropagation()} className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-xl"><div className="flex items-center justify-between border-b border-[var(--line)] p-5"><div><p className="text-sm text-[var(--muted)]">Mesa {table.replace("M","")}</p><h2 className="text-xl font-bold">Tu pedido</h2></div><button aria-label="Cerrar" onClick={()=>setOpen(false)} className="grid h-9 w-9 place-items-center rounded-md hover:bg-[var(--paper)]"><X/></button></div><div className="flex-1 overflow-auto p-5">{products.filter((item)=>cart[item.id]).map((item)=><div key={item.id} className="flex gap-3 border-b border-[var(--line)] py-4"><img src={item.image} alt="" className="h-16 w-16 rounded-md object-cover"/><div className="min-w-0 flex-1"><p className="font-bold">{item.name}</p><p className="text-sm text-[var(--muted)]">{cart[item.id]} x S/ {item.price.toFixed(2)}</p></div><b>S/ {(item.price*cart[item.id]).toFixed(2)}</b></div>)}<label className="mt-5 block text-sm font-bold">Observaciones<textarea maxLength={250} value={note} onChange={(event)=>setNote(event.target.value)} placeholder="Ej. sin cebolla, alergias..." className="mt-2 h-24 w-full resize-none rounded-md border border-[var(--line)] p-3 font-normal outline-none focus:border-[var(--teal)]"/></label><div className="mt-5 flex items-start gap-3 rounded-md bg-[var(--teal-soft)] p-4"><Sparkles className="mt-0.5 shrink-0 text-[var(--teal)]" size={18}/><p className="text-sm">Tiempo orientativo: <b>{estimate} minutos</b>. Puede variar durante el servicio.</p></div></div><div className="safe-bottom border-t border-[var(--line)] p-5"><div className="mb-4 flex justify-between text-lg font-bold"><span>Total</span><span>S/ {total.toFixed(2)}</span></div>{priceChange&&<div className="mb-3 rounded-md bg-[#fff2cf] p-3 text-sm"><b>El total cambió:</b> S/ {priceChange.previous.toFixed(2)} → S/ {priceChange.current.toFixed(2)}. Confirme el nuevo importe para continuar.</div>}{error&&<p role="alert" className="mb-3 text-sm text-[var(--coral)]">{error}</p>}<button disabled={submitting} onClick={()=>void submitOrder()} className="h-12 w-full rounded-md bg-[var(--coral)] font-bold text-white disabled:opacity-60">{submitting?"Registrando...":priceChange?"Aceptar nuevo total y pedir":"Confirmar pedido"}</button></div></aside></div>}</div>;
}


