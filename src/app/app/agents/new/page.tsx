import Link from "next/link";

import { AgentForm } from "./agent-form";

export default function NewAgentPage() {
  return (
    <main className="campaign-detail-shell">
      <header className="campaign-detail-header">
        <div>
          <Link className="back-link" href="/app/agents">← Volver a agentes</Link>
          <p className="eyebrow">Nuevo agente</p>
          <h1>Crear perfil de agente</h1>
          <p className="muted">Define la identidad, personalidad y script de conversación del agente.</p>
        </div>
      </header>
      <AgentForm />
    </main>
  );
}
