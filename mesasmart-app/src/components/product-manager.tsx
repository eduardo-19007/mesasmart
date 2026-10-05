"use client";
/* eslint-disable @next/next/no-img-element */
import { FormEvent, useEffect, useState } from "react";
import { Plus, Pencil, X } from "lucide-react";
import type { MenuItem } from "@/lib/data";
const blank: MenuItem = { id: "", name: "", description: "", category: "Fondos", price: 1, minutes: 10, image: "", available: true };

export function ProductManager() {
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    try {
      const r = await fetch("/api/admin/products", { cache: "no-store" });
      const result = await r.json(); if (!r.ok) throw new Error(result.error);
      setProducts(result.data);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo conectar"); }
    finally { setLoading(false); }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/products" + (isNew ? "" : "/" + editing.id), {
        method: isNew ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing),
      });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setEditing(null); setMessage("Producto guardado."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar"); }
    finally { setBusy(false); }
  }
  const input = "mt-1 w-full rounded-md border border-[var(--line)] bg-white p-2";
  return <section><button onClick={() => { setEditing({ ...blank }); setIsNew(true); setError(""); }} className="mb-5 flex items-center gap-2 rounded-md bg-[var(--teal)] px-4 py-3 font-bold text-white"><Plus size={18}/> Nuevo producto</button>
    {error && <p role="alert" className="mb-4 text-[var(--coral)]">{error}</p>}
    {message && <p role="status" className="mb-4 text-[var(--teal)]">{message}</p>}
    {loading && <p>Cargando carta...</p>}
    {!loading && !products.length && <p>No hay productos registrados.</p>}
    <div className="grid gap-4 sm:grid-cols-2">{products.map(product => <article key={product.id} className="flex gap-4 rounded-md border border-[var(--line)] bg-white p-4">
      <img src={product.image} alt={product.name} className="h-20 w-20 shrink-0 rounded-md object-cover"/>
      <div className="min-w-0 flex-1"><p className="text-xs text-[var(--teal)]">{product.category}</p><h2 className="font-bold">{product.name}</h2><p className="mt-2">S/ {product.price.toFixed(2)} · {product.minutes} min</p><p className="text-sm text-[var(--muted)]">{product.available ? "Disponible" : "No disponible"}</p></div>
      <button title={"Editar " + product.name} onClick={() => { setEditing({ ...product }); setIsNew(false); setError(""); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[var(--line)]"><Pencil size={18}/></button>
    </article>)}</div>
    {editing && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><form onSubmit={save} role="dialog" aria-modal="true" aria-label={isNew ? "Nuevo producto" : "Editar producto"} className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-md bg-white p-5">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">{isNew ? "Nuevo producto" : "Editar producto"}</h2><button type="button" disabled={busy} title="Cerrar editor" onClick={() => setEditing(null)}><X size={20}/></button></div>
      {error && <p role="alert" className="mb-3 text-[var(--coral)]">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label>Identificador<input required disabled={!isNew} pattern="[a-z0-9-]{2,40}" className={input} value={editing.id} onChange={e => setEditing({ ...editing, id: e.target.value })}/></label>
        <label>Nombre<input required minLength={3} maxLength={80} className={input} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}/></label>
        <label className="sm:col-span-2">Descripción<textarea required minLength={5} maxLength={240} className={input} value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })}/></label>
        <label>Categoría<select className={input} value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value as MenuItem["category"] })}>{["Entradas","Fondos","Bebidas","Postres"].map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Precio S/<input required type="number" min="0.01" max="999" step="0.01" className={input} value={editing.price} onChange={e => setEditing({ ...editing, price: Number(e.target.value) })}/></label>
        <label>Tiempo en minutos<input required type="number" min="1" max="180" step="1" className={input} value={editing.minutes} onChange={e => setEditing({ ...editing, minutes: Number(e.target.value) })}/></label>
        <label className="flex items-center gap-3"><input type="checkbox" checked={editing.available} disabled={isNew} onChange={e => setEditing({ ...editing, available: e.target.checked })}/> Disponible</label>
        <label className="sm:col-span-2">Imagen (URL HTTPS)<input required type="url" pattern="https://.*" maxLength={500} className={input} value={editing.image} onChange={e => setEditing({ ...editing, image: e.target.value })}/></label>
      </div><button disabled={busy} className="mt-5 rounded-md bg-[var(--teal)] px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? "Guardando..." : "Guardar producto"}</button>
    </form></div>}
  </section>;
}
