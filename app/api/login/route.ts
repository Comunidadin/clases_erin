import { NextRequest, NextResponse } from "next/server";
import { checkPassword, setAdminCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || !checkPassword(password)) {
    return NextResponse.json({ ok: false, error: "Contraseña incorrecta" }, { status: 401 });
  }
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
