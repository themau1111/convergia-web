import Link from "next/link";
import { notFound } from "next/navigation";

import { getCampaign, getCampaignAttempts, getCampaignAuditEvents, getCampaignExecutions, getCampaignPreflight, getCurrentMembership } from "@/lib/control-api";

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
  const { id } = await params;
  const campaign = await getCampaign(id).catch(() => null);
  if (!campaign) notFound();
  const [executions, attempts, auditEvents, membership, preflight] = await Promise.all([
    getCampaignExecutions(id).catch(() => []), getCampaignAttempts(id).catch(() => []),
    getCampaignAuditEvents(id).catch(() => []), getCurrentMembership(),
    getCampaignPreflight(id).catch(() => null),
  ]);

  const canEdit = campaign.status === "paused" &&
    ["owner", "admin", "operator"].includes(membership.role);

  return (
    <main className="campaign-detail-shell">
      <header className="campaign-detail-header">
        <div><Link className="back-link" href="/">← Volver a campañas</Link><p className="eyebrow">Detalle operativo</p><h1>{campaign.name}</h1><p className="muted">{campaign.objective === "payment_reminder" ? "Recordatorio de pago" : "Seguimiento de acuerdo"}</p></div>
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
      </section>

      <section className={`preflight-card ${preflight?.ready ? "ready" : "blocked"}`}>
        <div><p className="eyebrow">Prevalidación sin llamadas</p><h2>{preflight?.ready ? "Campaña lista" : "Campaña bloqueada"}</h2><small>No muestra destinatarios ni genera intentos.</small></div>
        <dl><div><dt>Elegibles</dt><dd>{preflight ? `${preflight.eligible_recipients}${preflight.count_truncated ? "+" : ""}` : "—"}</dd></div><div><dt>Fuente</dt><dd>{preflight?.data_source_ready ? "Lista" : "Pendiente"}</dd></div><div><dt>Adaptador</dt><dd>{preflight?.adapter_available ? "Disponible" : "Sin configurar"}</dd></div><div><dt>Registros inválidos</dt><dd>{preflight?.invalid_recipients ?? "—"}</dd></div></dl>
        {preflight?.issues.length ? <ul>{preflight.issues.map((issue) => <li key={issue}>{({ data_source_not_ready: "La fuente aún no está verificada.", adapter_not_configured: "El adaptador todavía no tiene conexión configurada.", healthcheck_failed: "La fuente no respondió al chequeo de salud.", no_eligible_recipients: "La cartera no tiene destinatarios elegibles.", invalid_recipients: "Hay destinatarios con ID o teléfono inválido.", recipient_count_truncated: "El conteo superó el límite de previsualización." })[issue]}</li>)}</ul> : null}
      </section>

      <LifecycleControls campaignId={id} status={campaign.status} canManage={["owner", "admin", "operator"].includes(membership.role)} preflightReady={preflight?.ready ?? false} />

      <section className="detail-grid">
        <article className="detail-card">
          <div className="section-heading"><div><p className="eyebrow">Ejecuciones</p><h2>Corridas de campaña</h2></div><span>{executions.length}</span></div>
          <div className="execution-list">
            {executions.map((execution) => <div key={execution.id}><span className={`status-dot ${execution.status}`} /><div><strong>{statusLabels[execution.status] ?? execution.status}</strong><small>Creada {formatDate(execution.created_at)}</small></div><small>{execution.started_at ? `Inicio ${formatDate(execution.started_at)}` : "Sin iniciar"}</small></div>)}
            {!executions.length && <p className="empty-state">Esta campaña todavía no tiene ejecuciones.</p>}
          </div>
        </article>

        <article className="detail-card">
          <div className="section-heading"><div><p className="eyebrow">Actividad técnica</p><h2>Intentos recientes</h2></div><span>{attempts.length}</span></div>
          <div className="attempt-table" role="table" aria-label="Intentos de llamada">
            <div className="attempt-head" role="row"><span>Estado</span><span>Intento</span><span>Inicio</span><span>Referencia</span></div>
            {attempts.map((attempt) => <div className="attempt-row" role="row" key={attempt.id}><span><i className={`status-dot ${attempt.technical_status}`} />{statusLabels[attempt.technical_status] ?? attempt.technical_status}</span><span>#{attempt.attempt_number}</span><span>{formatDate(attempt.started_at ?? attempt.created_at)}</span><code>{attempt.call_uuid.slice(0, 8)}</code></div>)}
            {!attempts.length && <p className="empty-state">Aún no hay intentos registrados.</p>}
          </div>
        </article>
      </section>

      <section className="detail-card audit-card">
        <div className="section-heading"><div><p className="eyebrow">Auditoría</p><h2>Historial de cambios</h2></div><span>{auditEvents.length}</span></div>
        <div className="audit-list">
          {auditEvents.map((event) => <div key={event.id}><div><strong>{event.action === "campaign.created" ? "Campaña creada" : "Estado actualizado"}</strong><small>{formatDate(event.created_at)} · {event.actor_display_name ?? event.actor_subject}</small></div><code>{event.action === "campaign.status_changed" ? `${String(event.metadata.from)} → ${String(event.metadata.to)}` : String(event.metadata.status ?? "draft")}</code><span>{typeof event.metadata.reason === "string" && event.metadata.reason ? event.metadata.reason : "Sin razón adicional"}</span></div>)}
          {!auditEvents.length && <p className="empty-state">No hay eventos de auditoría registrados.</p>}
        </div>
      </section>
    </main>
  );
}
