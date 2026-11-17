"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, House } from "lucide-react";

export function StaffNavigation({ role }: { role: "ADMIN" | "KITCHEN" | "WAITER" }) {
  const router = useRouter();
  const fallback = role === "ADMIN" ? "/admin" : "/cuenta";
  return <nav aria-label="Navegación del personal" className="flex flex-wrap items-center gap-2">
    <button type="button" onClick={() => {
      if (window.history.length > 1) router.back();
      else router.push(fallback);
    }} className="flex h-9 items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 text-sm font-bold">
      <ArrowLeft size={16}/> Volver
    </button>
    {role === "ADMIN" && <Link href="/admin" className="flex h-9 items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 text-sm font-bold"><House size={16}/> Inicio</Link>}
  </nav>;
}
