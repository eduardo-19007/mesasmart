"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, KeyRound, LoaderCircle, UserPlus, UserRoundX } from "lucide-react";

type Role = "ADMIN" | "KITCHEN" | "WAITER";
type Staff = { id: string; username: string; role: Role; active: boolean; lastLoginAt: string | null };

export function StaffManager() {
  const [resetUser, setResetUser] = useState<Staff | null>(null);
  const [resetValue, setResetValue] = useState("");
  const [users, setUsers] = useState<Staff[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/staff", { cache: "no-store" });
      const result = await response.json();
      if (response.ok) setUsers(result.data); else setError(result.error || "No se pudo cargar el personal.");
    } catch { setError("No se pudo conectar con el servidor."); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(""); setMessage("");
    try {
    const form = event.currentTarget; const values = new FormData(form);
    const response = await fetch("/api/admin/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: values.get("username"), password: values.get("password"), role: values.get("role") }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error); return; }
    form.reset(); setMessage(`Usuario ${result.data.username} creado correctamente.`); await load();
    } catch { setError("No se pudo crear el usuario. Compruebe la conexion."); }
    finally { setBusy(false); }
  }

  async function update(id: string, change: Partial<Pick<Staff, "role" | "active">> & { password?: string }) {
    if (busy) return false;
    setBusy(true); setError(""); setMessage("");
    try {
    const response = await fetch(`/api/admin/staff/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(change) });
    const result = await response.json();
    if (!response.ok) { setError(result.error); return false; }
    setMessage(`Usuario ${result.data.username} actualizado.`); await load(); return true;
    } catch { setError("No se pudo actualizar el usuario. Compruebe la conexion."); return false; }
    finally { setBusy(false); }
  }

  function resetPassword(user: Staff) {
    setResetValue(""); setResetUser(user);
  }

  return <><div className="grid gap-6 xl:grid-cols-[360px_1fr]">
    <form onSubmit={create} className="h-fit rounded-md border border-[var(--line)] bg-white p-5"><div className="flex items-center gap-3"><UserPlus className="text-[var(--teal)]"/><div><h2 className="font-bold">Nuevo usuario</h2><p className="text-sm text-[var(--muted)]">Asigne acceso según la función.</p></div></div><label className="mt-5 block text-sm font-bold">Usuario<input name="username" required pattern="[a-zA-Z0-9._-]{3,30}" className="mt-2 h-11 w-full rounded-md border border-[var(--line)] px-3 font-normal"/></label><label className="mt-4 block text-sm font-bold">Contraseña temporal<input name="password" type="password" required minLength={12} className="mt-2 h-11 w-full rounded-md border border-[var(--line)] px-3 font-normal"/></label><label className="mt-4 block text-sm font-bold">Rol<select name="role" className="mt-2 h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 font-normal"><option value="KITCHEN">Cocina</option><option value="WAITER">Atención</option><option value="ADMIN">Administrador</option></select></label><button disabled={busy} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--ink)] font-bold text-white"><UserPlus size={18}/> Crear usuario</button></form>
    <section><div className="mb-4"><h2 className="text-xl font-bold">Personal registrado</h2><p className="text-sm text-[var(--muted)]">Los cambios de acceso quedan registrados en auditoría.</p></div>{error && <p role="alert" className="mb-3 rounded-md bg-[#fbe9e5] p-3 text-sm text-[var(--coral)]">{error}</p>}{message && <p className="mb-3 flex items-center gap-2 rounded-md bg-[var(--teal-soft)] p-3 text-sm text-[var(--teal)]"><Check size={17}/>{message}</p>}{loading ? <div className="grid h-44 place-items-center"><LoaderCircle className="animate-spin"/></div> : <div className="overflow-x-auto rounded-md border border-[var(--line)] bg-white"><table className="w-full min-w-[680px] text-left"><thead className="border-b border-[var(--line)] bg-[var(--paper)] text-xs uppercase text-[var(--muted)]"><tr><th className="p-3">Usuario</th><th className="p-3">Rol</th><th className="p-3">Último ingreso</th><th className="p-3">Estado</th><th className="p-3 text-right">Acciones</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-[var(--line)] last:border-0"><td className="p-3 font-bold">{user.username}</td><td className="p-3"><select disabled={busy} aria-label={`Rol de ${user.username}`} value={user.role} onChange={(event) => void update(user.id, { role: event.target.value as Role })} className="h-9 rounded-md border border-[var(--line)] bg-white px-2"><option value="ADMIN">Administrador</option><option value="KITCHEN">Cocina</option><option value="WAITER">Atención</option></select></td><td className="p-3 text-sm text-[var(--muted)]">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("es-PE") : "Nunca"}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${user.active ? "bg-[var(--teal-soft)] text-[var(--teal)]" : "bg-[#edf0f2] text-[var(--muted)]"}`}>{user.active ? "Activo" : "Inactivo"}</span></td><td className="p-3"><div className="flex justify-end gap-2"><button disabled={busy} onClick={() => resetPassword(user)} title="Restablecer contraseña" className="grid h-9 w-9 place-items-center rounded-md border border-[var(--line)]"><KeyRound size={16}/></button><button disabled={busy} onClick={() => void update(user.id, { active: !user.active })} title={user.active ? "Desactivar usuario" : "Activar usuario"} className="grid h-9 w-9 place-items-center rounded-md border border-[var(--line)]"><UserRoundX size={16}/></button></div></td></tr>)}</tbody></table></div>}</section>
  </div>{resetUser && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><form role="dialog" aria-modal="true" aria-label="Restablecer contraseña" className="w-full max-w-sm rounded-md bg-white p-5" onSubmit={async event => { event.preventDefault(); if (await update(resetUser.id, { password: resetValue })) { setResetValue(""); setResetUser(null); } }}><h2 className="font-bold">Contraseña de {resetUser.username}</h2><input aria-label="Nueva contraseña" autoFocus type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={resetValue} onChange={event => setResetValue(event.target.value)} className="my-4 h-11 w-full rounded-md border p-2"/><div className="flex gap-3"><button disabled={busy} type="submit" className="rounded-md bg-[var(--teal)] px-4 py-2 text-white">Guardar</button><button disabled={busy} type="button" onClick={() => setResetUser(null)}>Cancelar</button></div></form></div>}</>;
}
