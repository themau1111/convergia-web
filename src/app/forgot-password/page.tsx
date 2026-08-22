import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ForgotPasswordPage() {
  const resetUrl = process.env.AUTH_PASSWORD_RESET_URL;
  return (
    <main className="login-shell">
      <section className="login-story">
        <div className="brand light"><span className="brand-mark">C</span><span>cadencia</span></div>
        <div><p className="eyebrow">Acceso seguro</p><h1>Recupera el control.<br />Sin perder el contexto.</h1><p>Te enviaremos instrucciones al correo asociado con tu organización.</p></div>
        <small>No confirmaremos públicamente si una dirección tiene una cuenta.</small>
      </section>
      <section className="login-panel">
        <ThemeToggle />
        <div className="login-card">
          <p className="eyebrow">Recuperar acceso</p><h2>Restablece tu contraseña</h2><p className="muted">La recuperación se realiza directamente con el proveedor de identidad de tu organización.</p>
          {resetUrl ? <a className="login-button" href={resetUrl}>Ir a recuperación de acceso</a> : <p className="security-note">Solicita al administrador de tu organización el enlace de recuperación.</p>}
          <p className="security-note"><Link href="/login">← Volver al inicio de sesión</Link></p>
        </div>
      </section>
    </main>
  );
}
