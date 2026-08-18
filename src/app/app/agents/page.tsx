import Link from "next/link";

import { getAgentProfiles } from "@/lib/control-api";

export default async function AgentsPage() {
  const agents = await getAgentProfiles();
  return (
    <main className="members-shell">
      <header className="members-header">
        <div>
          <p className="eyebrow">Configuración</p>
          <h1>Agentes</h1>
          <p className="muted">Gestiona los perfiles de agente reutilizables para tus campañas.</p>
        </div>
        <div className="header-actions">
          <Link href="/">← Volver al pulso</Link>
          <Link className="primary-action" href="/app/agents/new">Nuevo agente <span>↗</span></Link>
        </div>
      </header>
      <section className="campaign-list">
        {agents.map((agent) => (
          <article className="campaign-row" key={agent.id}>
            <div className="campaign-identity">
              <div>
                <strong>{agent.agent_name}</strong>
                <small>{agent.company_name} · clave: {agent.profile_key}</small>
              </div>
            </div>
            <div className="progress-group">
              <div>
                <span>Versión</span>
                <strong>v{agent.version}</strong>
              </div>
              <progress value={0} max="100" />
            </div>
            <span className="status-pill">v{agent.version}</span>
            <Link className="icon-button" href={`/app/agents/${agent.id}`} aria-label={`Abrir ${agent.agent_name}`}>↗</Link>
          </article>
        ))}
        {!agents.length && (
          <div className="empty-state">
            <strong>Aún no hay agentes.</strong>
            <span>Crea el primer perfil de agente para usarlo en campañas.</span>
            <Link className="primary-action" href="/app/agents/new">Crear primer agente <span>↗</span></Link>
          </div>
        )}
      </section>
    </main>
  );
}
