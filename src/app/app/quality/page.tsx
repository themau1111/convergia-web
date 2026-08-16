import Link from "next/link";

import { getQualityCalls, getQualityConversation } from "@/lib/control-api";

const kindLabel = { client: "Cliente", agent: "Agente", system: "Sistema", voicemail: "Buzón" } as const;

export default async function QualityPage({ searchParams }: { searchParams: Promise<{ call?: string }> }) {
  const { call } = await searchParams;
  const calls = await getQualityCalls();
  const selected = call && calls.some((item) => item.uuid === call)
    ? await getQualityConversation(call)
    : null;
  return (
    <main className="members-shell quality-page">
      <header className="members-header"><div><p className="eyebrow">Supervisión</p><h1>Calidad</h1><p className="muted">Revisa conversaciones atribuidas a este workspace sin exponer el log técnico completo.</p></div><Link href="/">← Volver al pulso</Link></header>
      <section className="quality-layout">
        <aside className="quality-list">
          <div><strong>{calls.length} conversaciones</strong><small>Los turnos se cargan sólo al seleccionar una llamada.</small></div>
          {calls.map((item) => <Link className={item.uuid === call ? "active" : ""} href={`/app/quality?call=${encodeURIComponent(item.uuid)}`} key={item.uuid}><strong>{new Date(item.updated_at).toLocaleDateString("es-MX")}</strong><small>{item.updated_local.slice(11, 19)} · {Math.ceil(item.size_bytes / 1024)} KB</small><code>{item.uuid}</code></Link>)}
          {!calls.length && <p className="muted">Aún no hay conversaciones asociadas a las carteras del workspace.</p>}
        </aside>
        <article className="conversation-viewer">
          {selected ? <><div className="conversation-heading"><div><p className="eyebrow">Conversación</p><h2>Revisión de llamada</h2></div><code>{selected.uuid}</code></div><div className="conversation-events">{selected.events.map((event, index) => <div className={`conversation-event ${event.kind}`} key={`${event.time}-${index}`}><small>{kindLabel[event.kind]} · {event.time || "sin marca"}</small><p>{event.text}</p></div>)}{!selected.events.length && <p className="muted">No se detectaron turnos conversacionales en esta llamada.</p>}</div>{selected.truncated && <p className="security-note">La conversación fue recortada para mantener una lectura segura.</p>}</> : <div className="conversation-placeholder"><p className="eyebrow">Lectura bajo demanda</p><h2>Selecciona una conversación</h2><p className="muted">Cadencia mostrará únicamente los turnos útiles para supervisión de calidad.</p></div>}
        </article>
      </section>
    </main>
  );
}
