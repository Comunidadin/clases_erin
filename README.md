# Asistencia por QR — CLASES ERIN

Registro de asistencia a clases presenciales con **doble candado de presencia**:
QR rotativo en la pantalla del aula + verificación de red (misma IP pública).
Quien no esté en la sala no puede registrarse, aunque le reenvíen el QR.

Ver el diseño completo en `docs/superpowers/specs/2026-06-15-clases-erin-asistencia-qr-design.md`.

## Correr en local

```bash
bun install
bun run dev      # http://localhost:3000
bun run test     # pruebas (lógica de tokens)
```

Contraseña de admin por defecto (en `.env.local`): **`erin2026`**.

## Flujo de prueba (en la misma máquina)

1. Entra a http://localhost:3000 → login con `erin2026`.
2. "Nueva sesión" → se abre el detalle con el QR rotativo.
3. Click en **"Abrir /scan (prueba)"** (debajo del QR) → escribe un nombre → "Confirmar".
4. El asistente aparece en vivo en la lista del dashboard.

Para probar con un teléfono real, ábrelo desde la IP de red que muestra el
servidor (`http://192.168.x.x:3000`) estando en el mismo Wi-Fi.

## Configuración (`.env.local`)

- `ADMIN_PASSWORD` — contraseña única del admin.
- `TOKEN_SECRET` — firma de tokens del QR y la cookie de sesión.
- `DEFAULT_TTL_SECONDS` — cada cuánto rota el QR (default 20).
- `AIRTABLE_API_KEY` / `AIRTABLE_BASE_ID` / `AIRTABLE_SESSIONS_TABLE` /
  `AIRTABLE_ATTENDANCE_TABLE` — con las cuatro presentes, el almacenamiento usa
  **Airtable** (`AirtableStore`). Si faltan, cae al `FileStore` (`.data/db.json`).

Tablas en Airtable (base `appM7y77WbzZBxAZA`):
- **Sessions** (`tblGVv1QaUnHMawT3`) — el record id de Airtable es el id de la sesión.
- **AttendanceRecords** (`tblzix7NITfpZzGVo`) — un registro por check-in (aceptado/rechazado).

## Estado / pendientes

- [x] MVP: login, sesiones, QR rotativo, candado de red, check-in, dedup, CSV en vivo.
- [x] Adaptador Airtable conectado y verificado.
- [ ] Escáner QR in-app opcional (hoy se usa la cámara nativa del teléfono).
- [ ] **Rotar el `AIRTABLE_API_KEY`** en Airtable (se compartió en texto plano durante el setup).
