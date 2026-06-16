import { NextRequest, NextResponse } from "next/server";
import { getStore, normalizeName } from "@/lib/store";
import { verifyToken } from "@/lib/token";
import { getClientIp } from "@/lib/ip";
import { rateLimit } from "@/lib/ratelimit";

// Registra la asistencia. Re-verifica TODO en el servidor (nunca confiar en el
// cliente): token vivo, red, rate-limit y deduplicación.
export async function POST(req: NextRequest) {
  const now = Date.now();
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "";

  if (!rateLimit(`checkin:${ip}`, 10, 60_000, now)) {
    return NextResponse.json({ ok: false, reason: "Demasiados intentos. Espera un momento." }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    token?: string;
    name?: string;
    studentId?: string;
    lat?: number;
    lon?: number;
    accuracy?: number;
  };

  const name = (body.name || "").trim();
  const studentId = (body.studentId || "").trim();

  // Ubicación opcional (señal blanda; no bloquea el registro).
  const lat = typeof body.lat === "number" && body.lat >= -90 && body.lat <= 90 ? body.lat : null;
  const lon = typeof body.lon === "number" && body.lon >= -180 && body.lon <= 180 ? body.lon : null;
  const accuracy = typeof body.accuracy === "number" && body.accuracy >= 0 ? body.accuracy : null;
  const geo = { lat, lon, accuracy };
  if (!body.token) return NextResponse.json({ ok: false, reason: "QR inválido." }, { status: 400 });
  if (name.length < 2) return NextResponse.json({ ok: false, reason: "Escribe tu nombre." }, { status: 400 });

  const v = verifyToken(body.token, now);
  if (!v.ok) {
    const reason =
      v.reason === "expirado"
        ? "El QR expiró. Escanea el código que está ahora en la pantalla."
        : "QR inválido.";
    return NextResponse.json({ ok: false, reason });
  }

  const store = getStore();
  const session = await store.getSession(v.payload.s);
  if (!session) return NextResponse.json({ ok: false, reason: "La clase no existe." });
  if (session.status !== "active") return NextResponse.json({ ok: false, reason: "La sesión ya terminó." });

  // Candado de red.
  if (session.enforceNetwork && session.networkIp && ip !== session.networkIp) {
    await store.addAttendance({
      sessionId: session.id,
      name,
      studentId,
      status: "rejected",
      reason: "fuera de la red del aula",
      timestamp: new Date(now).toISOString(),
      tokenNonce: v.payload.n,
      clientIp: ip,
      userAgent,
      ...geo,
    });
    return NextResponse.json({
      ok: false,
      reason: "No estás en la red del aula. Conéctate al Wi-Fi de la clase.",
    });
  }

  // Deduplicación: un registro aceptado por nombre+sesión.
  const existing = await store.findAttendanceByName(session.id, normalizeName(name));
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true, reason: "Ya estabas registrado. ¡Listo!" });
  }

  await store.addAttendance({
    sessionId: session.id,
    name,
    studentId,
    status: "accepted",
    reason: null,
    timestamp: new Date(now).toISOString(),
    tokenNonce: v.payload.n,
    clientIp: ip,
    userAgent,
    ...geo,
  });

  return NextResponse.json({ ok: true });
}
