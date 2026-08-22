import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cadencia | Operación de voz",
  description: "Cadencia, workspace de operación de voz.",
  icons: { icon: "/cadencia-icon.svg?v=2" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <TooltipProvider>
          {children}
          <Toaster position="bottom-right" richColors closeButton duration={4000} />
        </TooltipProvider>
        <Script id="cadencia-theme" strategy="beforeInteractive">{`try{var t=localStorage.getItem('cadencia-theme');var v=t==='dark'?'dark':'light';document.documentElement.dataset.theme=v;document.documentElement.style.colorScheme=v}catch(e){document.documentElement.dataset.theme='light'}`}</Script>
      </body>
    </html>
  );
}
