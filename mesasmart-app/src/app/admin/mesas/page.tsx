import Link from "next/link";
import { ArrowLeft, QrCode } from "lucide-react";
import { TableManager } from "@/components/table-manager";

export default function TablesPage() {
  return <div className="min-h-screen bg-[var(--paper)]"><header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-5"><Link href="/admin" title="Volver" className="grid h-9 w-9 place-items-center rounded-md border border-[var(--line)]"><ArrowLeft size={18}/></Link><span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--ink)] text-white"><QrCode size={19}/></span><div><b>Accesos por mesa</b><p className="text-xs text-[var(--muted)]">Generación segura de códigos QR</p></div></div></header><main className="mx-auto max-w-6xl px-5 py-7"><p className="text-sm font-bold text-[var(--teal)]">Configuración operativa</p><h1 className="mb-7 text-3xl font-bold">Códigos QR de las mesas</h1><TableManager/></main></div>;
}
