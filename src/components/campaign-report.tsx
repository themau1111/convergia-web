import Link from "next/link";
import type { CampaignResults } from "@/lib/control-api";
import { telephonyResultLabel } from "@/lib/telephony-results";

export function CampaignReport({ report, campaignName, campaignId }: { report: CampaignResults | null; campaignName?: string; campaignId?: string }) {
  if (!report) return <section className="detail-card campaign-report" id="results"><h2>Resultados de campaña</h2><p className="muted" role="status">No se pudo cargar el reporte. Vuelve a intentarlo actualizando la página.</p></section>;

  function qualityLink(telephonyResult: string) {
    const params = new URLSearchParams();
    if (campaignId) params.set("campaign_id", campaignId);
    else if (campaignName) params.set("campaign", campaignName);
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
    {report.failure_diagnostics && (report.failure_diagnostics.total_failed > 0 || report.failure_diagnostics.unresolved_attempts > 0) && <div className="detail-card">
      <h3>Causas de las llamadas fallidas</h3>
      {report.failure_diagnostics.unresolved_attempts > 0 && <p role="status">Esta campaña cerrada conserva {report.failure_diagnostics.unresolved_attempts} intentos sin resultado definitivo. Requieren investigación; no se cuentan como nuevas fallidas.</p>}
      <p className="muted">Fallida y sin contestar son resultados distintos. Estos códigos describen la señal técnica recibida; no demuestran por sí solos qué hizo el destinatario.</p>
      <p>De {report.failure_diagnostics.total_failed} fallidas: {report.failure_diagnostics.with_ami_reason} con motivo AMI, {report.failure_diagnostics.with_hangup_cause} con causa de colgado y {report.failure_diagnostics.with_sip_status} con respuesta SIP. Las coberturas pueden superponerse.</p>
      {report.failure_diagnostics.without_codes > 0 && <p role="status">{report.failure_diagnostics.without_codes} sin códigos numéricos registrados. Las causas históricas no se reconstruyen ni se reclasifican automáticamente.</p>}
      {report.failure_diagnostics.buckets.map((bucket) => <div className="report-bucket" key={`${bucket.ami_reason}-${bucket.hangup_cause}-${bucket.sip_status}-${bucket.error_code}`}>
        <div><span>{bucket.description}</span><strong>{bucket.count}</strong></div>
        <small>Código del sistema: {bucket.error_code}</small>
      </div>)}
    </div>}
    <p className="report-help">Buzón y sin contestar se consultan en el resultado telefónico. Promesa de pago y otros resultados de la conversación se consultan en las etiquetas. Las etiquetas son las configuradas actualmente para el agente; no se reclasifica el historial.</p>
  </section>;
}
