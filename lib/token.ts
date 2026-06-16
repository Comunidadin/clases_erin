import { createHmac, randomBytes, timingSafeEqual } from "crypto";

function secret(): string {
  return process.env.TOKEN_SECRET || "dev-secret-inseguro";
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(payload: string): string {
  return b64url(createHmac("sha256", secret()).update(payload).digest());
}

export interface TokenPayload {
  s: string; // sessionId
  n: string; // nonce (único por token)
  iat: number; // emitido (epoch ms)
  exp: number; // expira (epoch ms)
}

export interface SignedToken {
  token: string;
  nonce: string;
  expiresAt: number;
}

/** Firma un token efímero para una sesión, válido `ttlSeconds`. */
export function signToken(sessionId: string, ttlSeconds: number, now: number): SignedToken {
  const nonce = randomBytes(8).toString("hex");
  const payload: TokenPayload = {
    s: sessionId,
    n: nonce,
    iat: now,
    exp: now + ttlSeconds * 1000,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const mac = sign(body);
  return { token: `${body}.${mac}`, nonce, expiresAt: payload.exp };
}

export type VerifyResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: "malformado" | "firma_invalida" | "expirado" };

/** Verifica firma y expiración. */
export function verifyToken(token: string, now: number): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformado" };
  const [body, mac] = parts;

  const expectedMac = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expectedMac);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "firma_invalida" };
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
  } catch {
    return { ok: false, reason: "malformado" };
  }

  if (typeof payload.exp !== "number" || now > payload.exp) {
    return { ok: false, reason: "expirado" };
  }
  return { ok: true, payload };
}
