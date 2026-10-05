"use client";

import { useEffect, useState } from "react";
import { MenuExperience } from "./menu-experience";
import { OrderTracker } from "./order-tracker";

export function RecoverableMenu({ table, token, closed, orders }: {
  table: string; token?: string; closed: boolean; orders: string[];
}) {
  const [selected, setSelected] = useState("");
  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get("order");
    if (id && orders.includes(id)) queueMicrotask(() => setSelected(id));
  }, [orders]);
  function select(id: string) {
    setSelected(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("order", id); else url.searchParams.delete("order");
    window.history.replaceState(null, "", url);
  }
  if (selected) return <OrderTracker id={selected} table={table} accessToken={token} onBack={() => select("")}/>;
  return <>
    {orders.length > 0 && <nav aria-label="Pedidos de esta sesión" className="flex flex-wrap items-center gap-3 border-b bg-white p-4"><b>Pedidos de esta sesión</b>{orders.map(id => <button key={id} onClick={() => select(id)} className="underline">{id}</button>)}</nav>}
    {closed ? <main className="p-6"><h1 className="text-xl font-bold">Acceso de seguimiento</h1><p>Puede consultar esta sesión mientras tenga pedidos activos y durante las 24 horas siguientes a su finalización. Para un nuevo pedido solicite el QR vigente.</p></main> : <MenuExperience table={table} accessToken={token}/>}
  </>;
}
