import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { AccountPassword } from "@/components/account-password";
import { requireStaff } from "@/lib/staff-auth";

export default async function AccountPage() {
  const session = await requireStaff(["ADMIN", "KITCHEN", "WAITER"]);
  const back = session.role === "ADMIN" ? "/admin" : session.role === "KITCHEN" ? "/cocina" : "/atencion";
  return <div className="min-h-screen bg-[var(--paper)]"><header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-5"><Link href={back} title="Volver" className="grid h-9 w-9 place-items-center rounded-md border border-[var(--line)]"><ArrowLeft size={18}/></Link><span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--ink)] text-white"><UserRound size={19}/></span><div><b>{session.username}</b><p className="text-xs text-[var(--muted)]">Seguridad de la cuenta</p></div></div></header><main className="mx-auto max-w-5xl px-5 py-7"><p className="text-sm font-bold text-[var(--teal)]">Cuenta personal</p><h1 className="mb-7 text-3xl font-bold">Seguridad de acceso</h1><AccountPassword/></main></div>;
}
