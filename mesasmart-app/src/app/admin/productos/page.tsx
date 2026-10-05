import Link from "next/link";
import { ArrowLeft, UtensilsCrossed } from "lucide-react";
import { ProductManager } from "@/components/product-manager";

export default function ProductsPage() {
  return <div className="min-h-screen bg-[var(--paper)]"><header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-5"><Link href="/admin" title="Volver" className="grid h-9 w-9 place-items-center rounded-md border border-[var(--line)]"><ArrowLeft size={18}/></Link><span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--ink)] text-white"><UtensilsCrossed size={19}/></span><div><b>Catálogo</b><p className="text-xs text-[var(--muted)]">Precios, tiempos y disponibilidad</p></div></div></header><main className="mx-auto max-w-6xl px-5 py-7"><p className="text-sm font-bold text-[var(--teal)]">Administración</p><h1 className="mb-2 text-3xl font-bold">Gestión de la carta</h1><p className="mb-7 text-sm text-[var(--muted)]">Los cambios se aplican inmediatamente a la carta digital y quedan registrados.</p><ProductManager/></main></div>;
}
