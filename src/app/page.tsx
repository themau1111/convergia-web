import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getCampaigns, getCurrentMembership } from "@/lib/control-api";

const statusLabels = {
  draft: "Borrador", scheduled: "Programada", running: "En curso", paused: "Pausada",
  completed: "Terminada", cancelled: "Cancelada", failed: "Fallida",
} as const;

export default async function Dashboard() {
  const [session, campaigns, membership] = await Promise.all([
    auth(),
    getCampaigns().catch(() => []),
    getCurrentMembership().catch(() => null),
  ]);
  const displayName = session?.user?.name?.split(" ")[0] || "equipo";
  const initials = (session?.user?.name || session?.user?.email || "CV").slice(0, 2).toUpperCase();
  const roleLabels = { owner: "Propietario", admin: "Administrador", operator: "Operador", analyst: "Analista", viewer: "Consulta" } as const;
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">C</span><span>cadencia</span><em>por Convergia</em></div>
        <nav aria-label="Navegación principal">
          <Link className="nav-item active" href="/"><i>01</i> Pulso</Link>
          <Link className="nav-item" href="/app/campaigns"><i>02</i> Campañas <span>{campaigns.length}</span></Link>
          <Link className="nav-item" href="/app/settings/catalogs"><i>03</i> Datos y agentes</Link>
          <Link className="nav-item" href="/app/results"><i>04</i> Resultados</Link>
          <Link className="nav-item" href="/app/settings/members"><i>05</i> Equipo</Link>
          <Link className="nav-item" href="/app/settings/audit"><i>06</i> Actividad</Link>
        </nav>
        <div className="sidebar-footer">
          <div className="organization"><span className="avatar">{initials}</span><div><strong>{membership?.organization_name || "Convergia"}</strong><small>{membership ? roleLabels[membership.role] : "Activando acceso"}</small></div></div>
          <form action={logout}><button className="text-button" type="submit">Cerrar sesión</button></form>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">Workspace operativo</p><h1>Hola, {displayName}. <span>¿Qué vamos a mover hoy?</span></h1></div>
          <Link className="primary-action" href="/app/campaigns/new">Diseñar campaña <span>↗</span></Link>
        </header>

        <section className="hero-grid" id="overview">
          <article className="metric-card soft-accent"><p>Campañas configuradas</p><strong>{campaigns.length.toString().padStart(2, "0")}</strong><span>Datos reales del control API</span></article>
          <article className="metric-card"><p>Operando ahora</p><strong>{campaigns.filter((campaign) => campaign.status === "running").length.toString().padStart(2, "0")}</strong><span className="positive">Ejecución supervisada</span></article>
          <article className="metric-card"><p>Requieren revisión</p><strong>{campaigns.filter((campaign) => campaign.status === "paused" || campaign.status === "failed").length.toString().padStart(2, "0")}</strong><span>Pausadas o con incidencias</span></article>
        </section>

        <section className="section-block" id="campaigns">
          <div className="section-heading"><div><p className="eyebrow">Operación</p><h2>Campañas en el radar</h2></div><Link href="/app/campaigns">Explorar operación ↗</Link></div>
          <div className="campaign-list">
            {campaigns.map((campaign) => (
              <article className="campaign-row" key={campaign.name}>
                <div className="campaign-identity"><span className={`status-dot ${campaign.status}`} /><div><strong>{campaign.name}</strong><small>{campaign.objective === "payment_reminder" ? "Recordatorio de pago" : "Seguimiento de acuerdo"}</small></div></div>
                <div className="progress-group"><div><span>Estado</span><strong>{statusLabels[campaign.status]}</strong></div><progress value={campaign.status === "completed" ? 100 : 0} max="100" /></div>
                <span className="status-pill">{statusLabels[campaign.status]}</span>
                <Link className="icon-button" href={`/app/campaigns/${campaign.id}`} aria-label={`Abrir ${campaign.name}`}>→</Link>
              </article>
            ))}
            {!campaigns.length && <div className="empty-state"><strong>El radar está limpio.</strong><span>Diseña una campaña o sincroniza las carteras de prueba para comenzar.</span></div>}
          </div>
        </section>

        <section className="lower-grid">
          <article className="insight-card">
            <p className="eyebrow">Arquitectura del agente</p><h2>Personalidad, política y contexto viven en capas independientes.</h2>
            <div className="quality-line"><span>Identidad y acceso</span><strong>Activo</strong></div>
            <div className="quality-line"><span>Salida estructurada</span><strong>Estricto</strong></div>
            <div className="quality-line"><span>Datos sensibles</span><strong>Separados</strong></div>
          </article>
          <article className="attention-card"><p className="eyebrow">Siguiente movimiento</p><h2>Prepara la operación</h2><ul><li><span>01</span><div><strong>Revisa tus catálogos</strong><small>Conservamos las carteras de prueba para configurar el primer flujo.</small></div></li><li><span>02</span><div><strong>Diseña una campaña</strong><small>Define empresa, agente, personalidad y horario sin iniciar llamadas.</small></div></li></ul></article>
        </section>
      </section>
    </main>
  );
}
