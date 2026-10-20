import { CollectionFilters, readListQuery, filterCampaigns } from "@/components/collection-filters";
import Link from "next/link";

import { getCampaigns, getSelectedWorkspace } from "@/lib/control-api";
import { redirect } from "next/navigation";

const labels = {
  draft: "Borrador", scheduled: "Programada", running: "En curso", paused: "Pausada",
  completed: "Terminada", cancelled: "Cancelada", failed: "Con incidencia",
} as const;

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = readListQuery(await searchParams);
  if ((await getSelectedWorkspace())?.key === "survey") redirect("/app/surveys");
  const allItems = await getCampaigns();
  const campaigns = filterCampaigns(allItems, query);
  return (
    <main className="members-shell compact-view">
      <header className="members-header">
        <div><p className="eyebrow">Operación</p><h1>Campañas</h1><p className="muted">Diseña, revisa y controla cada iniciativa desde una vista dedicada.</p></div>
        <div className="header-actions"><Link href="/">← Volver al pulso</Link><Link className="primary-action" href="/app/campaigns/new">Diseñar campaña <span>↗</span></Link></div>
      </header>
      <CollectionFilters query={query} action="/app/campaigns" campaigns />
      <p className="muted list-count" role="status">{campaigns.length} de {allItems.length} campañas</p>
      <section className="campaign-list">
        {campaigns.map((campaign) => (
          <article className="campaign-row" key={campaign.id}>
            <div className="campaign-identity"><span className={`status-dot ${campaign.status}`} /><div><strong>{campaign.name}</strong><small>{campaign.campaign_type === "survey" ? "Encuesta" : campaign.objective === "payment_reminder" ? "Recordatorio de pago" : "Seguimiento de acuerdo"}</small></div></div>
            <div className="progress-group"><div><span>Ciclo</span><strong>{labels[campaign.status]}</strong></div></div>
            <span className="status-pill">{labels[campaign.status]}</span>
            <Link className="icon-button" href={`/app/campaigns/${campaign.id}`} aria-label={`Abrir ${campaign.name}`}>↗</Link>
          </article>
        ))}
        {!campaigns.length && !!allItems.length && <div className="empty-state"><strong>Sin coincidencias.</strong><span>Prueba otros filtros o limpia la búsqueda.</span></div>}
        {!allItems.length && <div className="empty-state"><strong>Aún no hay campañas.</strong><span>Configura datos y agentes, después crea el primer borrador sin iniciar llamadas.</span><Link className="primary-action" href="/app/campaigns/new">Crear primer borrador <span>↗</span></Link></div>}
      </section>
    </main>
  );
}
