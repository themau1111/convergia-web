import Link from "next/link";
import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  if (await auth()) redirect("/");
  async function login() {
    "use server";
    await signIn("oidc", { redirectTo: "/" });
  }

  return (
    <main className="login-shell">
      <section className="login-story">
        <div className="brand light"><span className="brand-mark">C</span><span>convergia</span></div>
        <div><p className="eyebrow">Voice operations</p><h1>Conversaciones humanas.<br />Operación precisa.</h1><p>Configura cada campaña, entiende cada llamada y mantén el control de tus datos.</p></div>
        <small>Privacidad y trazabilidad desde el primer contacto.</small>
      </section>
      <section className="login-panel">
        <form className="login-card" action={login}>
          <p className="eyebrow">Bienvenido</p><h2>Ingresa a tu espacio</h2><p className="muted">Administra campañas y resultados desde un solo lugar.</p>
          <button type="submit" className="login-button">Continuar con acceso seguro</button>
          <div className="form-meta"><span>Credenciales administradas por tu organización</span><Link href="/forgot-password">¿Problemas para entrar?</Link></div>
          <p className="security-note">Convergia no recibe ni almacena tu contraseña. El acceso y la recuperación ocurren en el proveedor de identidad.</p>
        </form>
      </section>
    </main>
  );
}
