import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_session";

function secret(): string {
  return process.env.TOKEN_SECRET || "dev-secret-inseguro";
}

function expectedCookieValue(): string {
  // Valor estable derivado del secreto; al rotar el secreto se invalidan sesiones.
  return createHmac("sha256", secret()).update("admin-ok").digest("base64url");
}

export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "";
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

export async function setAdminCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, expectedCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 h
  });
}

export async function clearAdminCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const val = jar.get(COOKIE_NAME)?.value;
  if (!val) return false;
  const a = Buffer.from(val);
  const b = Buffer.from(expectedCookieValue());
  return a.length === b.length && timingSafeEqual(a, b);
}
