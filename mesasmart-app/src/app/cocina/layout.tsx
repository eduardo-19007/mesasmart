import { requireStaff } from "@/lib/staff-auth";
export default async function KitchenLayout({ children }: Readonly<{ children: React.ReactNode }>) { await requireStaff(["ADMIN", "KITCHEN"]); return children; }
