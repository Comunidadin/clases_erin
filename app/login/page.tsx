"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/dashboard");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo iniciar sesión");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur"
      >
        <h1 className="text-2xl font-bold mb-1">Asistencia · CLASES ERIN</h1>
        <p className="text-white/60 text-sm mb-6">Panel del administrador</p>

        <label className="block text-sm mb-2 text-white/80">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="w-full rounded-lg bg-black/30 border border-white/15 px-4 py-3 outline-none focus:border-indigo-400"
          placeholder="••••••••"
        />

        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 font-semibold py-3 transition"
          style={{ backgroundColor: "#3d52b8" }}
        >
          {loading ? "Entrando…" : "Iniciar sesión"}
        </button>
      </motion.form>
    </main>
  );
}
