import Link from "next/link";

import { getMonitoringCalls, getQualityCalls, getQualityConversation } from "@/lib/control-api";
import type { MonitoringCallRecord, QualityCallRecord } from "@/lib/control-api";
import { QualityPoller } from "./quality-poller";

const kindLabel = { client: "Cliente", agent: "Agente", system: "Sistema", voicemail: "Buzón" } as const;

type MonitoringFilters = {
  call?: string;
  search?: string;
  campaign?: string;
  agent?: string;
  date_from?: string;
  date_to?: string;
};

/** Entrada unificada para la lista de calidad. */
type QualityListItem = {
  id: string;
  call_uuid: string;
  contact_name: string | null;
  campaign_name: string | null;
  agent_name: string | null;
  round_number: number;
  telephony_result: string | null;
  labels: { id: string; name: string }[];
  created_at: string;
  started_at: string | null;
  /** true cuando la entrada viene sólo de logs (llamada manual sin registro en BD) */
  is_manual: boolean;
};

function fromMonitoring(r: MonitoringCallRecord): QualityListItem {
  return {
    id: r.id,
    call_uuid: r.call_uuid,
    contact_name: r.contact_name,
    campaign_name: r.campaign_name,
    agent_name: r.agent_name,
    round_number: r.round_number,
    telephony_result: r.telephony_result,
    labels: r.labels,
    created_at: r.created_at,
    started_at: r.started_at,
    is_manual: false,
  };
}

function fromQualityLog(r: QualityCallRecord): QualityListItem {
  return {
    id: r.uuid,
    call_uuid: r.uuid,
    contact_name: null,
    campaign_name: r.campaign_name ?? null,
    agent_name: r.agent_name ?? null,
    round_number: 1,
    telephony_result: null,
    labels: [],
    created_at: r.updated_at,
    started_at: null,
    is_manual: true,
  };
}

function matchesFilters(
  item: { created_at: string; campaign_name?: string | null; agent_name?: string | null },
  filters: MonitoringFilters,
) {
  const date = item.created_at.slice(0, 10);
  const campaign = filters.campaign?.trim().toLowerCase();
  const agent = filters.agent?.trim().toLowerCase();
  return (
    (!campaign || (item.campaign_name ?? "").toLowerCase().includes(campaign)) &&
    (!agent || (item.agent_name ?? "").toLowerCase().includes(agent)) &&
    (!filters.date_from || date >= filters.date_from) &&
    (!filters.date_to || date <= filters.date_to)
  );
}

