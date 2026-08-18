import Link from "next/link";
import { notFound } from "next/navigation";

import { getAgentProfile } from "@/lib/control-api";
import { EditAgentForm } from "./edit-form";

export default async function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getAgentProfile(id).catch(() => null);

  if (!agent) notFound();

  return (
    <main className="campaign-detail-shell">
      <header className="campaign-detail-header">
        <div>
          <Link className="back-link" href={`/app/agents/${id}`}>← Volver al detalle</Link>
          <p className="eyebrow">Edición de agente · v{agent.version}</p>
          <h1>{agent.agent_name}</h1>
          <p className="muted">Al guardar se crea una nueva versión. Las campañas activas no se verán afectadas.</p>
        </div>
      </header>
      <EditAgentForm agent={agent} />
    </main>
  );
}
