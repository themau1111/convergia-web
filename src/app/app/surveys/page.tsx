import Link from "next/link";

import { getCampaigns, getSurveyResults } from "@/lib/control-api";

const statusLabels = {
  draft: "Borrador", scheduled: "Programada", running: "En curso", paused: "Pausada",
  completed: "Terminada", cancelled: "Cancelada", failed: "Con incidencia",
} as const;

export default async function SurveysPage() {
  const surveys = (await getCampaigns()).filter((campaign) => campaign.campaign_type === "survey");
  const resultSets = await Promise.all(surveys.map(async (survey) => ({
    campaignId: survey.id,
    results: await getSurveyResults(survey.id).catch(() => []),
  })));
  const totals = new Map(resultSets.map((item) => [item.campaignId, item.results.reduce((sum, result) => sum + result.total, 0)]));
  return (
    <main className="members-shell compact-view">
      <header className="members-header">
        <div>
          <p className="eyebrow">Investigación</p>
          <h1>Encuestas</h1>
          <p className="muted">Cuestionarios versionados y campañas aisladas de la operación de cobranza.</p>
        </div>
        <div className="header-actions"><Link href="/app/campaigns">Ver campañas</Link></div>
      </header>
      <section className="campaign-list">
        {surveys.map((survey) => (
          <article className="campaign-row" key={survey.id}>
            <div className="campaign-identity"><span className={`status-dot ${survey.status}`} /><div><strong>{survey.name}</strong><small>Encuesta telefónica · {totals.get(survey.id) ?? 0} respuestas registradas</small></div></div>
            <div className="progress-group"><div><span>Estado</span><strong>{statusLabels[survey.status]}</strong></div><progress value={survey.status === "completed" ? 100 : survey.status === "running" ? 55 : 0} max="100" /></div>
            <span className="status-pill">{statusLabels[survey.status]}</span>
            <Link className="icon-button" href={`/app/surveys/${survey.id}`} aria-label={`Ver resultados de ${survey.name}`}>↗</Link>
          </article>
        ))}
        {!surveys.length && <div className="empty-state"><strong>Aún no hay encuestas configuradas.</strong><span>Primero crea y revisa un cuestionario versionado en la API de control. La interfaz de diseño se habilitará tras el cierre metodológico.</span></div>}
      </section>
    </main>
  );
}
