"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { submitCampaign } from "./actions";
import type { AgentProfileRecord, PortfolioRecord, TelephonyResultOption } from "@/lib/control-api";

type AgentWithLabels = AgentProfileRecord & { labels: { id: string; name: string }[] };

const steps = ["Objetivo", "Cartera", "Agente", "Dialer", "Programación", "Revisión"];
const timezoneOffsets: Record<string, string> = {
  "America/Mexico_City": "-06:00",
  "America/Monterrey": "-06:00",
};

function scheduledIso(localValue: string, timezone: string) {
  return `${localValue}:00${timezoneOffsets[timezone] ?? "-06:00"}`;
}

export function CampaignWizard({
  portfolios,
  agentProfiles,
  telephonyResults,
}: {
  portfolios: PortfolioRecord[];
  agentProfiles: AgentWithLabels[];
  telephonyResults: TelephonyResultOption[];
}) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    objective: "payment_reminder" as "payment_reminder" | "agreement_follow_up",
    portfolioId: portfolios[0]?.id ?? "",
    agentProfileVersionId: agentProfiles[0]?.id ?? "",
    // Dialer
    rounds: 1,
    cooldownMinutes: 60,
    telephonyFilter: [] as string[],
    labelFilter: [] as string[],
    // Schedule
    timezone: "America/Mexico_City",
    startAt: "",
    endAt: "",
    retryMinutes: 15,
    maxAttempts: 3,
    notes: "",
  });

  const portfolio = useMemo(
    () => portfolios.find((item) => item.id === draft.portfolioId),
    [draft.portfolioId, portfolios],
  );
  const selectedAgent = useMemo(
    () => agentProfiles.find((a) => a.id === draft.agentProfileVersionId),
    [draft.agentProfileVersionId, agentProfiles],
  );

  function toggleTelephonyFilter(value: string) {
    setDraft((prev) => ({
      ...prev,
      telephonyFilter: prev.telephonyFilter.includes(value)
        ? prev.telephonyFilter.filter((v) => v !== value)
        : [...prev.telephonyFilter, value],
    }));
  }

  function toggleLabelFilter(id: string) {
    setDraft((prev) => ({
      ...prev,
      labelFilter: prev.labelFilter.includes(id)
        ? prev.labelFilter.filter((v) => v !== id)
        : [...prev.labelFilter, id],
    }));
  }

  function next() {
    setError("");
    if (step === 0 && !draft.name.trim()) return setError("Escribe un nombre para la campaña.");
    if (step === 1 && !draft.portfolioId) return setError("Selecciona una cartera.");
    if (step === 2 && !draft.agentProfileVersionId) return setError("Selecciona un agente.");
    if (step === 4 && (!draft.startAt || !draft.endAt || draft.endAt <= draft.startAt))
      return setError("Configura una ventana de ejecución válida.");
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  function create() {
    setError("");
    startTransition(async () => {
      try {
        await submitCampaign({
          name: draft.name.trim(),
          objective: draft.objective,
          portfolio_id: draft.portfolioId,
          agent_profile_version_id: draft.agentProfileVersionId,
          dialer: {
            rounds: draft.rounds,
            cooldown_minutes: draft.cooldownMinutes,
            telephony_filter: draft.telephonyFilter,
            label_filter: draft.labelFilter,
          },
          schedule: {
            timezone: draft.timezone,
            start_at: scheduledIso(draft.startAt, draft.timezone),
            end_at: scheduledIso(draft.endAt, draft.timezone),
            retry_minutes: draft.retryMinutes,
            max_attempts_per_recipient: draft.maxAttempts,
          },
          notes: draft.notes.trim(),
        });
      } catch {
        setError("No fue posible crear la campaña. Revisa los datos e inténtalo de nuevo.");
      }
    });
  }

  const lastStep = steps.length - 1;

  return (
    <main className="wizard-shell">
      <header className="wizard-header">
        <Link href="/app/campaigns">← Volver</Link>
        <div className="brand"><span className="brand-mark">C</span><span>cadencia</span></div>
        <span>Borrador seguro</span>
      </header>
      <section className="wizard-layout">
        <aside>
          <p className="eyebrow">Nueva campaña</p>
          <ol>
            {steps.map((label, index) => (
              <li
                className={index === step ? "current" : index < step ? "done" : ""}
                key={label}
              >
                <span>{index + 1}</span>{label}
              </li>
            ))}
          </ol>
        </aside>
        <section className="wizard-form">
          <p className="eyebrow">Paso {step + 1} de {steps.length}</p>

          {/* Step 0: Objetivo */}
          {step === 0 && (
            <>
              <h1>¿Qué quieres lograr?</h1>
              <p className="muted">El objetivo define las políticas y métricas de la conversación.</p>
              <label>
                Nombre de la campaña
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ej. Recordatorio segunda quincena" />
              </label>
              <fieldset>
                <legend>Objetivo</legend>
                <label className={`choice ${draft.objective === "payment_reminder" ? "active" : ""}`}>
                  <input type="radio" checked={draft.objective === "payment_reminder"} onChange={() => setDraft({ ...draft, objective: "payment_reminder" })} />
                  <span><strong>Recordatorio de pago</strong><small>Busca una fecha y monto concretos sin presión indebida.</small></span>
                </label>
                <label className={`choice ${draft.objective === "agreement_follow_up" ? "active" : ""}`}>
                  <input type="radio" checked={draft.objective === "agreement_follow_up"} onChange={() => setDraft({ ...draft, objective: "agreement_follow_up" })} />
                  <span><strong>Seguimiento de acuerdo</strong><small>Confirma el estado de un compromiso existente.</small></span>
                </label>
              </fieldset>
            </>
          )}

          {/* Step 1: Cartera */}
          {step === 1 && (
            <>
              <h1>Conecta los destinatarios</h1>
              <p className="muted">Selecciona la cartera con los contactos de esta campaña.</p>
              {portfolios.length ? (
                <fieldset>
                  {portfolios.map((item) => (
                    <label className={`choice ${draft.portfolioId === item.id ? "active" : ""}`} key={item.id}>
                      <input type="radio" checked={draft.portfolioId === item.id} onChange={() => setDraft({ ...draft, portfolioId: item.id })} />
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.estimated_recipients ?? "Sin estimación"} destinatarios · {item.external_key}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
              ) : (
                <div className="empty-state">
                  No hay carteras disponibles. <Link href="/app/settings/catalogs">Crea una cartera primero.</Link>
                </div>
              )}
            </>
          )}

          {/* Step 2: Agente */}
          {step === 2 && (
            <>
              <h1>Selecciona el agente</h1>
              <p className="muted">Elige el perfil de agente preexistente que representará a tu empresa en esta campaña.</p>
              {agentProfiles.length ? (
                <fieldset>
                  {agentProfiles.map((agent) => (
                    <label className={`choice ${draft.agentProfileVersionId === agent.id ? "active" : ""}`} key={agent.id}>
                      <input type="radio" checked={draft.agentProfileVersionId === agent.id} onChange={() => setDraft({ ...draft, agentProfileVersionId: agent.id, labelFilter: [] })} />
                      <span>
                        <strong>{agent.agent_name}</strong>
                        <small>{agent.company_name} · v{agent.version}{agent.objective ? ` · ${agent.objective}` : ""}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
              ) : (
                <div className="empty-state">
                  No hay agentes configurados. <Link href="/app/agents/new">Crea un agente primero.</Link>
                </div>
              )}
              {selectedAgent && (
                <div className="agent-preview-box">
                  <p className="eyebrow" style={{ marginBottom: 6 }}>Vista previa</p>
                  <strong>{selectedAgent.agent_name}</strong> para <strong>{selectedAgent.company_name}</strong>
                  {selectedAgent.personality && <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 13 }}>{selectedAgent.personality}</p>}
                </div>
              )}
            </>
          )}

          {/* Step 3: Dialer */}
          {step === 3 && (
            <>
              <h1>Configuración del marcador</h1>
              <p className="muted">Define cuántas rondas de llamadas se realizarán y qué resultados disparan una nueva ronda.</p>
              <div className="form-grid">
                <label>
                  Rondas de llamadas
                  <input type="number" min="1" max="10" value={draft.rounds} onChange={(e) => setDraft({ ...draft, rounds: Number(e.target.value) })} />
                </label>
                {draft.rounds > 1 && (
                  <label>
                    Minutos de espera entre rondas
                    <input type="number" min="1" max="10080" value={draft.cooldownMinutes} onChange={(e) => setDraft({ ...draft, cooldownMinutes: Number(e.target.value) })} />
                  </label>
                )}
              </div>
              {telephonyResults.length > 0 && (
                <fieldset>
                  <legend>Filtro de resultados de telefonía</legend>
                  <p className="muted" style={{ marginBottom: 10, fontSize: 13 }}>Si marcas resultados, solo los contactos con esos resultados recibirán la siguiente ronda.</p>
                  {telephonyResults.map((opt) => (
                    <label key={opt.value} className="checkbox" style={{ marginBottom: 8 }}>
                      <input type="checkbox" checked={draft.telephonyFilter.includes(opt.value)} onChange={() => toggleTelephonyFilter(opt.value)} />
                      {opt.label}
                    </label>
                  ))}
                </fieldset>
              )}
              {selectedAgent && selectedAgent.labels.length > 0 && (
                <fieldset>
                  <legend>Filtro de etiquetas</legend>
                  <p className="muted" style={{ marginBottom: 10, fontSize: 13 }}>Solo los contactos con estas etiquetas detectadas recibirán la siguiente ronda.</p>
                  {selectedAgent.labels.map((label) => (
                    <label key={label.id} className="checkbox" style={{ marginBottom: 8 }}>
                      <input type="checkbox" checked={draft.labelFilter.includes(label.id)} onChange={() => toggleLabelFilter(label.id)} />
                      {label.name}
                    </label>
                  ))}
                </fieldset>
              )}
            </>
          )}

          {/* Step 4: Programación */}
          {step === 4 && (
            <>
              <h1>Programa la ejecución</h1>
              <p className="muted">Define la ventana y límites de reintentos; crear la campaña no inicia llamadas.</p>
              <div className="form-grid">
                <label>
                  Inicio
                  <input type="datetime-local" value={draft.startAt} onChange={(e) => setDraft({ ...draft, startAt: e.target.value })} />
                </label>
                <label>
                  Fin
                  <input type="datetime-local" value={draft.endAt} onChange={(e) => setDraft({ ...draft, endAt: e.target.value })} />
                </label>
                <label>
                  Zona horaria
                  <select value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}>
                    <option value="America/Mexico_City">America/Mexico_City</option>
                    <option value="America/Monterrey">America/Monterrey</option>
                  </select>
                </label>
                <label>
                  Minutos entre reintentos
                  <input type="number" min="1" max="1440" value={draft.retryMinutes} onChange={(e) => setDraft({ ...draft, retryMinutes: Number(e.target.value) })} />
                </label>
                <label>
                  Máximo de intentos
                  <input type="number" min="1" max="20" value={draft.maxAttempts} onChange={(e) => setDraft({ ...draft, maxAttempts: Number(e.target.value) })} />
                </label>
              </div>
              <label>
                Notas
                <textarea value={draft.notes} maxLength={500} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Contexto operativo opcional" />
              </label>
            </>
          )}

          {/* Step 5: Revisión */}
          {step === 5 && (
            <>
              <h1>Revisa antes de crear</h1>
              <p className="muted">La campaña se guardará como borrador; no originará llamadas automáticamente.</p>
              <dl className="review-list">
                <div><dt>Campaña</dt><dd>{draft.name}</dd></div>
                <div><dt>Objetivo</dt><dd>{draft.objective === "payment_reminder" ? "Recordatorio de pago" : "Seguimiento de acuerdo"}</dd></div>
                <div><dt>Cartera</dt><dd>{portfolio?.name ?? draft.portfolioId}</dd></div>
                <div><dt>Agente</dt><dd>{selectedAgent ? `${selectedAgent.agent_name} para ${selectedAgent.company_name} (v${selectedAgent.version})` : draft.agentProfileVersionId}</dd></div>
                <div><dt>Rondas</dt><dd>{draft.rounds}{draft.rounds > 1 ? ` · cada ${draft.cooldownMinutes} min` : ""}</dd></div>
                <div><dt>Ventana</dt><dd>{draft.startAt} a {draft.endAt} · {draft.timezone}</dd></div>
                <div><dt>Reintentos</dt><dd>{draft.maxAttempts} intentos · cada {draft.retryMinutes} minutos</dd></div>
              </dl>
            </>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="wizard-actions">
            {step > 0 && (
              <button type="button" className="secondary-action" onClick={() => setStep(step - 1)}>← Anterior</button>
            )}
            {step < lastStep ? (
              <button type="button" className="primary-action" onClick={next}>Continuar →</button>
            ) : (
              <button type="button" className="primary-action" disabled={pending} onClick={create}>
                {pending ? "Creando…" : "Crear campaña"}
              </button>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
