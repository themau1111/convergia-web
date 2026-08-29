import Link from "next/link";

export default function AccessPage() {
  return (
    <main className="route-state">
      <span className="state-code">Acceso restringido</span>
      <h1>No tienes acceso a este workspace.</h1>
      <p>Tu identidad fue reconocida, pero la API no encontró una membresía activa. Si esperabas entrar, solicita que revisen tu invitación o permisos.</p>
      <div className="state-actions">
        <Link className="primary-action" href="/login?reason=access">Iniciar sesión de nuevo <span>↗</span></Link>
        <Link href="/">Volver al pulso</Link>
      </div>
    </main>
  );
}
