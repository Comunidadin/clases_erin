import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { getClientIp } from "@/lib/ip";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  const sessions = await getStore().listSessions();
  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "no autorizado" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    room?: string;
    ttlSeconds?: number;
    enforceNetwork?: boolean;
  };

  const name = (body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Falta el nombre de la sesión" }, { status: 400 });

  const defaultTtl = Number(process.env.DEFAULT_TTL_SECONDS) || 20;
  const ttlSeconds = Math.min(Math.max(body.ttlSeconds ?? defaultTtl, 10), 300);
  const enforceNetwork = body.enforceNetwork ?? true;

  // Ancla la IP pública del aula (la del admin al crear la sesión).
  const networkIp = enforceNetwork ? getClientIp(req) : null;

  try {
    const session = await getStore().createSession({
      name,
      room: (body.room || "").trim(),
      ttlSeconds,
      networkIp,
      enforceNetwork,
    });
    return NextResponse.json({ session });
  } catch (err) {
    const airtableConfigured = !!(
      process.env.AIRTABLE_API_KEY &&
      process.env.AIRTABLE_BASE_ID &&
      process.env.AIRTABLE_SESSIONS_TABLE &&
      process.env.AIRTABLE_ATTENDANCE_TABLE
    );
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: airtableConfigured
          ? `No se pudo guardar en Airtable: ${detail}`
          : "Faltan variables de Airtable en el servidor (AIRTABLE_API_KEY / BASE_ID / SESSIONS_TABLE / ATTENDANCE_TABLE).",
        airtableConfigured,
      },
      { status: 500 }
    );
  }
}
