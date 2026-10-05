import { requireStaff } from "@/lib/staff-auth";
import { ServiceBoard } from "@/components/service-board";
export default async function ServicePage() {
  await requireStaff(["ADMIN", "WAITER"]);
  return <ServiceBoard/>;
}
