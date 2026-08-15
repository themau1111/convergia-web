import Link from "next/link";

import { getCampaigns } from "@/lib/control-api";

const labels = {
  draft: "Borrador", scheduled: "Programada", running: "En curso", paused: "Pausada",
  completed: "Terminada", cancelled: "Cancelada", failed: "Con incidencia",
} as const;

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();
  return (
    <main className="members-shell compact-view">
      <header className="members-header">
        <div><p className="eyebrow">Operación</p><h1>Campañas</h1><p className="muted">Diseña, revisa y controla cada iniciativa desde una vista dedicada.</p></div>
        <div className="header-actions"><Link href="/">← Volver al pulso</Link><Link className="primary-action" href="/app/campaigns/new">Diseñar campaña <span>↗</span></Link></div>
      </header>
      <section className="campaign-list">
        {campaigns.map((campaign) => (
          <article className="campaign-row" key={campaign.id}>
            <div className="campaign-identity"><span className={`status-dot ${campaign.status}`} /><div><strong>{campaign.name}</strong><small>{campaign.objective === "payment_reminder" ? "Recordatorio de pago" : "Seguimiento de acuerdo"}</small></div></div>
            <div className="progress-group"><div><span>Ciclo</span><strong>{labels[campaign.status]}</strong></div><progress value={campaign.status === "completed" ? 100 : campaign.status === "running" ? 55 : 0} max="100" /></div>
            <span className="status-pill">{labels[campaign.status]}</span>
            <Link className="icon-button" href={`/app/campaigns/${campaign.id}`} aria-label={`Abrir ${campaign.name}`}>↗</Link>
          </article>
        ))}
        {!campaigns.length && <div className="empty-state"><strong>Aún no hay campañas.</strong><span>Configura datos y agentes, después crea el primer borrador sin iniciar llamadas.</span><Link className="primary-action" href="/app/campaigns/new">Crear primer borrador <span>↗</span></Link></div>}
      </section>
    </main>
  );
}
