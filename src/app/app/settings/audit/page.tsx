import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuditEvents, getCurrentMembership } from "@/lib/control-api";

const labels: Record<string, string> = {
  "campaign.created": "Campaña creada",
  "campaign.status_changed": "Estado de campaña actualizado",
  "member.invited": "Usuario invitado",
  "member.invitation_accepted": "Invitación aceptada",
  "member.invitation_revoked": "Invitación cancelada",
  "member.role_changed": "Rol actualizado",
  "member.revoked": "Acceso revocado",
  "data_source.created": "Fuente creada",
  "portfolio.created": "Cartera creada",
  "agent_profile.version_created": "Versión de agente creada",
};
const dateTime = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium", timeStyle: "medium", timeZone: "America/Mexico_City",
});

function changeSummary(metadata: Record<string, unknown>) {
  if (metadata.from && metadata.to) return `${String(metadata.from)} → ${String(metadata.to)}`;
  if (metadata.role) return `Rol: ${String(metadata.role)}`;
  if (metadata.version) return `Versión ${String(metadata.version)}`;
  if (metadata.adapter_type) return String(metadata.adapter_type).toUpperCase();
  return "Cambio registrado";
}

export default async function AuditPage() {
  const membership = await getCurrentMembership();
  if (!["owner", "admin", "analyst"].includes(membership.role)) redirect("/");
  const events = await getAuditEvents().catch(() => null);
  if (!events) redirect("/");

  return (
    <main className="members-shell">
      <header className="members-header"><div><p className="eyebrow">Configuración</p><h1>Auditoría</h1><p className="muted">Cambios administrativos y operativos de la organización.</p></div><Link href="/">← Volver al resumen</Link></header>
      <section className="audit-page-card">
        <div className="audit-page-head"><span>Evento</span><span>Actor</span><span>Cambio</span><span>Fecha</span></div>
        {events.map((event) => <article className="audit-page-row" key={event.id}><div><strong>{labels[event.action] ?? event.action}</strong><small>{event.entity_type} · {event.entity_id.slice(0, 8)}</small></div><span>{event.actor_display_name ?? event.actor_subject}</span><code>{changeSummary(event.metadata)}</code><time dateTime={event.created_at}>{dateTime.format(new Date(event.created_at))}</time></article>)}
        {!events.length && <p className="empty-state">Todavía no hay eventos de auditoría.</p>}
      </section>
    </main>
  );
}
