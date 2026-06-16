import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { signToken } from "@/lib/token";

// Devuelve un token fresco para el QR rotativo. Solo el admin lo pide; el
// secreto de firma nunca sale del servidor.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  const { id } = await params;
  const session = await getStore().getSession(id);
  if (!session) return NextResponse.json({ error: "no existe" }, { status: 404 });
  if (session.status !== "active") return NextResponse.json({ error: "sesión terminada" }, { status: 409 });

  const now = Date.now();
  const signed = signToken(session.id, session.ttlSeconds, now);
  return NextResponse.json({
    token: signed.token,
    expiresAt: signed.expiresAt,
    ttlSeconds: session.ttlSeconds,
    serverNow: now,
  });
}
