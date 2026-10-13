import Link from "next/link";
import { getCampaigns, getQualityCalls, getSelectedWorkspace, getSurveyResults } from "@/lib/control-api";
import { redirect } from "next/navigation";
import { RecordingPlayer } from "../../quality/recording-player";

export default async function SurveyQualityPage() {
  if ((await getSelectedWorkspace())?.key !== "survey") redirect("/");
  const campaigns = (await getCampaigns()).filter((campaign) => campaign.campaign_type === "survey");
  const [quality, calls] = await Promise.all([
    Promise.all(campaigns.map(async (campaign) => ({ campaign, results: await getSurveyResults(campaign.id).catch(() => []) }))),
    getQualityCalls(),
  ]);
  const recordings = calls.filter((call) => call.recording_available);

  return (
    <main className="campaign-detail-shell">
      <Link className="back-link" href="/app/surveys">← Volver a encuestas</Link>
      <header className="campaign-detail-header">
        <div>
          <p className="eyebrow">Calidad de datos</p>
          <h1>Respuestas registradas</h1>
          <p className="muted">Cada respuesta se guarda por pregunta e intento. Los resultados se muestran de forma agregada; las grabaciones autorizadas se revisan por separado.</p>
        </div>
      </header>
      <section className="survey-stack" aria-label="Resultados agregados">
        {quality.map(({ campaign, results }) => {
          const responseCount = results.reduce((total, result) => total + result.total, 0);
          return (
            <article className="edit-section survey-row" key={campaign.id}>
              <div>
                <strong>{campaign.name}</strong>
                <small>{responseCount} respuestas estructuradas · {results.length} preguntas con evidencia</small>
              </div>
              <Link className="secondary-action" href={`/app/surveys/${campaign.id}`}>Ver agregados</Link>
            </article>
          );
        })}
        {!quality.length && <div className="empty-state">Aún no hay encuestas con respuestas registradas.</div>}
      </section>
      <section className="survey-stack" aria-labelledby="survey-recordings-heading">
        <h2 id="survey-recordings-heading">Grabaciones de llamadas</h2>
        {recordings.map((call) => (
          <article className="edit-section" key={call.uuid}>
            <strong>{call.campaign_name || "Prueba manual"}</strong>
            <p className="muted">{call.updated_local} · Llamada {call.uuid.slice(0, 8)}</p>
            <RecordingPlayer key={call.uuid} callUuid={call.uuid} finishedAt={call.completed_at ?? null} />
          </article>
        ))}
        {!recordings.length && <div className="empty-state">Aún no hay grabaciones disponibles.</div>}
      </section>
    </main>
  );
}
