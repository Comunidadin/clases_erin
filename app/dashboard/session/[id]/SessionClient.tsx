"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import type { Attendance } from "@/lib/types";
import CountdownRing from "@/components/CountdownRing";

interface Props {
  id: string;
  initialName: string;
  initialRoom: string;
}

interface TokenInfo {
  token: string;
  expiresAt: number;
  ttlSeconds: number;
  skew: number; // Date.now() - serverNow
}

export default function SessionClient({ id, initialName, initialRoom }: Props) {
  const router = useRouter();
  const [tok, setTok] = useState<TokenInfo | null>(null);
  const [progress, setProgress] = useState(1);
  const [attendees, setAttendees] = useState<Attendance[]>([]);
  const [accepted, setAccepted] = useState(0);
  const [ended, setEnded] = useState(false);
  const [origin, setOrigin] = useState("");
  const fetchingTok = useRef(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const fetchToken = useCallback(async () => {
    if (fetchingTok.current) return;
    fetchingTok.current = true;
    try {
      const res = await fetch(`/api/sessions/${id}/token`);
      if (res.status === 409) {
        setEnded(true);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setTok({
        token: data.token,
        expiresAt: data.expiresAt,
        ttlSeconds: data.ttlSeconds,
        skew: Date.now() - data.serverNow,
      });
    } finally {
      fetchingTok.current = false;
    }
  }, [id]);

  // Primera carga del token.
  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Animación del anillo + rotación al expirar.
  useEffect(() => {
    if (!tok || ended) return;
    const tick = setInterval(() => {
      const now = Date.now() - tok.skew;
      const remaining = tok.expiresAt - now;
      const p = remaining / (tok.ttlSeconds * 1000);
      setProgress(Math.max(0, Math.min(1, p)));
      if (remaining <= 0) fetchToken();
    }, 200);
    return () => clearInterval(tick);
  }, [tok, ended, fetchToken]);

  // Polling de asistentes.
  useEffect(() => {
    let active = true;
    async function poll() {
      const res = await fetch(`/api/sessions/${id}/attendees`);
      if (!active || !res.ok) return;
      const data = await res.json();
      setAttendees(data.attendees ?? []);
      setAccepted(data.acceptedCount ?? 0);
    }
    poll();
    const t = setInterval(poll, 4000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [id]);

  async function endSession() {
    if (!confirm("¿Terminar la sesión? El QR dejará de funcionar.")) return;
    await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end" }),
    });
    setEnded(true);
  }

  async function reanchor() {
    await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reanchor" }),
    });
    alert("Red del aula re-anclada a tu conexión actual.");
  }

  const scanUrl = tok ? `${origin}/scan?t=${encodeURIComponent(tok.token)}` : "";
  const seconds = tok ? Math.max(0, Math.ceil((progress * tok.ttlSeconds))) : 0;

  return (
    <main className="max-w-3xl mx-auto p-5">
      <header className="flex items-center justify-between py-3">
        <button onClick={() => router.push("/dashboard")} className="text-sm text-white/60 hover:text-white">
          ← Sesiones
        </button>
        <div className="flex gap-3">
          <a
            href={`/api/sessions/${id}/export`}
            className="text-sm rounded-lg px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10"
          >
            Exportar CSV
          </a>
          {!ended && (
            <button onClick={endSession} className="text-sm rounded-lg px-3 py-1.5" style={{ backgroundColor: "rgba(231,76,60,0.15)", color: "#e74c3c" }}>
              Terminar
            </button>
          )}
        </div>
      </header>

      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold">{initialName}</h1>
        {initialRoom && <p className="text-white/50 text-sm">{initialRoom}</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* QR */}
        <div className="flex flex-col items-center">
          {ended ? (
            <div className="h-[320px] flex items-center justify-center text-white/50 text-center px-6">
              Sesión terminada. El QR ya no acepta registros.
            </div>
          ) : (
            <CountdownRing progress={progress} size={320}>
              <AnimatePresence mode="wait">
                {tok && (
                  <motion.div
                    key={tok.token}
                    initial={{ opacity: 0, scale: 0.9, filter: "blur(6px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                    className="bg-white p-3 rounded-xl"
                  >
                    <QRCodeSVG value={scanUrl} size={232} level="M" />
                  </motion.div>
                )}
              </AnimatePresence>
            </CountdownRing>
          )}
          {!ended && (
            <>
              <p className="mt-3 text-white/70 text-sm">
                Muestra este QR · cambia en <span className="font-semibold text-white">{seconds}s</span>
              </p>
              <div className="mt-2 flex gap-3 text-xs text-white/40">
                <button onClick={reanchor} className="hover:text-white/70 underline">
                  Re-anclar red del aula
                </button>
                {scanUrl && (
                  <a href={scanUrl} target="_blank" rel="noreferrer" className="hover:text-white/70 underline">
                    Abrir /scan (prueba)
                  </a>
                )}
              </div>
            </>
          )}
        </div>

        {/* Asistentes */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-semibold">Asistentes</h2>
            <span className="text-2xl font-bold" style={{ color: "#2ecc71" }}>
              {accepted}
            </span>
          </div>
          <ul className="space-y-1.5 max-h-[360px] overflow-auto pr-1">
            <AnimatePresence initial={false}>
              {attendees.map((a) => (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                >
                  <div>
                    <div className={a.status === "accepted" ? "" : "text-white/50 line-through"}>{a.name}</div>
                    <div className="text-xs text-white/40 flex items-center gap-2">
                      {a.studentId && <span>{a.studentId}</span>}
                      {a.lat !== null && a.lon !== null && (
                        <a
                          href={`https://www.google.com/maps?q=${a.lat},${a.lon}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-white/70 underline"
                          title={a.accuracy ? `±${Math.round(a.accuracy)} m` : undefined}
                        >
                          📍 ubicación
                        </a>
                      )}
                    </div>
                  </div>
                  <span className="text-xs whitespace-nowrap" style={{ color: a.status === "accepted" ? "#2ecc71" : "#e74c3c" }}>
                    {a.status === "accepted"
                      ? new Date(a.timestamp).toLocaleString("es", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "rechazado"}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
            {attendees.length === 0 && (
              <p className="text-white/40 text-sm py-8 text-center">Esperando registros…</p>
            )}
          </ul>
        </div>
      </div>
    </main>
  );
}
