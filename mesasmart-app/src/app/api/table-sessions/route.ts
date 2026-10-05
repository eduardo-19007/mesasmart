import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";
import { openTableSession } from "@/lib/table-sessions";
import { apiError } from "@/lib/api";
import { isAuthorized } from "@/lib/staff-auth";
import { tableCodeRegex } from "@/lib/table-code";

const schema = z.object({
  table: z.string().trim().toUpperCase().regex(tableCodeRegex, "Use una mesa entre M01 y M99"),
  lifetimeMinutes: z.number().int().min(15).max(1440).default(720),
});

export async function POST(request: Request) {
  try {
  if (!await isAuthorized(["ADMIN"])) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos de mesa inválidos", details: parsed.error.flatten() }, { status: 400 });
  const { token, expiresAt } = await openTableSession(parsed.data.table, parsed.data.lifetimeMinutes);
  const accessUrl = new URL(`/mesa/${parsed.data.table}`, process.env.APP_URL ?? request.url);
  accessUrl.searchParams.set("token", token);
  const qrDataUrl = await QRCode.toDataURL(accessUrl.toString(), { errorCorrectionLevel: "M", margin: 2, width: 480, color: { dark: "#17324d", light: "#ffffff" } });
  return NextResponse.json({ data: { table: parsed.data.table, accessUrl: accessUrl.toString(), qrDataUrl, expiresAt: new Date(expiresAt).toISOString() } }, { status: 201 });
  } catch (error) { return apiError(error); }
}
