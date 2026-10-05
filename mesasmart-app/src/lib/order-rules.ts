import { nextOrderStatus, type OrderStatus } from "./orders";
export function canTransition(from: OrderStatus, to: OrderStatus) {
  return nextOrderStatus[from] === to ||
    (to === "Cancelado" && ["Confirmado", "En preparación"].includes(from)) ||
    (to === "Rechazado" && from === "Confirmado");
}
