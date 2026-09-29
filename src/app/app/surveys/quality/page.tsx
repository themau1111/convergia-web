import Link from "next/link";
import { getCampaigns, getSelectedWorkspace, getSurveyResults } from "@/lib/control-api";
import { redirect } from "next/navigation";

export default async function SurveyQualityPage() {
  if ((await getSelectedWorkspace())?.key !== "survey") redirect("/");
  const campaigns = (await getCampaigns()).filter((campaign) => campaign.campaign_type === "survey");
  const quality = await Promise.all(campaigns.map(async (campaign) => ({ campaign, results: await getSurveyResults(campaign.id).catch(() => []) })));
  return <main className="campaign-detail-shell"><Link className="back-link" href="/app/surveys">← Volver a encuestas</Link><header className="campaign-detail-header"><div><p className="eyebrow">Calidad de datos</p><h1>Respuestas registradas</h1><p className="muted">Cada respuesta se guarda por pregunta e intento. Esta vista muestra sólo evidencia agregada, sin respuestas identificables ni transcripciones.</p></div></header><section className="survey-stack">{quality.map(({ campaign, results }) => { const responseCount = results.reduce((total, result) => total + result.total, 0); return <article className="edit-section survey-row" key={campaign.id}><div><strong>{campaign.name}</strong><small>{responseCount} respuestas estructuradas · {results.length} preguntas con evidencia</small></div><Link className="secondary-action" href={`/app/surveys/${campaign.id}`}>Ver agregados</Link></article>; })}{!quality.length && <div className="empty-state">Aún no hay encuestas con respuestas registradas.</div>}</section></main>;
}
