import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asistencia · CLASES ERIN",
  description: "Registro de asistencia por QR rotativo con verificación de presencia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
