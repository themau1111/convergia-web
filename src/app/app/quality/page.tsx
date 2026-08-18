import Link from "next/link";

import { getQualityCalls, getQualityConversation } from "@/lib/control-api";
import { QualityPoller } from "./quality-poller";

const kindLabel = { client: "Cliente", agent: "Agente", system: "Sistema", voicemail: "Buzón" } as const;
type QualityFilters = { call?: string; id?: string; date_from?: string; date_to?: string; time_from?: string; time_to?: string; campaign?: string; agent?: string };

function matchesFilters(item: { updated_local: string; uuid: string; campaign_name?: string | null; agent_name?: string | null }, filters: QualityFilters) {
  const date = item.updated_local.slice(0, 10);
  const time = item.updated_local.slice(11, 19);
  const id = filters.id?.trim().toLowerCase();
  const campaign = filters.campaign?.trim().toLowerCase();
  const agent = filters.agent?.trim().toLowerCase();
  return (!id || item.uuid.toLowerCase().includes(id))
    && (!campaign || (item.campaign_name ?? "").toLowerCase().includes(campaign))
    && (!agent || (item.agent_name ?? "").toLowerCase().includes(agent))
    && (!filters.date_from || date >= filters.date_from)
    && (!filters.date_to || date <= filters.date_to)
    && (!filters.time_from || time >= filters.time_from)
    && (!filters.time_to || time <= filters.time_to);
}

export default async function QualityPage({ searchParams }: { searchParams: Promise<QualityFilters> }) {
  const filters = await searchParams;
  const allCalls = await getQualityCalls();
  const calls = allCalls.filter((item) => matchesFilters(item, filters));
  const selected = filters.call && calls.some((item) => item.uuid === filters.call)
    ? await getQualityConversation(filters.call)
    : null;
  const selectedMeta = calls.find((item) => item.uuid === filters.call);
  const filterQuery = new URLSearchParams();
  for (const key of ["id", "date_from", "date_to", "time_from", "time_to", "campaign", "agent"] as const) {
    if (filters[key]) filterQuery.set(key, filters[key]);
  }
  return (
    <main className="members-shell quality-page">
      <QualityPoller />
      <header className="members-header"><div><p className="eyebrow">Supervisión</p><h1>Calidad</h1><p className="muted">Busca una llamada y revisa su conversación sin exponer el log técnico completo.</p></div><Link href="/">← Volver al pulso</Link></header>
      <form className="quality-filters">
        <label>ID de llamada<input name="id" defaultValue={filters.id} placeholder="UUID completo o parcial" /></label>
        <label>Campaña<input name="campaign" defaultValue={filters.campaign} placeholder="Nombre de campaña" /></label>
        <label>Agente<input name="agent" defaultValue={filters.agent} placeholder="Nombre del agente" /></label>
        <label>Desde<input name="date_from" type="date" defaultValue={filters.date_from} /></label>
        <label>Hasta<input name="date_to" type="date" defaultValue={filters.date_to} /></label>
        <label>Hora inicial<input name="time_from" type="time" step="1" defaultValue={filters.time_from} /></label>
        <label>Hora final<input name="time_to" type="time" step="1" defaultValue={filters.time_to} /></label>
        <div className="quality-filter-actions"><button className="secondary-action">Aplicar filtros</button><Link href="/app/quality">Limpiar</Link></div>
      </form>
      <section className="quality-layout">
        <aside className="quality-list">
          <div className="quality-list-heading"><strong>{calls.length} conversaciones</strong><small>Actualiza cada 15 s</small></div>
          <div className="quality-call-scroll">
            {calls.map((item) => {
              const params = new URLSearchParams(filterQuery); params.set("call", item.uuid);
              return (
                <Link className={item.uuid === filters.call ? "active" : ""} href={`/app/quality?${params}`} key={item.uuid}>
                  <div className="qcall-top">
                    <strong>{new Date(item.updated_at).toLocaleDateString("es-MX")}</strong>
                    <small>{item.updated_local.slice(11, 19)} · {Math.ceil(item.size_bytes / 1024)} KB</small>
                  </div>
                  <div className="qcall-bottom">
                    <span className="quality-call-meta">{[item.campaign_name, item.agent_name].filter(Boolean).join(" · ") || <>&nbsp;</>}</span>
                    <code title={item.uuid}>{item.uuid.slice(0, 8)}</code>
                  </div>
                </Link>
              );
            })}
            {!calls.length && <p className="muted">No encontramos conversaciones con estos filtros.</p>}
          </div>
        </aside>
        <article className="conversation-viewer">
          {selected
            ? <>
                <div className="conversation-heading">
                  <div>
                    <p className="eyebrow">Conversación</p>
                    <h2>Revisión de llamada</h2>
                    {selectedMeta?.campaign_name && <small className="quality-conv-meta">{selectedMeta.campaign_name}{selectedMeta.agent_name ? ` · ${selectedMeta.agent_name}` : ""}</small>}
                  </div>
                  <code title={selected.uuid}>{selected.uuid.slice(0, 8)}</code>
                </div>
                <div className="conversation-events">
                  {selected.events.map((event, index) => (
                    <div className={`conversation-event ${event.kind}`} key={`${event.time}-${index}`}>
                      <small>{kindLabel[event.kind]} · {event.time || "sin marca"}</small>
                      <p>{event.text}</p>
                    </div>
                  ))}
                  {!selected.events.length && <p className="muted">No se detectaron turnos conversacionales en esta llamada.</p>}
                </div>
                {selected.truncated && <p className="security-note">La conversación fue recortada para mantener una lectura segura.</p>}
              </>
            : <div className="conversation-placeholder"><p className="eyebrow">Lectura bajo demanda</p><h2>Selecciona una conversación</h2><p className="muted">El listado y esta conversación tienen scroll independiente para conservar el contexto.</p></div>
          }
        </article>
      </section>
    </main>
  );
}
