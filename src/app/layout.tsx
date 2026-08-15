import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cadencia | Operación de voz",
  description: "Cadencia, el workspace de operación de voz de Convergia.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
