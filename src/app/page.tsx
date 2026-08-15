import Link from "next/link";
import { signOut } from "@/auth";
import { getCampaigns } from "@/lib/control-api";

const statusLabels = {
  draft: "Borrador", scheduled: "Programada", running: "En curso", paused: "Pausada",
  completed: "Terminada", cancelled: "Cancelada", failed: "Fallida",
} as const;

export default async function Dashboard() {
  const campaigns = await getCampaigns().catch(() => []);
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">C</span><span>convergia</span></div>
        <nav aria-label="Navegación principal">
          <a className="nav-item active" href="#overview">Resumen</a>
          <a className="nav-item" href="#campaigns">Campañas <span>{campaigns.length}</span></a>
          <a className="nav-item" href="#portfolios">Carteras</a>
          <a className="nav-item" href="#agents">Agentes</a>
          <Link className="nav-item" href="/app/settings/catalogs">Catálogos</Link>
          <a className="nav-item" href="#reports">Reportes</a>
          <Link className="nav-item" href="/app/settings/members">Usuarios</Link>
          <Link className="nav-item" href="/app/settings/audit">Auditoría</Link>
        </nav>
        <div className="sidebar-footer">
          <div className="organization"><span className="avatar">EM</span><div><strong>Empresa Modelo</strong><small>Administrador</small></div></div>
          <form action={logout}><button className="text-button" type="submit">Cerrar sesión</button></form>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">Sábado, 15 de agosto</p><h1>Buenas tardes, Mau.</h1></div>
          <Link className="primary-action" href="/app/campaigns/new">Nueva campaña <span>+</span></Link>
        </header>

        <section className="hero-grid" id="overview">
          <article className="metric-card dark"><p>Llamadas hoy</p><strong>248</strong><span>36 conversaciones humanas</span></article>
          <article className="metric-card"><p>Acuerdos confirmados</p><strong>14</strong><span className="positive">+18% frente a ayer</span></article>
          <article className="metric-card"><p>Campañas activas</p><strong>{campaigns.filter((campaign) => campaign.status === "running").length}</strong><span>{campaigns.filter((campaign) => campaign.status === "paused" || campaign.status === "failed").length} requieren atención</span></article>
        </section>

        <section className="section-block" id="campaigns">
          <div className="section-heading"><div><p className="eyebrow">Operación</p><h2>Campañas recientes</h2></div><a href="#all">Ver todas</a></div>
          <div className="campaign-list">
            {campaigns.map((campaign) => (
              <article className="campaign-row" key={campaign.name}>
                <div className="campaign-identity"><span className={`status-dot ${campaign.status}`} /><div><strong>{campaign.name}</strong><small>{campaign.objective === "payment_reminder" ? "Recordatorio de pago" : "Seguimiento de acuerdo"}</small></div></div>
                <div className="progress-group"><div><span>Estado</span><strong>{statusLabels[campaign.status]}</strong></div><progress value={campaign.status === "completed" ? 100 : 0} max="100" /></div>
                <span className="status-pill">{statusLabels[campaign.status]}</span>
                <Link className="icon-button" href={`/app/campaigns/${campaign.id}`} aria-label={`Abrir ${campaign.name}`}>→</Link>
              </article>
            ))}
            {!campaigns.length && <p className="empty-state">Todavía no hay campañas. Crea la primera para comenzar.</p>}
          </div>
        </section>

        <section className="lower-grid">
          <article className="insight-card">
            <p className="eyebrow">Calidad conversacional</p><h2>El agente mantiene el control sin perder naturalidad.</h2>
            <div className="quality-line"><span>Privacidad</span><strong>98%</strong></div>
            <div className="quality-line"><span>Acuerdos válidos</span><strong>93%</strong></div>
            <div className="quality-line"><span>Turnos sin repetición</span><strong>89%</strong></div>
          </article>
          <article className="attention-card"><p className="eyebrow">Requiere atención</p><h2>2 decisiones pendientes</h2><ul><li><span>!</span><div><strong>Fuente sin validar</strong><small>Confirma el mapeo de Mora temprana.</small></div></li><li><span>↗</span><div><strong>Campaña pausada</strong><small>Revisa 7 intentos fallidos consecutivos.</small></div></li></ul></article>
        </section>
      </section>
    </main>
  );
}
