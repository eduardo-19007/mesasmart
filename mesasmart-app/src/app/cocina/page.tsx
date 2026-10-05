import { KitchenBoard } from "@/components/kitchen-board";
import { requireStaff } from "@/lib/staff-auth";
export default async function KitchenPage() {
  const staff = await requireStaff(["ADMIN", "KITCHEN"]);
  return <KitchenBoard role={staff.role}/>;
}
