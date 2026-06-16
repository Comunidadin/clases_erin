import type { Attendance, NewSessionInput, Session, Store } from "./types";
import { normalizeName } from "./types";

// Adaptador Airtable. Usa el record id de Airtable como id de cada entidad.
// Hot-path (rotación de token + check-in) cacheado brevemente para no agotar
// el límite de 5 req/s de la API.

const API = "https://api.airtable.com/v0";

function cfg() {
  return {
    key: process.env.AIRTABLE_API_KEY!,
    base: process.env.AIRTABLE_BASE_ID!,
    sessions: process.env.AIRTABLE_SESSIONS_TABLE!,
    attendance: process.env.AIRTABLE_ATTENDANCE_TABLE!,
  };
}

interface AirRecord {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

async function air(path: string, init?: RequestInit, retry = true): Promise<Response> {
  const res = await fetch(`${API}/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${cfg().key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 429 && retry) {
    await new Promise((r) => setTimeout(r, 400));
    return air(path, init, false);
  }
  return res;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function toSession(rec: AirRecord): Session {
  const f = rec.fields;
  return {
    id: rec.id,
    name: str(f.Name),
    room: str(f.room),
    status: f.status === "ended" ? "ended" : "active",
    createdAt: str(f.createdAt) || rec.createdTime,
    ttlSeconds: typeof f.ttlSeconds === "number" ? f.ttlSeconds : 20,
    networkIp: str(f.networkIp) || null,
    enforceNetwork: !!f.enforceNetwork,
  };
}

function toAttendance(rec: AirRecord): Attendance {
  const f = rec.fields;
  return {
    id: rec.id,
    sessionId: str(f.sessionId),
    name: str(f.Name),
    studentId: str(f.studentId),
    status: f.status === "rejected" ? "rejected" : "accepted",
    reason: str(f.reason) || null,
    timestamp: str(f.timestamp) || rec.createdTime,
    tokenNonce: str(f.tokenNonce),
    clientIp: str(f.clientIp),
    userAgent: str(f.userAgent),
    lat: typeof f.lat === "number" ? f.lat : null,
    lon: typeof f.lon === "number" ? f.lon : null,
    accuracy: typeof f.accuracy === "number" ? f.accuracy : null,
  };
}

async function listAll(table: string, query: string): Promise<AirRecord[]> {
  const out: AirRecord[] = [];
  let offset: string | undefined;
  do {
    const q = new URLSearchParams(query);
    if (offset) q.set("offset", offset);
    const res = await air(`${cfg().base}/${table}?${q.toString()}`);
    if (!res.ok) break;
    const data = (await res.json()) as { records: AirRecord[]; offset?: string };
    out.push(...data.records);
    offset = data.offset;
  } while (offset);
  return out;
}

export class AirtableStore implements Store {
  // Cache corto de sesiones por id (hot-path). Se invalida al actualizar.
  private cache = new Map<string, { at: number; session: Session }>();
  private readonly cacheMs = 5000;

  async createSession(input: NewSessionInput): Promise<Session> {
    const fields: Record<string, unknown> = {
      Name: input.name,
      room: input.room,
      status: "active",
      createdAt: new Date().toISOString(),
      ttlSeconds: input.ttlSeconds,
      enforceNetwork: input.enforceNetwork,
    };
    if (input.networkIp) fields.networkIp = input.networkIp;

    const res = await air(`${cfg().base}/${cfg().sessions}`, {
      method: "POST",
      body: JSON.stringify({ fields, typecast: true }),
    });
    if (!res.ok) throw new Error(`Airtable createSession: ${res.status} ${await res.text()}`);
    return toSession((await res.json()) as AirRecord);
  }

  async listSessions(): Promise<Session[]> {
    const recs = await listAll(cfg().sessions, "sort[0][field]=createdAt&sort[0][direction]=desc");
    return recs.map(toSession);
  }

  async getSession(id: string): Promise<Session | null> {
    const hit = this.cache.get(id);
    if (hit && Date.now() - hit.at < this.cacheMs) return hit.session;

    const res = await air(`${cfg().base}/${cfg().sessions}/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Airtable getSession: ${res.status}`);
    const session = toSession((await res.json()) as AirRecord);
    this.cache.set(id, { at: Date.now(), session });
    return session;
  }

  async updateSession(id: string, patch: Partial<Session>): Promise<Session | null> {
    const fields: Record<string, unknown> = {};
    if (patch.status !== undefined) fields.status = patch.status;
    if (patch.room !== undefined) fields.room = patch.room;
    if (patch.networkIp !== undefined) fields.networkIp = patch.networkIp ?? "";
    if (patch.enforceNetwork !== undefined) fields.enforceNetwork = patch.enforceNetwork;

    const res = await air(`${cfg().base}/${cfg().sessions}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ fields, typecast: true }),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Airtable updateSession: ${res.status}`);
    const session = toSession((await res.json()) as AirRecord);
    this.cache.set(id, { at: Date.now(), session });
    return session;
  }

  async addAttendance(rec: Omit<Attendance, "id">): Promise<Attendance> {
    const fields: Record<string, unknown> = {
      Name: rec.name,
      sessionId: rec.sessionId,
      studentId: rec.studentId,
      status: rec.status,
      timestamp: rec.timestamp,
      tokenNonce: rec.tokenNonce,
      clientIp: rec.clientIp,
      userAgent: rec.userAgent,
    };
    if (rec.reason) fields.reason = rec.reason;
    if (rec.lat !== null && rec.lon !== null) {
      fields.lat = rec.lat;
      fields.lon = rec.lon;
      fields.mapsUrl = `https://www.google.com/maps?q=${rec.lat},${rec.lon}`;
    }
    if (rec.accuracy !== null) fields.accuracy = rec.accuracy;

    const res = await air(`${cfg().base}/${cfg().attendance}`, {
      method: "POST",
      body: JSON.stringify({ fields, typecast: true }),
    });
    if (!res.ok) throw new Error(`Airtable addAttendance: ${res.status} ${await res.text()}`);
    return toAttendance((await res.json()) as AirRecord);
  }

  async listAttendance(sessionId: string): Promise<Attendance[]> {
    const formula = `{sessionId}="${sessionId.replace(/"/g, '\\"')}"`;
    const recs = await listAll(cfg().attendance, `filterByFormula=${encodeURIComponent(formula)}`);
    return recs.map(toAttendance);
  }

  async findAttendanceByName(sessionId: string, normalized: string): Promise<Attendance | null> {
    const list = await this.listAttendance(sessionId);
    return (
      list.find((a) => a.status === "accepted" && normalizeName(a.name) === normalized) ?? null
    );
  }
}
