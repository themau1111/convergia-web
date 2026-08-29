"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Cadencia route error", error);
  }, [error]);

  return (
    <main className="route-state">
      <span className="state-code">Interrupción temporal</span>
      <h1>No pudimos abrir esta vista.</h1>
      <p>Tu información sigue intacta. Puedes reintentar la consulta o volver al pulso operativo.</p>
      {error.digest && <p className="error-reference">Referencia de soporte: {error.digest}</p>}
      <div className="state-actions">
        <button className="primary-action" onClick={reset}>Reintentar <span>↗</span></button>
        <Link href="/">Volver al pulso</Link>
      </div>
    </main>
  );
}
