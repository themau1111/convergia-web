import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaign, getCurrentMembership } from "@/lib/control-api";
import { EditCampaignForm } from "./edit-form";

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaign, membership] = await Promise.all([
    getCampaign(id).catch(() => null),
    getCurrentMembership(),
  ]);

  if (!campaign) notFound();

  // Solo paused y roles con permisos
  const canEdit = campaign.status === "paused" &&
    ["owner", "admin", "operator"].includes(membership.role);

  if (!canEdit) {
    return (
      <main className="campaign-detail-shell">
        <header className="campaign-detail-header">
          <div>
            <Link className="back-link" href={`/app/campaigns/${id}`}>← Volver al detalle</Link>
            <p className="eyebrow">Edición bloqueada</p>
            <h1>{campaign.name}</h1>
          </div>
        </header>
        <p className="form-error" style={{ maxWidth: 480 }}>
          {campaign.status !== "paused"
            ? `La campaña está en estado "${campaign.status}" — solo puedes editar campañas pausadas.`
            : "No tienes permisos para editar esta campaña."}
        </p>
      </main>
    );
  }

  return (
    <main className="campaign-detail-shell">
      <header className="campaign-detail-header">
        <div>
          <Link className="back-link" href={`/app/campaigns/${id}`}>← Volver al detalle</Link>
          <p className="eyebrow">Edición de campaña</p>
          <h1>{campaign.name}</h1>
          <p className="muted">Solo puedes editar nombre, notas y programación. La cartera y el agente son inmutables.</p>
        </div>
        <span className="detail-status paused">Pausada</span>
      </header>
      <EditCampaignForm campaign={campaign} />
    </main>
  );
}
