import Link from "next/link";
import { ArrowLeft, ScrollText } from "lucide-react";
import { AuditLog } from "@/components/audit-log";

export default function AuditPage() {
  return <div className="min-h-screen bg-[var(--paper)]"><header className="border-b border-[var(--line)] bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-5"><Link href="/admin" title="Volver" className="grid h-9 w-9 place-items-center rounded-md border border-[var(--line)]"><ArrowLeft size={18}/></Link><span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--ink)] text-white"><ScrollText size={19}/></span><div><b>Auditoría</b><p className="text-xs text-[var(--muted)]">Trazabilidad administrativa</p></div></div></header><main className="mx-auto max-w-7xl px-5 py-7"><p className="text-sm font-bold text-[var(--teal)]">Control interno</p><h1 className="mb-7 text-3xl font-bold">Registro de cambios</h1><AuditLog/></main></div>;
}
