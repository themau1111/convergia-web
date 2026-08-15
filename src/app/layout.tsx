import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Convergia Voice",
  description: "Operación clara para campañas de voz.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
