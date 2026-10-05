import { RecoverableMenu } from "@/components/recoverable-menu";
import { getDatabase } from "@/lib/server-db";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { validTableSession } from "@/lib/table-sessions";
import { getOrderRepository } from "@/lib/server-order-repository";

export default async function TablePage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ token?: string }> }) {
  const { code } = await params;
  const table = code.toUpperCase();
  const { token } = await searchParams;
  const session = await validTableSession(token, table, true);
  if (!session) {
    return <main className="grid min-h-screen place-items-center bg-[var(--paper)] px-5"><section className="max-w-md text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#fbe9e5] text-[var(--coral)]"><LockKeyhole size={26}/></span><h1 className="mt-5 text-2xl font-bold">Acceso no válido</h1><p className="mt-2 text-[var(--muted)]">El código QR venció, fue alterado o no corresponde a esta mesa. Solicite un nuevo acceso al personal.</p><Link href="/" className="mt-6 inline-block font-bold text-[var(--teal)]">Volver al inicio</Link></section></main>;
  }
  const orders = session.id === "demo" ? (await getOrderRepository().list()).filter(o => o.table === table).map(o => ({ public_code: o.id })) : await getDatabase()`select public_code from orders where table_session_id = ${session.id} order by created_at desc`;
  return <RecoverableMenu table={table} token={token} closed={Boolean("closed" in session && session.closed)} orders={orders.map(row => row.public_code as string)} />;
}
