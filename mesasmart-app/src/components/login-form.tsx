"use client";
import { FormEvent, useState } from "react";
import { LoaderCircle, LockKeyhole, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error); setLoading(false); return; }
    const home = result.data.role === "ADMIN" ? "/admin" : result.data.role === "KITCHEN" ? "/cocina" : "/atencion";
    router.replace(result.data.role === "ADMIN" && /^\/admin(?:\/|$)/.test(nextPath) ? nextPath : home); router.refresh();
    } catch { setError("No se pudo conectar. Intente nuevamente."); }
    finally { setLoading(false); }
  }
  return <form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-bold">Usuario<input name="username" autoComplete="username" required className="mt-2 h-11 w-full rounded-md border border-[var(--line)] px-3 font-normal outline-none focus:border-[var(--teal)]"/></label><label className="block text-sm font-bold">Contraseña<input name="password" type="password" autoComplete="current-password" required minLength={8} className="mt-2 h-11 w-full rounded-md border border-[var(--line)] px-3 font-normal outline-none focus:border-[var(--teal)]"/></label>{error && <p role="alert" className="rounded-md bg-[#fbe9e5] p-3 text-sm text-[var(--coral)]">{error}</p>}<button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[var(--ink)] font-bold text-white disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" size={19}/> : <LogIn size={19}/>} Ingresar</button><p className="flex items-center justify-center gap-2 text-xs text-[var(--muted)]"><LockKeyhole size={14}/> Sesión protegida con cookie segura</p></form>;
}
