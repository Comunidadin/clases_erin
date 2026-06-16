"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { Session } from "@/lib/types";

export default function DashboardClient() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [ttl, setTtl] = useState(20);
  const [enforceNetwork, setEnforceNetwork] = useState(true);

  async function load() {
    const res = await fetch("/api/sessions");
    if (res.status === 401) return router.push("/login");
    const data = await res.json();
    setSessions(data.sessions ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, room, ttlSeconds: ttl, enforceNetwork }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/dashboard/session/${data.session.id}`);
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <main className="max-w-2xl mx-auto p-5">
      <header className="flex items-center justify-between py-4">
        <h1 className="text-xl font-bold">Sesiones</h1>
        <div className="flex gap-3 items-center">
          <Link href="/help" className="text-sm text-white/60 hover:text-white">
            Ayuda
          </Link>
          <button onClick={logout} className="text-sm text-white/60 hover:text-white">
            Salir
          </button>
        </div>
      </header>

      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="w-full rounded-xl py-4 font-semibold mb-6"
          style={{ backgroundColor: "#3d52b8" }}
        >
          + Nueva sesión
        </button>
      ) : (
        <motion.form
          onSubmit={createSession}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6 space-y-3 overflow-hidden"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la sesión (ej. Tráfico Pago — Clase 3)"
            autoFocus
            className="w-full rounded-lg bg-black/30 border border-white/15 px-4 py-3 outline-none focus:border-indigo-400"
          />
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="Aula (opcional)"
            className="w-full rounded-lg bg-black/30 border border-white/15 px-4 py-3 outline-none focus:border-indigo-400"
          />
          <div className="flex items-center gap-3 text-sm">
            <label className="text-white/70">QR rota cada</label>
            <input
              type="number"
              min={10}
              max={300}
              value={ttl}
              onChange={(e) => setTtl(Number(e.target.value))}
              className="w-20 rounded-lg bg-black/30 border border-white/15 px-3 py-2 outline-none"
            />
            <span className="text-white/70">segundos</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={enforceNetwork}
              onChange={(e) => setEnforceNetwork(e.target.checked)}
            />
            Candado de red (estudiantes deben estar en el Wi-Fi del aula)
          </label>
          <div className="flex gap-3 pt-1">
            <button type="submit" className="rounded-lg px-5 py-2.5 font-semibold" style={{ backgroundColor: "#2ecc71", color: "#06281a" }}>
              Crear y abrir
            </button>
            <button type="button" onClick={() => setCreating(false)} className="rounded-lg px-5 py-2.5 text-white/70">
              Cancelar
            </button>
          </div>
        </motion.form>
      )}

      <ul className="space-y-2">
        <AnimatePresence>
          {sessions.map((s) => (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Link
                href={`/dashboard/session/${s.id}`}
                className="flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 transition"
              >
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-white/50">
                    {s.room ? `${s.room} · ` : ""}
                    {new Date(s.createdAt).toLocaleString("es")}
                  </div>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: s.status === "active" ? "rgba(46,204,113,0.15)" : "rgba(255,255,255,0.08)",
                    color: s.status === "active" ? "#2ecc71" : "rgba(255,255,255,0.6)",
                  }}
                >
                  {s.status === "active" ? "Activa" : "Terminada"}
                </span>
              </Link>
            </motion.li>
          ))}
        </AnimatePresence>
        {sessions.length === 0 && (
          <p className="text-white/40 text-center py-10 text-sm">Aún no hay sesiones. Crea la primera.</p>
        )}
      </ul>
    </main>
  );
}
