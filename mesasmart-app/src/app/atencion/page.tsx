import { requireStaff } from "@/lib/staff-auth";
import { ServiceBoard } from "@/components/service-board";
export default async function ServicePage() {
  const session = await requireStaff(["ADMIN", "WAITER"]);
  return <ServiceBoard role={session.role as "ADMIN" | "WAITER"}/>;
}
