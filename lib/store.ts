import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Attendance, NewSessionInput, Session, Store } from "./types";
import { normalizeName } from "./types";
import { AirtableStore } from "./airtable";

export { normalizeName };
export type { Store };

// ---------------------------------------------------------------------------
// Adaptador de archivo JSON (desarrollo local). Persiste en .data/db.json.
// ---------------------------------------------------------------------------

interface DbShape {
  sessions: Session[];
  attendance: Attendance[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

async function readDb(): Promise<DbShape> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    return JSON.parse(raw) as DbShape;
  } catch {
    return { sessions: [], attendance: [] };
  }
}

async function writeDb(db: DbShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

// Cola simple para serializar lecturas/escrituras y evitar carreras en dev.
let queue: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

class FileStore implements Store {
  createSession(input: NewSessionInput): Promise<Session> {
    return withLock(async () => {
      const db = await readDb();
      const session: Session = {
        id: randomUUID(),
        name: input.name,
        room: input.room,
        status: "active",
        createdAt: new Date().toISOString(),
        ttlSeconds: input.ttlSeconds,
        networkIp: input.networkIp,
        enforceNetwork: input.enforceNetwork,
      };
      db.sessions.unshift(session);
      await writeDb(db);
      return session;
    });
  }

  async listSessions(): Promise<Session[]> {
    const db = await readDb();
    return db.sessions;
  }

  async getSession(id: string): Promise<Session | null> {
    const db = await readDb();
    return db.sessions.find((s) => s.id === id) ?? null;
  }

  updateSession(id: string, patch: Partial<Session>): Promise<Session | null> {
    return withLock(async () => {
      const db = await readDb();
      const idx = db.sessions.findIndex((s) => s.id === id);
      if (idx === -1) return null;
      db.sessions[idx] = { ...db.sessions[idx], ...patch, id };
      await writeDb(db);
      return db.sessions[idx];
    });
  }

  addAttendance(rec: Omit<Attendance, "id">): Promise<Attendance> {
    return withLock(async () => {
      const db = await readDb();
      const entry: Attendance = { ...rec, id: randomUUID() };
      db.attendance.unshift(entry);
      await writeDb(db);
      return entry;
    });
  }

  async listAttendance(sessionId: string): Promise<Attendance[]> {
    const db = await readDb();
    return db.attendance.filter((a) => a.sessionId === sessionId);
  }

  async findAttendanceByName(sessionId: string, normalizedName: string): Promise<Attendance | null> {
    const db = await readDb();
    return (
      db.attendance.find(
        (a) => a.sessionId === sessionId && a.status === "accepted" && normalizeName(a.name) === normalizedName
      ) ?? null
    );
  }
}

// ---------------------------------------------------------------------------
// Selección de adaptador. Airtable se activa cuando hay credenciales.
// (El adaptador Airtable se implementará cuando se conecten las llaves; por
// ahora el MVP corre con el FileStore para poder probar en localhost.)
// ---------------------------------------------------------------------------

let store: Store | null = null;

export function getStore(): Store {
  if (store) return store;
  const useAirtable = !!(
    process.env.AIRTABLE_API_KEY &&
    process.env.AIRTABLE_BASE_ID &&
    process.env.AIRTABLE_SESSIONS_TABLE &&
    process.env.AIRTABLE_ATTENDANCE_TABLE
  );
  store = useAirtable ? new AirtableStore() : new FileStore();
  return store;
}
