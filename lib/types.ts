export type SessionStatus = "active" | "ended";
export type AttendanceStatus = "accepted" | "rejected";

export interface Session {
  id: string;
  name: string;
  room: string;
  status: SessionStatus;
  createdAt: string; // ISO
  ttlSeconds: number;
  networkIp: string | null; // IP pública anclada del aula
  enforceNetwork: boolean;
}

export interface Attendance {
  id: string;
  sessionId: string;
  name: string;
  studentId: string;
  status: AttendanceStatus;
  reason: string | null;
  timestamp: string; // ISO
  tokenNonce: string;
  clientIp: string;
  userAgent: string;
  lat: number | null;
  lon: number | null;
  accuracy: number | null; // metros
}

export interface NewSessionInput {
  name: string;
  room: string;
  ttlSeconds: number;
  networkIp: string | null;
  enforceNetwork: boolean;
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface Store {
  createSession(input: NewSessionInput): Promise<Session>;
  listSessions(): Promise<Session[]>;
  getSession(id: string): Promise<Session | null>;
  updateSession(id: string, patch: Partial<Session>): Promise<Session | null>;
  addAttendance(rec: Omit<Attendance, "id">): Promise<Attendance>;
  listAttendance(sessionId: string): Promise<Attendance[]>;
  findAttendanceByName(sessionId: string, normalizedName: string): Promise<Attendance | null>;
}
