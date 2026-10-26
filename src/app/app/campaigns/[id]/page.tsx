import { TelephonyResult } from "@/components/telephony-result";
import { CampaignReport } from "@/components/campaign-report";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCampaignResults, getCampaign, getCampaignAttempts, getCampaignAuditEvents, getCampaignExecutions, getCampaignPreflight, getCurrentMembership, getSelectedWorkspace } from "@/lib/control-api";

import { LifecycleControls } from "./lifecycle-controls";

const statusLabels: Record<string, string> = {
  draft: "Borrador", scheduled: "Programada", running: "En curso", paused: "Pausada",
  completed: "Terminada", cancelled: "Cancelada", failed: "Fallida",
  pending: "Pendiente", prepared: "Preparado", originating: "Originando",
  connected: "Conectado", no_answer: "Sin respuesta",
};
const dateTime = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City",
});
const formatDate = (value?: string | null) => value ? dateTime.format(new Date(value)) : "—";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if ((await getSelectedWorkspace())?.key === "survey") redirect("/app/surveys");
  const { id } = await params;
  const campaign = await getCampaign(id).catch(() => null);
  if (!campaign) notFound();
  const [executions, attempts, auditEvents, membership, preflight, report] = await Promise.all([
    getCampaignExecutions(id).catch(() => []), getCampaignAttempts(id).catch(() => []),
    getCampaignAuditEvents(id).catch(() => []), getCurrentMembership(),
    getCampaignPreflight(id).catch(() => null), getCampaignResults(id).catch(() => null),
  ]);

  const canEdit = campaign.status === "paused" &&
    ["owner", "admin", "operator"].includes(membership.role);

  return (
    <main className="campaign-detail-shell">
      <header className="campaign-detail-header">
        <div><Link className="back-link" href="/app/campaigns">← Volver a campañas</Link><p className="eyebrow">Detalle operativo</p><h1>{campaign.name}</h1><p className="muted">{campaign.objective === "payment_reminder" ? "Recordatorio de pago" : "Seguimiento de acuerdo"}</p></div>
        <div className="detail-header-end">
          {canEdit && <Link href={`/app/campaigns/${id}/edit`} className="secondary-action">Editar campaña</Link>}
          <span className={`detail-status ${campaign.status}`}>{statusLabels[campaign.status] ?? campaign.status}</span>
        </div>
      </header>

      <section className="detail-summary-grid" aria-label="Configuración congelada">
        <article><p>Cartera</p><strong>{campaign.portfolio.name}</strong><small>{campaign.portfolio.estimated_recipients ?? "—"} destinatarios estimados</small></article>
        <article><p>Agente</p><strong>{campaign.agent_profile.agent_name}</strong><small>{campaign.agent_profile.company_name} · versión {campaign.agent_profile.version}</small></article>
        <article><p>Personalidad</p><strong>{campaign.agent_profile.personality}</strong><small>Perfil congelado para esta campaña</small></article>
        <article><p>Ventana</p><strong>{formatDate(campaign.schedule.start_at)}</strong><small>hasta {formatDate(campaign.schedule.end_at)}</small></article>
        <article><p>Rondas</p><strong>{campaign.dialer?.rounds ?? 1}</strong><small>{(campaign.dialer?.rounds ?? 1) > 1 ? `Cooldown ${campaign.dialer?.cooldown_minutes ?? 0} min entre rondas` : "Sin rondas adicionales"}</small></article>
        {(campaign.dialer?.telephony_filter?.length ?? 0) > 0 && (
          <article><p>Excluidos por resultado</p><strong>{campaign.dialer.telephony_filter.join(", ")}</strong><small>No pasan a rondas siguientes</small></article>
        )}
      </section>

      <section className={`preflight-card ${preflight?.ready ? "ready" : "blocked"}`}>
        <div><p className="eyebrow">Prevalidación sin llamadas</p><h2>{preflight?.ready ? "Campaña lista" : "Campaña bloqueada"}</h2><small>No muestra destinatarios ni genera intentos.</small></div>
        <dl><div><dt>Elegibles</dt><dd>{preflight ? `${preflight.eligible_recipients}${preflight.count_truncated ? "+" : ""}` : "—"}</dd></div><div><dt>Fuente</dt><dd>{preflight?.data_source_ready ? "Lista" : "Pendiente"}</dd></div><div><dt>Adaptador</dt><dd>{preflight?.adapter_available ? "Disponible" : `Sin configurar${preflight?.adapter_type ? ` (${preflight.adapter_type})` : ""}`}</dd></div><div><dt>Registros inválidos</dt><dd>{preflight?.invalid_recipients ?? "—"}</dd></div></dl>
        {preflight?.issues.length ? <ul>{preflight.issues.map((issue) => <li key={issue}>{({ data_source_not_ready: "La fuente aún no está verificada.", adapter_not_configured: "El adaptador todavía no tiene conexión configurada. Crea una nueva campaña y selecciona una cartera de tipo CSV.", healthcheck_failed: "La fuente no respondió al chequeo de salud.", no_eligible_recipients: "La cartera no tiene destinatarios elegibles.", invalid_recipients: "Hay destinatarios con ID o teléfono inválido, o sin saldo positivo para el recordatorio.", recipient_count_truncated: "El conteo superó el límite de previsualización." })[issue]}</li>)}</ul> : null}
        {preflight?.debug_error ? <p style={{fontSize:"0.75rem",color:"#888",marginTop:"0.5rem",fontFamily:"monospace",wordBreak:"break-all"}}>{preflight.debug_error}</p> : null}
      </section>

      <LifecycleControls campaignId={id} status={campaign.status} canManage={["owner", "admin", "operator"].includes(membership.role)} preflightReady={preflight?.ready ?? false} />

      <CampaignReport report={report} campaignName={campaign.name} campaignId={id} />

      <section className="detail-grid">
        <article className="detail-card">
          <div className="section-heading"><div><p className="eyebrow">Ejecuciones</p><h2>Corridas de campaña</h2></div><span>{executions.length}</span></div>
          <div className="execution-list">
            {executions.map((execution) => <div key={execution.id}><span className={`status-dot ${execution.status}`} /><div><strong>{statusLabels[execution.status] ?? execution.status}</strong><small>Creada {formatDate(execution.created_at)}</small></div><small>{execution.started_at ? `Inicio ${formatDate(execution.started_at)}` : "Sin iniciar"}</small></div>)}
            {!executions.length && <p className="empty-state">Esta campaña todavía no tiene ejecuciones.</p>}
          </div>
        </article>

        <article className="detail-card">
          <div className="section-heading"><div><p className="eyebrow">Actividad técnica</p><h2>Detalle de intentos</h2></div><span>{attempts.length}</span></div>
          <div className="attempt-table" role="region" aria-label="Intentos de llamada" tabIndex={0}>
            <table className="campaign-attempts">
              <thead><tr><th scope="col">Resultado telefónico</th><th scope="col">Estado técnico</th><th scope="col">Intento</th><th scope="col">Inicio</th><th scope="col">Referencia</th></tr></thead>
              <tbody>{attempts.map(attempt => <tr key={attempt.id}>
                <td><TelephonyResult value={attempt.telephony_result} /></td>
                <td><span className="attempt-technical"><i className={`status-dot ${attempt.technical_status}`} />{statusLabels[attempt.technical_status] ?? attempt.technical_status}</span></td>
                <td>#{attempt.attempt_number}</td><td>{formatDate(attempt.started_at ?? attempt.created_at)}</td><td><code>{attempt.call_uuid.slice(0, 8)}</code></td>
              </tr>)}</tbody>
            </table>
            {!attempts.length && <p className="empty-state">Aún no hay intentos registrados.</p>}
          </div>
        </article>
      </section>

      {(() => {
        const timeoutAttempts = attempts.filter((a) => a.error_code === "origination_outcome_timeout");
        if (!timeoutAttempts.length) return null;
        return (
          <section className="detail-card" aria-label="Diagnóstico de timeouts">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Diagnóstico</p>
                <h2>Intentos sin resultado en plazo</h2>
              </div>
              <span>{timeoutAttempts.length}</span>
            </div>
            <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
              Estos intentos salieron del sistema pero no se recibió confirmación de Asterisk
              dentro del tiempo límite. Suelen ocurrir durante reinicios o cortes breves de telefonía
              y pueden reintentarse en una nueva vuelta de campaña.
            </p>
            <div className="attempt-table" role="region" tabIndex={0}>
              <table className="campaign-attempts">
                <thead>
                  <tr>
                    <th scope="col">Contacto</th>
                    <th scope="col">Intento</th>
                    <th scope="col">Ronda</th>
                    <th scope="col">Inicio</th>
                    <th scope="col">Cierre</th>
                    <th scope="col">UUID</th>
                  </tr>
                </thead>
                <tbody>
                  {timeoutAttempts.map((a) => (
                    <tr key={a.id}>
                      <td>{a.call_uuid.slice(0, 8)}</td>
                      <td>#{a.attempt_number}</td>
                      <td>{a.round_number ?? 1}</td>
                      <td>{formatDate(a.started_at ?? a.created_at)}</td>
                      <td>{formatDate(a.completed_at)}</td>
                      <td><code>{a.call_uuid.slice(0, 8)}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })()}

      <section className="detail-card audit-card">
        <div className="section-heading"><div><p className="eyebrow">Auditoría</p><h2>Historial de cambios</h2></div><span>{auditEvents.length}</span></div>
        <div className="audit-list">
          {auditEvents.map((event) => <div key={event.id}><div><strong>{event.action === "campaign.created" ? "Campaña creada" : "Estado actualizado"}</strong><small>{formatDate(event.created_at)} · {event.actor_display_name ?? event.actor_subject}</small></div><span className="audit-status">{event.action === "campaign.status_changed" ? `${statusLabels[String(event.metadata.from)] ?? String(event.metadata.from)} → ${statusLabels[String(event.metadata.to)] ?? String(event.metadata.to)}` : statusLabels[String(event.metadata.status ?? "draft")] ?? String(event.metadata.status)}</span><span>{typeof event.metadata.reason === "string" && event.metadata.reason ? event.metadata.reason : "Sin razón adicional"}</span></div>)}
          {!auditEvents.length && <p className="empty-state">No hay eventos de auditoría registrados.</p>}
        </div>
      </section>
    </main>
  );
}
