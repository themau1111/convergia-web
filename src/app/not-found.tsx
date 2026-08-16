import Link from "next/link";

export default function NotFound() {
  return (
    <main className="route-state">
      <span className="state-code">404</span>
      <h1>Esta ruta no forma parte del workspace.</h1>
      <p>El enlace pudo cambiar o todavía no está disponible.</p>
      <div className="state-actions"><Link className="primary-action" href="/">Volver al pulso <span>↗</span></Link></div>
    </main>
  );
}
