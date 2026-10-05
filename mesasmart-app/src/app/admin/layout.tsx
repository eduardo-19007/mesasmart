import { requireStaff } from "@/lib/staff-auth";
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) { await requireStaff(["ADMIN"]); return children; }
