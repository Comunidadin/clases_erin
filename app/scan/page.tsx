import { Suspense } from "react";
import ScanClient from "./ScanClient";

export default function ScanPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center text-white/50">Cargando…</main>}>
      <ScanClient />
    </Suspense>
  );
}
