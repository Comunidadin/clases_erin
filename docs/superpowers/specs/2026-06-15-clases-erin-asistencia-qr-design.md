# Asistencia por QR rotativo + candado de red — Diseño MVP

**Fecha:** 2026-06-15
**Proyecto:** CLASES ERIN
**Estado:** Aprobado, en implementación

## Problema y valor
Registro de asistencia a clases presenciales que **no se pueda falsificar de forma remota**. Una persona que no asistió no debe poder registrar su asistencia, ni aunque le reenvíen el QR.

## Idea central: doble candado de presencia
La presencia se prueba con **dos señales independientes**, sin GPS ni app nativa:

1. **QR rotativo en la pantalla del aula** — se regenera cada ~20 s con un token firmado y efímero (HMAC-SHA256, TTL corto). Escanear un token *vivo* prueba que ves la pantalla de este salón.
2. **Candado de red (misma IP pública)** — al iniciar la sesión, el servidor ancla la IP pública del aula (la del router). Un check-in solo se acepta si llega desde esa misma IP. Quien esté remoto (casa, datos móviles, VPN) tiene otra IP → rechazado.

| Ataque | Defensa |
|---|---|
| Reenvían el QR a alguien en casa | Candado de red (IP distinta) |
| Otro salón del mismo campus (misma IP) | Token rotativo de *esta* pantalla |
| Screenshot viejo del QR | TTL corto + nonce |
| Presente en la sala | Pasa ambos ✅ |

**Condición:** los estudiantes deben estar en el Wi-Fi del aula. `enforceNetwork` es configurable por sesión (se puede desactivar para clases que usan datos móviles, cayendo a solo-TTL).

## Flujo
**Admin:** `/login` (contraseña única) → `/dashboard` (lista + nueva sesión) → `/dashboard/session/[id]` (QR rotativo con anillo countdown, lista de asistentes en vivo por polling, terminar sesión, exportar CSV).

**Estudiante (sin app, sin cuenta):** cámara nativa escanea el QR (es una URL `/scan?s=…&t=token`) → la página valida token + red → pide nombre (+ matrícula opcional, prellenado desde `localStorage`) → confirma → feedback ✓/✗ con motivo.

## Arquitectura
- **Next.js (App Router) + TypeScript + Tailwind v4**, Framer Motion para animaciones. Deploy en Vercel.
- **Route Handlers serverless** hacen todo el acceso a datos. Secretos solo en el servidor.
- **Token:** `HMAC-SHA256({ s, n, iat, exp })` con `TOKEN_SECRET`, codificado en la URL del QR. El dashboard pide un token nuevo en cada rotación.
- **Tiempo real:** el dashboard hace polling cada ~4 s (sin WebSocket; encaja en serverless).
- **Almacenamiento tras interfaz `Store`:** adaptador de archivo JSON (`.data/db.json`) para desarrollo local; adaptador Airtable cuando `AIRTABLE_API_KEY`/`AIRTABLE_BASE_ID` están presentes. Mismo contrato, sin migración.

## Datos (esquema lógico, válido para Airtable)
- **Sessions:** `id`, `name`, `room`, `status` (active/ended), `createdAt`, `ttlSeconds`, `networkIp`, `enforceNetwork`.
- **AttendanceRecords:** `id`, `sessionId`, `name`, `studentId`, `status` (accepted/rejected), `reason`, `timestamp`, `tokenNonce`, `clientIp`, `userAgent`. Campos reservados futuros: `lat`, `lon`, `accuracy` (modelo GPS opcional).

## Seguridad
HTTPS (Vercel), tokens HMAC efímeros con TTL ~20 s, candado de IP, rate-limit del check-in por IP, deduplicación (un registro por nombre+sesión), cookie de admin firmada httpOnly. La API key de Airtable nunca llega al cliente.

## Tests
Vitest sobre la lógica crítica: firma/verificación de token, expiración, comparación de IP, deduplicación.

## Fuera del MVP
GPS/ubicación, BLE/ultrasonido, SSO/Google, import de roster, LMS, apps nativas, analytics/heatmap, notificaciones por umbral, detección de spoofing por ML.
