"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

type Phase = "validating" | "form" | "submitting" | "success" | "error";

export default function ScanClient() {
  const params = useSearchParams();
  const token = params.get("t") || "";

  const [phase, setPhase] = useState<Phase>("validating");
  const [sessionName, setSessionName] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "pidiendo" | "ok" | "denegado">("idle");

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setGeoStatus("denegado");
      return;
    }
    setGeoStatus("pidiendo");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGeoStatus("ok");
      },
      () => setGeoStatus("denegado"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // Prefill desde localStorage.
  useEffect(() => {
    setName(localStorage.getItem("asistencia_nombre") || "");
    setStudentId(localStorage.getItem("asistencia_matricula") || "");
  }, []);

  // Validar token + red al cargar.
  useEffect(() => {
    if (!token) {
      setPhase("error");
      setMessage("No hay código. Escanea el QR de la pantalla.");
      return;
    }
    (async () => {
      const res = await fetch("/api/checkin/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.ok) {
        setSessionName(data.sessionName || "");
        setPhase("form");
      } else {
        setPhase("error");
        setMessage(data.reason || "No se pudo validar.");
      }
    })();
  }, [token]);

  // Pide la ubicación al mostrar el formulario (opcional).
  useEffect(() => {
    if (phase === "form" && geoStatus === "idle") requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setPhase("submitting");
    localStorage.setItem("asistencia_nombre", name.trim());
    localStorage.setItem("asistencia_matricula", studentId.trim());

    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        name,
        studentId,
        lat: geo?.lat,
        lon: geo?.lon,
        accuracy: geo?.accuracy,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setMessage(data.reason || "¡Asistencia registrada!");
      setPhase("success");
    } else {
      setMessage(data.reason || "No se pudo registrar.");
      setPhase("error");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {phase === "validating" && <p className="text-center text-white/60">Validando…</p>}

        {phase === "success" && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="text-center"
          >
            <Check />
            <h1 className="text-2xl font-bold mt-4">{message}</h1>
            {sessionName && <p className="text-white/60 mt-1">{sessionName}</p>}
            <p className="text-white/40 text-sm mt-6">Ya puedes cerrar esta página.</p>
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: [0, -8, 8, -6, 4, 0] }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(231,76,60,0.15)" }}>
              <span className="text-3xl" style={{ color: "#e74c3c" }}>
                ✕
              </span>
            </div>
            <h1 className="text-xl font-bold mt-4">No se registró</h1>
            <p className="text-white/70 mt-2">{message}</p>
            <button
              onClick={() => location.reload()}
              className="mt-6 rounded-lg px-5 py-2.5 font-semibold"
              style={{ backgroundColor: "#3d52b8" }}
            >
              Reintentar
            </button>
          </motion.div>
        )}

        {(phase === "form" || phase === "submitting") && (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <h1 className="text-xl font-bold">Registrar asistencia</h1>
            {sessionName && <p className="text-white/60 text-sm mb-5">{sessionName}</p>}

            <label className="block text-sm mb-1 text-white/80 mt-3">Tu nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full rounded-lg bg-black/30 border border-white/15 px-4 py-3 outline-none focus:border-indigo-400"
              placeholder="Nombre y apellido"
            />

            <label className="block text-sm mb-1 text-white/80 mt-4">Matrícula / ID (opcional)</label>
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded-lg bg-black/30 border border-white/15 px-4 py-3 outline-none focus:border-indigo-400"
              placeholder="Opcional"
            />

            <div className="mt-4 text-xs flex items-center gap-2 text-white/50">
              <span>📍 Ubicación:</span>
              {geoStatus === "pidiendo" && <span>obteniendo…</span>}
              {geoStatus === "ok" && geo && (
                <span style={{ color: "#2ecc71" }}>compartida (±{Math.round(geo.accuracy)} m)</span>
              )}
              {geoStatus === "denegado" && (
                <button type="button" onClick={requestLocation} className="underline hover:text-white/80">
                  no compartida · activar
                </button>
              )}
              {geoStatus === "idle" && (
                <button type="button" onClick={requestLocation} className="underline hover:text-white/80">
                  compartir
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={phase === "submitting" || name.trim().length < 2}
              className="mt-4 w-full rounded-lg font-semibold py-3 disabled:opacity-50"
              style={{ backgroundColor: "#2ecc71", color: "#06281a" }}
            >
              {phase === "submitting" ? "Registrando…" : "Confirmar asistencia"}
            </button>
          </motion.form>
        )}
      </div>
    </main>
  );
}

function Check() {
  return (
    <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(46,204,113,0.15)" }}>
      <motion.svg width="44" height="44" viewBox="0 0 24 24" fill="none">
        <motion.path
          d="M4 12.5l5 5L20 6.5"
          stroke="#2ecc71"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </motion.svg>
    </div>
  );
}
