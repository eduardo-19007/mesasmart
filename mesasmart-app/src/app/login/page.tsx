import { Utensils } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const requested = (await searchParams).next;
  const nextPath = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/admin";
  return <main className="grid min-h-screen place-items-center bg-[var(--paper)] px-5"><section className="w-full max-w-sm rounded-md border border-[var(--line)] bg-white p-6"><span className="grid h-11 w-11 place-items-center rounded-md bg-[var(--ink)] text-white"><Utensils size={21}/></span><p className="mt-5 text-sm font-bold text-[var(--teal)]">Acceso del personal</p><h1 className="mt-1 text-2xl font-bold">Ingresar a MesaSmart</h1><p className="mt-2 text-sm text-[var(--muted)]">Utilice las credenciales asignadas según su función.</p><LoginForm nextPath={nextPath}/></section></main>;
}
