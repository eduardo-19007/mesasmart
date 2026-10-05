import { NextResponse } from "next/server";
import { listMenu } from "@/lib/server-menu";

export async function GET() {
  return NextResponse.json({ data: await listMenu() });
}
