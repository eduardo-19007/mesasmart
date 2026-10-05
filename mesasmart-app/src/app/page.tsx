import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/staff-auth";
export default async function Home() {
  const user = await getStaffSession();
  redirect(!user ? "/login" : user.role === "ADMIN" ? "/admin" : user.role === "KITCHEN" ? "/cocina" : "/atencion");
}
