import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";

export function LogoutButton() {
  return <div className="flex gap-2"><Link href="/cuenta" title="Mi cuenta" className="grid h-9 w-9 place-items-center rounded-md border border-[var(--line)]"><UserRound size={17}/></Link><form action="/api/auth/logout" method="post"><button title="Cerrar sesión" className="grid h-9 w-9 place-items-center rounded-md border border-[var(--line)]"><LogOut size={17}/></button></form></div>;
}
