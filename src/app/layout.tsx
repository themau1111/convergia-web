import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cadencia | Operación de voz",
  description: "Cadencia, workspace de operación de voz.",
  icons: { icon: "/cadencia-icon.svg?v=2" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster position="bottom-right" richColors closeButton duration={4000} />
      </body>
    </html>
  );
}
