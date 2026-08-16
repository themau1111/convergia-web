"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { submitCampaign } from "./actions";
import type { PortfolioRecord } from "@/lib/control-api";

const steps = ["Objetivo", "Cartera", "Agente", "Programación", "Revisión"];
const timezoneOffsets: Record<string, string> = {
  "America/Mexico_City": "-06:00",
  "America/Monterrey": "-06:00",
};

function scheduledIso(localValue: string, timezone: string) {
  return `${localValue}:00${timezoneOffsets[timezone] ?? "-06:00"}`;
}

export function CampaignWizard({ portfolios }: { portfolios: PortfolioRecord[] }) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    name: "", objective: "payment_reminder" as "payment_reminder" | "agreement_follow_up",
    portfolioMode: "existing" as "existing" | "new", portfolioId: portfolios[0]?.id ?? "",
    sourceName: "", adapterType: "postgresql" as "mysql" | "postgresql" | "http_api",
    portfolioName: "", portfolioKey: "", estimatedRecipients: "",
    agentName: "Valeria", companyName: "", personality: "Empática, clara y directa. Explica antes de solicitar un compromiso y nunca inventa información.", voiceId: "",
    timezone: "America/Mexico_City", startAt: "", endAt: "", retryMinutes: 15,
    maxAttempts: 3, notes: "",
  });
  const portfolio = useMemo(() => portfolios.find((item) => item.id === draft.portfolioId), [draft.portfolioId, portfolios]);

  function next() {
    setError("");
    if (step === 0 && !draft.name.trim()) return setError("Escribe un nombre para la campaña.");
    if (step === 1 && draft.portfolioMode === "existing" && !draft.portfolioId) return setError("Selecciona una cartera.");
    if (step === 1 && draft.portfolioMode === "new" && (!draft.sourceName.trim() || !draft.portfolioName.trim() || !draft.portfolioKey.trim())) return setError("Completa la fuente y la cartera externa.");
    if (step === 2 && (!draft.agentName.trim() || !draft.companyName.trim() || !draft.personality.trim())) return setError("Completa empresa, agente y personalidad.");
    if (step === 3 && (!draft.startAt || !draft.endAt || draft.endAt <= draft.startAt)) return setError("Configura una ventana de ejecución válida.");
    setStep((current) => Math.min(4, current + 1));
  }

  function create() {
    setError("");
    startTransition(async () => {
      try {
        await submitCampaign({
          name: draft.name.trim(), objective: draft.objective,
          ...(draft.portfolioMode === "existing" ? { portfolio_id: draft.portfolioId } : {
            new_source: { name: draft.sourceName.trim(), adapter_type: draft.adapterType },
            new_portfolio: { name: draft.portfolioName.trim(), external_key: draft.portfolioKey.trim(), ...(draft.estimatedRecipients ? { estimated_recipients: Number(draft.estimatedRecipients) } : {}) },
          }),
          agent: { agent_name: draft.agentName.trim(), company_name: draft.companyName.trim(), personality: draft.personality.trim(), ...(draft.voiceId.trim() ? { voice_id: draft.voiceId.trim() } : {}) },
          schedule: {
            timezone: draft.timezone, start_at: scheduledIso(draft.startAt, draft.timezone),
            end_at: scheduledIso(draft.endAt, draft.timezone), retry_minutes: draft.retryMinutes,
            max_attempts_per_recipient: draft.maxAttempts,
          },
          notes: draft.notes.trim(),
        });
      } catch { setError("No fue posible crear la campaña. Revisa los datos e inténtalo de nuevo."); }
    });
  }

  return (
    <main className="wizard-shell">
      <header className="wizard-header"><Link href="/app/campaigns">← Volver</Link><div className="brand"><span className="brand-mark">C</span><span>cadencia</span></div><span>Borrador seguro</span></header>
      <section className="wizard-layout">
        <aside><p className="eyebrow">Nueva campaña</p><ol>{steps.map((label, index) => <li className={index === step ? "current" : index < step ? "done" : ""} key={label}><span>{index + 1}</span>{label}</li>)}</ol></aside>
        <section className="wizard-form">
          <p className="eyebrow">Paso {step + 1} de 5</p>
          {step === 0 && <><h1>¿Qué quieres lograr?</h1><p className="muted">El objetivo define las políticas y métricas de la conversación.</p><label>Nombre de la campaña<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ej. Recordatorio segunda quincena" /></label><fieldset><legend>Objetivo</legend><label className={`choice ${draft.objective === "payment_reminder" ? "active" : ""}`}><input type="radio" checked={draft.objective === "payment_reminder"} onChange={() => setDraft({ ...draft, objective: "payment_reminder" })} /><span><strong>Recordatorio de pago</strong><small>Busca una fecha y monto concretos sin presión indebida.</small></span></label><label className={`choice ${draft.objective === "agreement_follow_up" ? "active" : ""}`}><input type="radio" checked={draft.objective === "agreement_follow_up"} onChange={() => setDraft({ ...draft, objective: "agreement_follow_up" })} /><span><strong>Seguimiento de acuerdo</strong><small>Confirma el estado de un compromiso existente.</small></span></label></fieldset></>}
          {step === 1 && <><h1>Conecta los destinatarios</h1><p className="muted">Usa una cartera disponible o registra aquí la referencia externa de esta campaña.</p><div className="mode-switch"><button type="button" className={draft.portfolioMode === "existing" ? "active" : ""} onClick={() => setDraft({ ...draft, portfolioMode: "existing" })}>Cartera disponible</button><button type="button" className={draft.portfolioMode === "new" ? "active" : ""} onClick={() => setDraft({ ...draft, portfolioMode: "new" })}>Nueva fuente externa</button></div>{draft.portfolioMode === "existing" ? (portfolios.length ? <fieldset>{portfolios.map((item) => <label className={`choice ${draft.portfolioId === item.id ? "active" : ""}`} key={item.id}><input type="radio" checked={draft.portfolioId === item.id} onChange={() => setDraft({ ...draft, portfolioId: item.id })} /><span><strong>{item.name}</strong><small>{item.estimated_recipients ?? "Sin estimación"} destinatarios · {item.external_key}</small></span></label>)}</fieldset> : <div className="empty-state">No hay carteras disponibles. Elige “Nueva fuente externa”.</div>) : <div className="form-grid campaign-inline-config"><label>Nombre de la fuente<input value={draft.sourceName} onChange={(e) => setDraft({ ...draft, sourceName: e.target.value })} placeholder="Base del cliente" /></label><label>Tipo de conexión<select value={draft.adapterType} onChange={(e) => setDraft({ ...draft, adapterType: e.target.value as typeof draft.adapterType })}><option value="postgresql">PostgreSQL</option><option value="mysql">MySQL</option><option value="http_api">API HTTP</option></select></label><label>Nombre de la cartera<input value={draft.portfolioName} onChange={(e) => setDraft({ ...draft, portfolioName: e.target.value })} placeholder="Mora temprana" /></label><label>Clave externa<input value={draft.portfolioKey} onChange={(e) => setDraft({ ...draft, portfolioKey: e.target.value })} placeholder="mora_temprana" /></label><label>Destinatarios estimados<input type="number" min="0" value={draft.estimatedRecipients} onChange={(e) => setDraft({ ...draft, estimatedRecipients: e.target.value })} /></label><p className="security-note">Aquí se guarda la referencia. La conexión de sólo lectura se valida antes de programar llamadas.</p></div>}</>}
          {step === 2 && <><h1>Configura la voz de esta campaña</h1><p className="muted">Cadencia guardará una versión inmutable para que futuros cambios no alteren esta campaña.</p><div className="form-grid campaign-inline-config"><label>Empresa presentada<input value={draft.companyName} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} placeholder="Financiera Horizonte" /></label><label>Nombre del agente<input value={draft.agentName} onChange={(e) => setDraft({ ...draft, agentName: e.target.value })} /></label><label className="wide-field">Personalidad y estilo<textarea value={draft.personality} maxLength={1000} onChange={(e) => setDraft({ ...draft, personality: e.target.value })} /></label><label>ID de voz opcional<input value={draft.voiceId} onChange={(e) => setDraft({ ...draft, voiceId: e.target.value })} placeholder="Se usará la voz predeterminada" /></label></div></>}
          {step === 3 && <><h1>Programa la ejecución</h1><p className="muted">Define la ventana y límites de reintentos; crear la campaña no inicia llamadas.</p><div className="form-grid"><label>Inicio<input type="datetime-local" value={draft.startAt} onChange={(event) => setDraft({ ...draft, startAt: event.target.value })} /></label><label>Fin<input type="datetime-local" value={draft.endAt} onChange={(event) => setDraft({ ...draft, endAt: event.target.value })} /></label><label>Zona horaria<select value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })}><option value="America/Mexico_City">America/Mexico_City</option><option value="America/Monterrey">America/Monterrey</option></select></label><label>Minutos entre reintentos<input type="number" min="1" max="1440" value={draft.retryMinutes} onChange={(event) => setDraft({ ...draft, retryMinutes: Number(event.target.value) })} /></label><label>Máximo de intentos<input type="number" min="1" max="20" value={draft.maxAttempts} onChange={(event) => setDraft({ ...draft, maxAttempts: Number(event.target.value) })} /></label></div><label>Notas<textarea value={draft.notes} maxLength={500} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Contexto operativo opcional" /></label></>}
          {step === 4 && <><h1>Revisa antes de crear</h1><p className="muted">La campaña se guardará como borrador; no originará llamadas automáticamente.</p><dl className="review-list"><div><dt>Campaña</dt><dd>{draft.name}</dd></div><div><dt>Objetivo</dt><dd>{draft.objective === "payment_reminder" ? "Recordatorio de pago" : "Seguimiento de acuerdo"}</dd></div><div><dt>Cartera</dt><dd>{draft.portfolioMode === "existing" ? portfolio?.name : `${draft.portfolioName} · ${draft.sourceName}`}</dd></div><div><dt>Agente</dt><dd>{draft.agentName} para {draft.companyName}</dd></div><div><dt>Ventana</dt><dd>{draft.startAt} a {draft.endAt} · {draft.timezone}</dd></div><div><dt>Reintentos</dt><dd>{draft.maxAttempts} intentos · cada {draft.retryMinutes} minutos</dd></div></dl></>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="wizard-actions">{step > 0 && <button type="button" className="secondary-action" onClick={() => setStep(step - 1)}>← Anterior</button>}{step < 4 ? <button type="button" className="primary-action" onClick={next}>Continuar →</button> : <button type="button" className="primary-action" disabled={pending} onClick={create}>{pending ? "Creando…" : "Crear campaña"}</button>}</div>
        </section>
      </section>
    </main>
  );
}
