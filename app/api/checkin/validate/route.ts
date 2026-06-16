import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { verifyToken } from "@/lib/token";
import { getClientIp } from "@/lib/ip";

// Valida el token + red SIN registrar. La página /scan la usa para decidir si
// muestra el formulario de nombre o un mensaje de error.
export async function POST(req: NextRequest) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token) return NextResponse.json({ ok: false, reason: "QR inválido." }, { status: 400 });

  const now = Date.now();
  const v = verifyToken(token, now);
  if (!v.ok) {
    const reason =
      v.reason === "expirado"
        ? "El QR expiró. Escanea el código que está ahora en la pantalla."
        : "QR inválido.";
    return NextResponse.json({ ok: false, reason });
  }

  const session = await getStore().getSession(v.payload.s);
  if (!session) return NextResponse.json({ ok: false, reason: "La clase no existe." });
  if (session.status !== "active") return NextResponse.json({ ok: false, reason: "La sesión ya terminó." });

  if (session.enforceNetwork && session.networkIp && getClientIp(req) !== session.networkIp) {
    return NextResponse.json({
      ok: false,
      reason: "No estás en la red del aula. Conéctate al Wi-Fi de la clase para registrar tu asistencia.",
    });
  }

  return NextResponse.json({ ok: true, sessionName: session.name, room: session.room });
}