export default async function QualityPage({ searchParams }: { searchParams: Promise<MonitoringFilters> }) {
  const filters = await searchParams;

  const [monitoringCalls, qualitySummaries] = await Promise.all([
    getMonitoringCalls({ search: filters.search || undefined, limit: 200 }),
    getQualityCalls(200).catch(() => [] as import("@/lib/control-api").QualityCallRecord[]),
  ]);

  // UUIDs ya presentes en monitoring (llamadas de campaña)
  const monitoringUuids = new Set(monitoringCalls.map((r) => r.call_uuid));

  // Llamadas manuales: presentes en quality/calls pero no en monitoring
  const manualCalls = qualitySummaries
    .filter((r) => !monitoringUuids.has(r.uuid))
    .map(fromQualityLog);

  // Fusión ordenada por created_at DESC
  const allCalls: QualityListItem[] = [
    ...monitoringCalls.map(fromMonitoring),
    ...manualCalls,
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  const calls = allCalls.filter((item) => matchesFilters(item, filters));

  const callId = filters.call;
  const selected =
    callId && calls.some((item) => item.call_uuid === callId)
      ? await getQualityConversation(callId).catch(() => null)
      : null;

  const selectedMeta = calls.find((item) => item.call_uuid === filters.call);

  const filterQuery = new URLSearchParams();
  for (const key of ["search", "date_from", "date_to", "campaign", "agent"] as const) {
    if (filters[key]) filterQuery.set(key, filters[key]!);
  }

  return (
    <main className="members-shell quality-page">
      <QualityPoller />
      <header className="members-header">
        <div>
          <p className="eyebrow">Supervisión</p>
          <h1>Calidad</h1>
          <p className="muted">Monitorea llamadas en tiempo real, revisa etiquetas y conversaciones.</p>
        </div>
        <Link href="/">← Volver al pulso</Link>
      </header>

      <form className="quality-filters">
        <label>
          Buscar contacto
          <input name="search" defaultValue={filters.search} placeholder="Nombre del contacto" />
        </label>
        <label>
          Campaña
          <input name="campaign" defaultValue={filters.campaign} placeholder="Nombre de campaña" />
        </label>
        <label>
          Agente
          <input name="agent" defaultValue={filters.agent} placeholder="Nombre del agente" />
        </label>
        <label>
          Desde
          <input name="date_from" type="date" defaultValue={filters.date_from} />
        </label>
        <label>
          Hasta
          <input name="date_to" type="date" defaultValue={filters.date_to} />
        </label>
        <div className="quality-filter-actions">
          <button className="secondary-action">Aplicar filtros</button>
          <Link href="/app/quality">Limpiar</Link>
        </div>
      </form>

      <section className="quality-layout">
        <aside className="quality-list">
          <div className="quality-list-heading">
            <strong>{calls.length} conversaciones</strong>
            <small>Actualiza cada 15 s</small>
          </div>
          <div className="quality-call-scroll">
            {calls.map((item) => {
              const params = new URLSearchParams(filterQuery);
              params.set("call", item.call_uuid);
              const dateLabel = item.created_at
                ? new Date(item.created_at).toLocaleDateString("es-MX")
                : "—";
              const timeLabel = item.started_at
                ? new Date(item.started_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
                : item.created_at.slice(11, 16);
              return (
                <Link
                  className={item.call_uuid === filters.call ? "active" : ""}
                  href={`/app/quality?${params}`}
                  key={item.id}
                >
                  <div className="qcall-top">
                    <strong>{item.contact_name ?? (item.is_manual ? "Sin registro" : "Contacto desconocido")}</strong>
                    <small>{dateLabel} · {timeLabel}</small>
                  </div>
                  <div className="qcall-bottom">
                    <span className="quality-call-meta">
                      {item.is_manual
                        ? <em style={{ fontStyle: "normal", color: "var(--muted)" }}>Llamada manual</em>
                        : [item.campaign_name, item.agent_name].filter(Boolean).join(" · ") || <>&nbsp;</>
                      }
                    </span>
                    {!item.is_manual && (
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>r{item.round_number}</span>
                    )}
                  </div>
                  {(item.telephony_result || item.labels.length > 0) && (
                    <div className="monitoring-labels">
                      {item.telephony_result && (
                        <span className="label-chip label-chip--telephony">{item.telephony_result}</span>
                      )}
                      {item.labels.map((label) => (
                        <span className="label-chip" key={label.id}>{label.name}</span>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
            {!calls.length && (
              <p className="muted">No encontramos conversaciones con estos filtros.</p>
            )}
          </div>
        </aside>

        <article className="conversation-viewer">
          {selected ? (
            <>
              <div className="conversation-heading">
                <div>
                  <p className="eyebrow">Conversación</p>
                  <h2>{selectedMeta?.contact_name ?? "Revisión de llamada"}</h2>
                  {selectedMeta?.campaign_name && (
                    <small className="quality-conv-meta">
                      {selectedMeta.campaign_name}
                      {selectedMeta.agent_name ? ` · ${selectedMeta.agent_name}` : ""}
                      {selectedMeta.telephony_result ? ` · ${selectedMeta.telephony_result}` : ""}
                    </small>
                  )}
                  {selectedMeta && selectedMeta.labels.length > 0 && (
                    <div className="monitoring-labels" style={{ marginTop: 8 }}>
                      {selectedMeta.labels.map((label) => (
                        <span className="label-chip" key={label.id}>{label.name}</span>
                      ))}
                    </div>
                  )}
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
                {!selected.events.length && (
                  <p className="muted">No se detectaron turnos conversacionales en esta llamada.</p>
                )}
              </div>
              {selected.truncated && (
                <p className="security-note">La conversación fue recortada para mantener una lectura segura.</p>
              )}
            </>
          ) : (
            <div className="conversation-placeholder">
              <p className="eyebrow">Lectura bajo demanda</p>
              <h2>Selecciona una conversación</h2>
              <p className="muted">El listado y esta conversación tienen scroll independiente para conservar el contexto.</p>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
