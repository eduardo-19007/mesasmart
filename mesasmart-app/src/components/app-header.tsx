import Link from "next/link";
import { ChefHat, LayoutDashboard, Utensils } from "lucide-react";

export function AppHeader({ table }: { table?: string }) {
  return <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/95 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6"><Link href={table ? "#" : "/"} className="flex items-center gap-2 font-bold"><span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--ink)] text-white"><Utensils size={19}/></span><span>MesaSmart</span></Link>{table ? <div className="text-right"><p className="text-xs text-[var(--muted)]">Sesión activa</p><p className="text-sm font-bold">Mesa {table.replace("M", "")}</p></div> : <nav className="flex gap-1"><Link title="Panel de cocina" href="/cocina" className="grid h-9 w-9 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--paper)]"><ChefHat size={19}/></Link><Link title="Administración" href="/admin" className="grid h-9 w-9 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--paper)]"><LayoutDashboard size={19}/></Link></nav>}</div></header>;
}
