import Link from "next/link";
import { notFound } from "next/navigation";

import { getAgentProfile, listAgentLabels } from "@/lib/control-api";
import { AddLabelForm, DeleteLabelForm } from "./label-forms";

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [agent, labels] = await Promise.all([
    getAgentProfile(id).catch(() => null),
    listAgentLabels(id).catch(() => []),
  ]);

  if (!agent) notFound();

  return (
    <main className="campaign-detail-shell">
      <header className="campaign-detail-header">
        <div>
          <Link className="back-link" href="/app/agents">← Volver a agentes</Link>
          <p className="eyebrow">Perfil de agente · v{agent.version}</p>
          <h1>{agent.agent_name}</h1>
          <p className="muted">Empresa: {agent.company_name} · Clave: {agent.profile_key}</p>
        </div>
        <div className="detail-header-end">
          <Link className="secondary-action" href={`/app/agents/${id}/edit`}>Editar agente</Link>
        </div>
      </header>

      <div className="agent-detail-grid">
        <section className="edit-section">
          <p className="eyebrow">Identidad</p>
          <dl className="review-list">
            <div><dt>Nombre</dt><dd>{agent.agent_name}</dd></div>
            <div><dt>Empresa</dt><dd>{agent.company_name}</dd></div>
            <div><dt>Clave</dt><dd><code>{agent.profile_key}</code></dd></div>
            <div><dt>Versión</dt><dd>v{agent.version}</dd></div>
            {agent.voice_id && <div><dt>ID de voz</dt><dd>{agent.voice_id}</dd></div>}
            {agent.objective && <div><dt>Objetivo</dt><dd>{agent.objective}</dd></div>}
          </dl>
        </section>

        {agent.personality && (
          <section className="edit-section">
            <p className="eyebrow">Personalidad</p>
            <p style={{ margin: 0, lineHeight: 1.6 }}>{agent.personality}</p>
          </section>
        )}

        {agent.script && (
          <section className="edit-section">
            <p className="eyebrow">Script de conversación</p>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.6, fontSize: 13 }}>{agent.script}</pre>
          </section>
        )}

        {agent.flow_scenarios && (
          <section className="edit-section">
            <p className="eyebrow">Escenarios de flujo</p>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.6, fontSize: 13 }}>{agent.flow_scenarios}</pre>
          </section>
        )}

        <section className="edit-section">
          <p className="eyebrow">Etiquetas de detección</p>
          <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>Las etiquetas clasifican automáticamente los resultados de las llamadas según el criterio definido.</p>
          {labels.length > 0 ? (
            <div className="agent-labels-list">
              {labels.map((label) => (
                <div className="agent-label-row" key={label.id}>
                  <div>
                    <strong>{label.name}</strong>
                    <small className="muted">{label.criteria}</small>
                  </div>
                  <DeleteLabelForm agentId={id} labelId={label.id} labelName={label.name} />
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No hay etiquetas configuradas aún.</p>
          )}

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".1em" }}>Agregar etiqueta</p>
            <AddLabelForm agentId={id} />
          </div>
        </section>
      </div>
    </main>
  );
}
