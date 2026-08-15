import Link from "next/link";

import { getCampaigns } from "@/lib/control-api";

export default async function ResultsPage() {
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
      <section className="insight-card result-note"><p className="eyebrow">Sin simulaciones</p><h2>{completed.length ? "Consulta cada cierre desde el detalle de campaña." : "Los resultados aparecerán cuando una campaña complete su ciclo."}</h2><p className="muted">Conservamos separación entre estado técnico, resultado conversacional y resultado de negocio.</p><Link className="primary-action" href="/app/campaigns">Ver campañas <span>↗</span></Link></section>
    </main>
  );
}
