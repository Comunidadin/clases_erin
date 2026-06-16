// Rate limiter en memoria (ventana deslizante simple). Suficiente para un aula;
// en serverless multi-instancia es best-effort.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number, now: number): boolean {
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false; // bloqueado
  }
  arr.push(now);
  hits.set(key, arr);
  return true; // permitido
}
