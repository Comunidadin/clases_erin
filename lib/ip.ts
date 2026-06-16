import { NextRequest } from "next/server";

/**
 * IP pública del cliente. En producción (Vercel) viene en x-forwarded-for.
 * En localhost no hay XFF y todos comparten "local", lo que permite probar el
 * candado de red sin fricción (admin y estudiante coinciden).
 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "local";
}
