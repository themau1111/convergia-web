import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAgentProfile, listAgentLabels, getAllAgentLabels, getSelectedWorkspace } from "@/lib/control-api";
import { EditAgentForm } from "./edit-form";
import styles from "../../agent-forms.module.css";
import { DeleteLabelForm } from "../label-forms";

export default async function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  if ((await getSelectedWorkspace())?.key === "survey") redirect("/app/surveys/interviewers");
  const { id } = await params;
  const [agent, labels, allOrgLabels] = await Promise.all([
    getAgentProfile(id).catch(() => null),
    listAgentLabels(id).catch(() => []),
    getAllAgentLabels().catch(() => []),
  ]);

  if (!agent) notFound();

  // Biblioteca: etiquetas de otros perfiles no duplicadas por nombre con las actuales
  const existingNames = new Set(labels.map((l) => l.name.toLowerCase()));
  const library = allOrgLabels.filter(
    (l, i, arr) =>
      !existingNames.has(l.name.toLowerCase()) &&
      arr.findIndex((x) => x.name.toLowerCase() === l.name.toLowerCase()) === i,
  );

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

      <EditAgentForm agent={agent} existingLabels={labels} library={library} />

      {/* Sección de etiquetas en la vista de edición */}
      <section className={`edit-section ${styles.savedLabels}`} style={{ marginTop: 8 }}>
        <p className="eyebrow">Etiquetas guardadas</p>
        <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
          Las etiquetas nuevas se agregan al guardar el formulario de arriba.
          Eliminar una etiqueta guardada se aplica de inmediato y no crea una nueva versión.
        </p>

        {labels.length > 0 ? (
          <div className="agent-labels-list" style={{ marginBottom: 20 }}>
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
          <p className="muted" style={{ marginBottom: 20 }}>No hay etiquetas configuradas aún.</p>
        )}

      </section>
    </main>
  );
}
