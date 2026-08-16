import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cadencia | Operación de voz",
  description: "Cadencia, workspace de operación de voz.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
