import Link from "next/link";
import type { CampaignResults } from "@/lib/control-api";
import { telephonyResultLabel } from "@/lib/telephony-results";

export function CampaignReport({ report, campaignName }: { report: CampaignResults | null; campaignName?: string }) {
  if (!report) return <section className="detail-card campaign-report" id="results"><h2>Resultados de campaña</h2><p className="muted" role="status">No se pudo cargar el reporte. Vuelve a intentarlo actualizando la página.</p></section>;

  function qualityLink(telephonyResult: string) {
    const params = new URLSearchParams();
    if (campaignName) params.set("campaign", campaignName);
    params.set("telephony_result", telephonyResult);
    return `/app/quality?${params}`;
  }

  return <section className="detail-card campaign-report" id="results" aria-labelledby="campaign-results-title">
    <div className="section-heading"><div><p className="eyebrow">Reporte de campaña</p><h2 id="campaign-results-title">Resultados y etiquetas</h2></div><span>{report.total_attempts} intentos</span></div>
    <p className="muted">Todos los intentos de esta campaña, incluidas sus distintas corridas. Los conteos representan llamadas, no personas únicas.</p>
    <div className="report-metrics"><div><strong>{report.total_attempts}</strong><span>Intentos registrados</span></div><div><strong>{report.finished_attempts}</strong><span>Intentos finalizados</span></div><div><strong>{report.without_labels}</strong><span>Sin etiquetas asignadas</span></div></div>
    {!report.total_attempts && <p className="muted">Aún no hay llamadas registradas. Las etiquetas del agente aparecen abajo como referencia.</p>}
    <div className="report-breakdowns">
      <div>
        <h3>Resultado telefónico</h3>
        <p className="muted">Contestada significa que respondió una persona; no implica una promesa de pago.</p>
        {report.telephony.map(bucket => (
          <Link href={qualityLink(bucket.result)} className="report-bucket report-bucket-link" key={bucket.result} title={`Ver llamadas: ${telephonyResultLabel(bucket.result)}`}>
            <div><span>{telephonyResultLabel(bucket.result)}</span><strong>{bucket.count}</strong></div>
            <progress aria-label={telephonyResultLabel(bucket.result)} value={bucket.count} max={report.total_attempts || 1} />
          </Link>
        ))}
        {!report.telephony.length && <p className="muted">Sin resultados telefónicos.</p>}
      </div>
      <div><h3>Etiquetas del agente</h3><p className="muted">Clasificación de la conversación. Una llamada puede tener varias etiquetas; los porcentajes usan todos los intentos.</p>{report.labels.map(label => <div className="report-bucket" key={label.id}><div><span>{label.name}</span><strong>{label.count} · {report.total_attempts ? Math.round(label.count / report.total_attempts * 100) : 0}%</strong></div><small>{label.criteria}</small><progress aria-label={label.name} value={label.count} max={report.total_attempts || 1} /></div>)}{!report.labels.length && <p className="muted">Este agente no tiene etiquetas configuradas.</p>}</div>
    </div>
    <p className="report-help">Buzón y sin contestar se consultan en el resultado telefónico. Promesa de pago y otros resultados de la conversación se consultan en las etiquetas. Las etiquetas son las configuradas actualmente para el agente; no se reclasifica el historial.</p>
  </section>;
}
