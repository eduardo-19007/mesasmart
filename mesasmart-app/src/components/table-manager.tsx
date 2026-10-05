"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, LoaderCircle, Plus, Power, QrCode, RefreshCw, Save } from "lucide-react";

type AccessData = { table: string; accessUrl: string; qrDataUrl: string; expiresAt: string };
type DiningTable = { id: string; code: string; capacity: number; active: boolean };

export function TableManager() {
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selected, setSelected] = useState("");
  const [access, setAccess] = useState<AccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/tables", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setTables(result.data);
      setSelected(current => current || result.data.find((table: DiningTable) => table.active)?.code || result.data[0]?.code || "");
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar las mesas"); }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function generate() {
    if (!selected || busy) return;
    setBusy("qr"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/table-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table: selected, lifetimeMinutes: 720 }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setAccess(result.data); setMessage(`Acceso de ${selected} generado.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo generar el acceso"); }
    finally { setBusy(""); }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget; const values = new FormData(form);
    setBusy("create"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/tables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: values.get("code"), capacity: Number(values.get("capacity")) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      form.reset(); setSelected(result.data.code); setAccess(null); setMessage(`Mesa ${result.data.code.slice(1)} creada.`); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear la mesa"); }
    finally { setBusy(""); }
  }

  async function update(table: DiningTable, changes: Partial<Pick<DiningTable, "capacity" | "active">>) {
    if (busy) return;
    setBusy(table.id); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/tables/${table.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setTables(current => current.map(item => item.id === table.id ? result.data : item));
      if (!result.data.active && selected === table.code) { setAccess(null); setSelected(""); }
      setMessage(`Mesa ${table.code.slice(1)} actualizada.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar la mesa"); }
    finally { setBusy(""); }
  }

  const current = tables.find(table => table.code === selected);
  return <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
    <section>
      <form onSubmit={create} className="mb-5 grid gap-3 rounded-md border border-[var(--line)] bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="text-sm font-bold">Código<input name="code" required pattern="M(0[1-9]|[1-9][0-9])" placeholder="M13" className="mt-2 h-11 w-full rounded-md border border-[var(--line)] px-3 font-normal uppercase"/></label><label className="text-sm font-bold">Capacidad<input name="capacity" type="number" required min="1" max="30" defaultValue="4" className="mt-2 h-11 w-full rounded-md border border-[var(--line)] px-3 font-normal"/></label><button disabled={Boolean(busy)} className="flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--teal)] px-4 font-bold text-white disabled:opacity-50"><Plus size={18}/> Crear mesa</button></form>
      {error && <p role="alert" className="mb-4 rounded-md bg-[#fbe9e5] p-3 text-sm text-[var(--coral)]">{error}</p>}{message && <p role="status" className="mb-4 flex items-center gap-2 rounded-md bg-[var(--teal-soft)] p-3 text-sm text-[var(--teal)]"><Check size={17}/>{message}</p>}
      {loading ? <div className="grid h-44 place-items-center"><LoaderCircle className="animate-spin"/></div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{tables.map(table => <article key={table.id} className={`rounded-md border bg-white p-4 ${selected === table.code ? "border-[var(--teal)]" : "border-[var(--line)]"}`}><button disabled={Boolean(busy) || !table.active} onClick={() => { setSelected(table.code); setAccess(null); }} className="w-full text-left disabled:cursor-not-allowed"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Mesa {table.code.slice(1)}</h2><span className={`rounded-full px-2 py-1 text-xs font-bold ${table.active ? "bg-[var(--teal-soft)] text-[var(--teal)]" : "bg-[#edf0f2] text-[var(--muted)]"}`}>{table.active ? "Activa" : "Inactiva"}</span></div></button><div className="mt-4 flex items-end gap-2"><label className="min-w-0 flex-1 text-xs font-bold text-[var(--muted)]">Capacidad<input aria-label={`Capacidad de ${table.code}`} type="number" min="1" max="30" defaultValue={table.capacity} disabled={busy === table.id} className="mt-1 h-9 w-full rounded-md border border-[var(--line)] px-2 text-[var(--ink)]" onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void update(table, { capacity: Number(event.currentTarget.value) }); } }}/></label><button title="Guardar capacidad" aria-label={`Guardar capacidad de ${table.code}`} disabled={Boolean(busy)} onClick={event => { const input = event.currentTarget.parentElement?.querySelector("input") as HTMLInputElement | null; if (input) void update(table, { capacity: Number(input.value) }); }} className="grid h-9 w-9 place-items-center rounded-md border border-[var(--line)]"><Save size={16}/></button><button title={table.active ? "Desactivar mesa" : "Activar mesa"} aria-label={`${table.active ? "Desactivar" : "Activar"} ${table.code}`} disabled={Boolean(busy)} onClick={() => void update(table, { active: !table.active })} className="grid h-9 w-9 place-items-center rounded-md border border-[var(--line)]"><Power size={16}/></button></div></article>)}</div>}
      <button onClick={() => void generate()} disabled={Boolean(busy) || !current?.active} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--ink)] font-bold text-white disabled:opacity-50">{busy === "qr" ? <LoaderCircle className="animate-spin" size={19}/> : access ? <RefreshCw size={19}/> : <QrCode size={19}/>} {access ? "Renovar acceso" : selected ? `Generar QR de ${selected}` : "Seleccione una mesa activa"}</button>
    </section>
    <aside className="flex min-h-96 flex-col items-center justify-center rounded-md border border-[var(--line)] bg-white p-6 text-center">{access ? <><img src={access.qrDataUrl} alt={`Código QR de la mesa ${access.table.slice(1)}`} className="aspect-square w-full max-w-64"/><h2 className="mt-4 text-xl font-bold">Mesa {access.table.slice(1)}</h2><p className="mt-1 text-sm text-[var(--muted)]">Válido hasta {new Date(access.expiresAt).toLocaleString("es-PE")}</p><a download={`MesaSmart-${access.table}.png`} href={access.qrDataUrl} className="mt-4 underline">Descargar QR</a><a href={access.accessUrl} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-2 font-bold text-[var(--teal)]">Probar acceso <ExternalLink size={16}/></a></> : <><QrCode size={48} className="text-[var(--line)]"/><p className="mt-4 font-bold">Código pendiente</p><p className="mt-1 text-sm text-[var(--muted)]">Seleccione una mesa activa y genere su acceso.</p></>}</aside>
  </div>;
}

