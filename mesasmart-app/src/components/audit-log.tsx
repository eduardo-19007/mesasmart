"use client";
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";

type AuditEvent = { area: string; action: string; actor: string; target: string; metadata: Record<string, unknown>; occurredAt: string };
const labels: Record<string, string> = { STAFF_CREATED: "Usuario creado", STAFF_UPDATED: "Usuario actualizado", PASSWORD_CHANGED: "Contraseña propia cambiada", PRODUCT_CREATED: "Producto creado", PRODUCT_UPDATED: "Producto actualizado", TABLE_CREATED: "Mesa creada", TABLE_UPDATED: "Mesa actualizada" };

export function AuditLog() {
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [events, setEvents] = useState<AuditEvent[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); try { const response = await fetch("/api/admin/audit?page=" + page, { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setEvents(result.data); setHasMore(result.hasMore); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar la auditoría"); } finally { setLoading(false); } }, [page]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  return <section>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
      <span>Página {page}</span>
      <div className="flex gap-3">
        <button disabled={loading || page === 1} onClick={() => setPage(p => p - 1)} className="disabled:opacity-40">Anterior</button>
        <button disabled={loading || !hasMore} onClick={() => setPage(p => p + 1)} className="disabled:opacity-40">Siguiente</button>
        <button onClick={() => void load()} title="Actualizar auditoría" className="grid h-9 w-9 place-items-center rounded-md border"><RefreshCw size={17}/></button>
      </div>
    </div>
    {error && <p role="alert" className="mb-4 text-[var(--coral)]">{error}</p>}
    {loading ? <div className="grid h-40 place-items-center"><LoaderCircle className="animate-spin"/></div> : events.length === 0 ? <p>No existen eventos registrados.</p> :
      <div className="overflow-x-auto rounded-md border border-[var(--line)] bg-white"><table className="w-full min-w-[760px] text-left">
        <thead className="bg-[var(--ink)] text-sm text-white"><tr>{["Fecha", "Área", "Acción", "Responsable", "Elemento"].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
        <tbody>{events.map((event, index) => <tr key={`${event.occurredAt}-${index}`} className="border-b border-[var(--line)]"><td className="p-3 text-sm">{new Date(event.occurredAt).toLocaleString("es-PE", { timeZone: "America/Lima" })}</td><td className="p-3">{event.area}</td><td className="p-3 font-bold">{labels[event.action] ?? event.action}</td><td className="p-3">{event.actor}</td><td className="p-3">{event.target}</td></tr>)}</tbody>
      </table></div>}
  </section>;
}
