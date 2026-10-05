"use client";
import { FormEvent, useState } from "react";
import { Check, KeyRound, LoaderCircle } from "lucide-react";

export function AccountPassword() {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget; const values = new FormData(form);
    if (values.get("newPassword") !== values.get("confirmation")) { setError("La confirmación no coincide"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/account/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: values.get("currentPassword"), newPassword: values.get("newPassword") }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      form.reset(); setMessage("Contraseña actualizada. Las sesiones anteriores quedaron invalidadas.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cambiar la contraseña"); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="max-w-lg rounded-md border border-[var(--line)] bg-white p-5"><div className="flex items-center gap-3"><KeyRound className="text-[var(--teal)]"/><div><h2 className="font-bold">Cambiar contraseña</h2><p className="text-sm text-[var(--muted)]">Use al menos 12 caracteres y no comparta su clave.</p></div></div>{error && <p role="alert" className="mt-4 rounded-md bg-[#fbe9e5] p-3 text-sm text-[var(--coral)]">{error}</p>}{message && <p role="status" className="mt-4 flex gap-2 rounded-md bg-[var(--teal-soft)] p-3 text-sm text-[var(--teal)]"><Check size={17}/>{message}</p>}<label className="mt-5 block text-sm font-bold">Contraseña actual<input name="currentPassword" type="password" autoComplete="current-password" required minLength={8} maxLength={128} className="mt-2 h-11 w-full rounded-md border border-[var(--line)] px-3 font-normal"/></label><label className="mt-4 block text-sm font-bold">Nueva contraseña<input name="newPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} className="mt-2 h-11 w-full rounded-md border border-[var(--line)] px-3 font-normal"/></label><label className="mt-4 block text-sm font-bold">Confirmar nueva contraseña<input name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} className="mt-2 h-11 w-full rounded-md border border-[var(--line)] px-3 font-normal"/></label><button disabled={busy} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--ink)] font-bold text-white disabled:opacity-50">{busy ? <LoaderCircle className="animate-spin" size={18}/> : <KeyRound size={18}/>} Guardar contraseña</button></form>;
}
