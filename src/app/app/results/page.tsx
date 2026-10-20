import Link from "next/link";

import { getCampaigns, getSelectedWorkspace } from "@/lib/control-api";
import { redirect } from "next/navigation";

export default async function ResultsPage() {
  if ((await getSelectedWorkspace())?.key === "survey") redirect("/app/surveys");
  const campaigns = await getCampaigns();
  const completed = campaigns.filter((campaign) => campaign.status === "completed");
  const active = campaigns.filter((campaign) => campaign.status === "running").length;
  const attention = campaigns.filter((campaign) => campaign.status === "failed" || campaign.status === "paused").length;
  return (
    <main className="members-shell compact-view">
      <header className="members-header"><div><p className="eyebrow">Lectura operativa</p><h1>Resultados</h1><p className="muted">Indicadores derivados de campañas reales; nunca cifras decorativas.</p></div><Link href="/">← Volver al pulso</Link></header>
      <section className="hero-grid results-grid">
        <article className="metric-card soft-accent"><p>Campañas terminadas</p><strong>{completed.length.toString().padStart(2,"0")}</strong><span>Con cierre registrado</span></article>
        <article className="metric-card"><p>Operando ahora</p><strong>{active.toString().padStart(2,"0")}</strong><span>En ejecución</span></article>
        <article className="metric-card"><p>Requieren revisión</p><strong>{attention.toString().padStart(2,"0")}</strong><span>Pausadas o con incidencia</span></article>
      </section>
      <section className="detail-card">
        <div className="section-heading"><div><p className="eyebrow">Análisis por campaña</p><h2>Consulta resultados y etiquetas</h2></div></div>
        <p className="muted">Los reportes están disponibles desde el primer intento, sin esperar al cierre. Cada campaña reúne resultados telefónicos, etiquetas del agente y detalle de intentos.</p>
        <div className="results-campaign-list">{campaigns.map(campaign => <Link key={campaign.id} href={`/app/campaigns/${campaign.id}#results`}><strong>{campaign.name}</strong><span>Ver reporte ↗</span></Link>)}</div>
        {!campaigns.length && <p className="empty-state">Aún no hay campañas para analizar.</p>}
      </section>
    </main>
  );
}
