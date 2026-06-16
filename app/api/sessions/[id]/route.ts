import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { getClientIp } from "@/lib/ip";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  const { id } = await params;
  const session = await getStore().getSession(id);
  if (!session) return NextResponse.json({ error: "no existe" }, { status: 404 });
  return NextResponse.json({ session });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };

  if (body.action === "end") {
    const session = await getStore().updateSession(id, { status: "ended" });
    if (!session) return NextResponse.json({ error: "no existe" }, { status: 404 });
    return NextResponse.json({ session });
  }

  if (body.action === "reanchor") {
    // Vuelve a fijar la IP del aula desde la red actual del admin.
    const session = await getStore().updateSession(id, {
      networkIp: getClientIp(req),
      enforceNetwork: true,
    });
    if (!session) return NextResponse.json({ error: "no existe" }, { status: 404 });
    return NextResponse.json({ session });
  }

  return NextResponse.json({ error: "acción desconocida" }, { status: 400 });
}
