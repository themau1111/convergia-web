import { CollectionFilters, readListQuery, normalizeSearch } from "@/components/collection-filters";
import Link from "next/link";

import { getAgentProfiles, getSelectedWorkspace } from "@/lib/control-api";
import { redirect } from "next/navigation";

export default async function AgentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = readListQuery(await searchParams);
  if ((await getSelectedWorkspace())?.key === "survey") redirect("/app/surveys/interviewers");
  const allItems = await getAgentProfiles();
  const agents = allItems.filter(agent => normalizeSearch(`${agent.agent_name} ${agent.company_name} ${agent.profile_key}`).includes(normalizeSearch(query.q ?? "")));
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
      <CollectionFilters query={query} action="/app/agents" />
      <p className="muted list-count" role="status">{agents.length} de {allItems.length} agentes</p>
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
        {!agents.length && !!allItems.length && <div className="empty-state"><strong>Sin coincidencias.</strong><span>Prueba otros filtros o limpia la búsqueda.</span></div>}
        {!allItems.length && (
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
