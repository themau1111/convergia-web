import Link from "next/link";
import { getCurrentMembership, getQualityImprovements } from "@/lib/control-api";
import { decideProposal } from "./actions";

const states = { pending: "Pendiente", approved: "Investigación aprobada", rejected: "Rechazada", changes_requested: "Ajustes solicitados" };
const time = (value: string) => new Date(value).toLocaleString("es-MX", { timeZone: "America/Mexico_City" });

export default async function ImprovementsPage({ searchParams }: { searchParams: Promise<{ notice?: string; page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Math.min(1000000, Math.floor(Number(params.page) || 1)));
  const [member, inbox] = await Promise.all([
    getCurrentMembership(), getQualityImprovements(page).catch(() => null),
  ]);
  const canDecide = ["owner", "admin"].includes(member.role);
  return <main className="members-shell">
    <header className="members-header"><div><p className="eyebrow">Calidad continua</p><h1>Propuestas de mejora</h1>
      <p className="muted">Revisión semanal de intentos y logs nuevos. Las llamadas ya revisadas se omiten.</p></div>
      <Link href="/app/quality">Volver a Calidad</Link></header>
    <p className="security-note">Aprobar autoriza investigar la propuesta. Cada cambio concreto necesita pruebas y revisión antes de desplegarse.</p>
    {params.notice === "saved" && <p role="status">Decisión guardada. No se modificó el agente.</p>}
    {params.notice === "failed" && <p role="alert">No se pudo guardar. La propuesta puede haber cambiado o tus permisos pueden ser insuficientes. Revisa su estado e inténtalo de nuevo.</p>}
    {!inbox ? <p role="alert">La bandeja no está disponible. Verifica tus permisos y que el backend de desarrollo incluya calidad continua.</p> : <>
      <section className="detail-card"><h2>Seguimiento semanal</h2>
        <p>{inbox.counts.completed ?? 0} llamadas revisadas · {inbox.pending_proposals} propuestas pendientes · {inbox.counts.retry ?? 0} reintentos pendientes · {inbox.counts.blocked ?? 0} bloqueadas</p>
        <p className="muted">Programación preparada: lunes a las 03:00, hora de Ciudad de México, con hasta 10 minutos de demora. El temporizador se instala por separado en desarrollo.</p>
        {!inbox.runs.length && <p>Aún no hay ejecuciones registradas.</p>}
        {inbox.runs.map(run => <p key={run.id}>{time(run.started_at)} · {run.status === "completed" ? "Completada" : run.status === "failed" ? "Con errores" : "En proceso"}: {run.counters.reviewed ?? 0} nuevas revisadas, {run.counters.already_reviewed ?? 0} omitidas, {run.counters.deferred ?? 0} diferidas, {run.counters.unfinalized ?? 0} sin finalizar, {run.counters.failed ?? 0} fallidas.</p>)}
      </section>
      {!inbox.proposals.length && <p className="muted">No hay propuestas en esta página. Esto no demuestra que todas las llamadas sean correctas; consulta la cobertura de las ejecuciones.</p>}
      {inbox.proposals.map(proposal => <article className="detail-card" key={proposal.id}>
        <p className="eyebrow">{states[proposal.status]} · {proposal.payload.evaluation_mode === "openai" ? "Reglas + OpenAI" : proposal.payload.evaluation_mode === "telephony_only" ? "Telefonía, sin conversación evaluable" : "Reglas técnicas"}</p>
        <h2>{proposal.payload.title}</h2>
        <p>{proposal.payload.recommendation}</p>
        <p className="muted">{proposal.payload.limitations}</p>
        <p>Llamada <code>{proposal.call_uuid.slice(0, 8)}</code> · {time(proposal.created_at)}</p>
        {proposal.payload.evidence_ids.length > 0 && <p className="muted">Referencias de evidencia en el log: {proposal.payload.evidence_ids.join(", ")}. Consulta autorizada por UUID.</p>}
        {proposal.payload.telephony && <p>Diagnóstico telefónico: AMI {proposal.payload.telephony.ami_reason ?? "no registrado"} · colgado {proposal.payload.telephony.hangup_cause ?? "no registrado"} · SIP {proposal.payload.telephony.sip_status ?? "no registrado"}. Sistema: {proposal.payload.telephony.error_code}.</p>}
        {proposal.payload.evaluation_mode !== "telephony_only" ? <dl><dt>Turnos cliente / agente</dt><dd>{proposal.payload.metrics.client_turns ?? 0} / {proposal.payload.metrics.agent_turns ?? 0}</dd>
          <dt>Primer audio p95 en esta llamada</dt><dd>{proposal.payload.metrics.first_audio_p95_ms == null ? "Sin muestras" : `${proposal.payload.metrics.first_audio_p95_ms} ms`}</dd></dl> : <p className="muted">No hay conversación evaluable. Esta revisión utiliza sólo el estado y los códigos telefónicos.</p>}
        <details><summary>Versión de la propuesta</summary><p><code>{proposal.candidate_hash}</code></p></details>
        {proposal.decided_at && <p className="muted">Decisión registrada el {time(proposal.decided_at)}.</p>}
        {canDecide && proposal.status === "pending" && <form action={decideProposal}>
          <input type="hidden" name="id" value={proposal.id} />
          <input type="hidden" name="candidate_hash" value={proposal.candidate_hash} />
          <div className="quality-filter-actions">
            <button type="submit" className="primary-action" name="decision" value="approved">Aprobar investigación</button>
            <button type="submit" className="secondary-action" name="decision" value="changes_requested">Solicitar ajustes</button>
            <button type="submit" className="secondary-action" name="decision" value="rejected">Rechazar</button>
          </div>
        </form>}
      </article>)}
      <nav aria-label="Páginas de propuestas" className="quality-filter-actions">
        {page > 1 && <Link href={`/app/quality/improvements?page=${page-1}`}>Anterior</Link>}
        <span>Página {page}</span>
        {page * 100 < inbox.total_proposals && <Link href={`/app/quality/improvements?page=${page+1}`}>Siguiente</Link>}
      </nav>
    </>}
  </main>;
}
