import Link from "next/link";
import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function LoginPage() {
  if (await auth()) redirect("/");
  async function login() {
    "use server";
    await signIn("oidc", { redirectTo: "/" });
  }

  return (
    <main className="login-shell">
      <section className="login-story">
        <div className="brand light"><span className="brand-mark">C</span><span>cadencia</span></div>
        <div className="login-signal" aria-hidden="true"><span /><span /><span /><span /><span /></div>
        <div><p className="eyebrow">Centro de operaciones de voz</p><h1>Haz que cada llamada<br />mueva la operación.</h1><p>Diseña campañas, ajusta el comportamiento del agente y convierte conversaciones en decisiones claras.</p></div>
        <small>Control, contexto y trazabilidad en tiempo real.</small>
      </section>
      <section className="login-panel">
        <ThemeToggle />
        <form className="login-card" action={login}>
          <span className="login-step">Acceso al workspace</span>
          <p className="eyebrow">Bienvenido</p><h2>Tu operación empieza aquí.</h2><p className="muted">Usa la cuenta autorizada por tu organización para entrar al panel.</p>
          <button type="submit" className="login-button">Entrar a Cadencia <span>↗</span></button>
          <div className="form-meta"><span>Identidad protegida por Auth0</span><Link href="/forgot-password" prefetch={false}>Recuperar acceso</Link></div>
          <p className="security-note">Cadencia nunca recibe tu contraseña. Auth0 administra el inicio de sesión, recuperación y factores de seguridad.</p>
        </form>
      </section>
    </main>
  );
}
