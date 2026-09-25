import Link from "next/link";
import { notFound } from "next/navigation";

import { getCampaign, getSurveyResults } from "@/lib/control-api";

export default async function SurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaign(id).catch(() => null);
  if (!campaign || campaign.campaign_type !== "survey") notFound();
  const results = await getSurveyResults(id).catch(() => null);

  return (
    <main className="campaign-detail-shell">
      <header className="campaign-detail-header">
        <div>
          <Link className="back-link" href="/app/surveys">← Volver a encuestas</Link>
          <p className="eyebrow">Investigación</p>
          <h1>{campaign.name}</h1>
          <p className="muted">Resultados agregados por pregunta. Esta vista no expone respuestas individuales ni texto libre.</p>
        </div>
        <Link className="secondary-action" href={`/app/campaigns/${id}`}>Ver detalle operativo</Link>
      </header>

      <section className="detail-grid" aria-label="Resultados agregados de encuesta">
        {results?.map((result) => (
          <article className="detail-card" key={result.question_key}>
            <div className="section-heading">
              <div><p className="eyebrow">Pregunta</p><h2>{result.question_key}</h2></div>
              <span>{result.total}</span>
            </div>
            <p className="muted">{result.total} respuestas registradas en {result.buckets.length} categorías agregadas.</p>
          </article>
        ))}
        {results?.length === 0 && <article className="detail-card"><p className="empty-state">Aún no hay resultados agregados para esta encuesta.</p></article>}
        {results === null && <article className="detail-card"><p className="empty-state">No fue posible consultar resultados con el rol actual.</p></article>}
      </section>
    </main>
  );
}
