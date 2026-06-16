import Link from "next/link";

export default function HelpPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-5">
      <Link href="/dashboard" className="text-sm text-white/60 hover:text-white">
        ← Volver
      </Link>
      <h1 className="text-2xl font-bold">Cómo funciona</h1>

      <section className="space-y-2 text-white/80 text-sm leading-relaxed">
        <h2 className="font-semibold text-white">Para el profesor</h2>
        <p>1. Crea una sesión y proyecta el QR en la pantalla del aula.</p>
        <p>2. El QR cambia cada pocos segundos: es lo que prueba que el alumno está viendo la pantalla.</p>
        <p>3. Mira la lista de asistentes en vivo y exporta el CSV al final.</p>
      </section>

      <section className="space-y-2 text-white/80 text-sm leading-relaxed">
        <h2 className="font-semibold text-white">Para el estudiante</h2>
        <p>1. Abre la cámara del teléfono y apunta al QR de la pantalla.</p>
        <p>2. Se abre una página: escribe tu nombre y confirma.</p>
        <p>3. Debes estar conectado al Wi-Fi del aula; si usas datos móviles puede rechazarte.</p>
      </section>

      <section className="space-y-2 text-white/80 text-sm leading-relaxed">
        <h2 className="font-semibold text-white">¿Por qué no puedo registrarme desde casa?</h2>
        <p>
          El registro exige dos cosas a la vez: ver el QR que cambia en la pantalla del aula y estar en la red del
          salón. Desde fuera no se cumplen ninguna de las dos.
        </p>
      </section>
    </main>
  );
}
