"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { submitCampaign } from "./actions";
import type { AgentProfileRecord, PortfolioRecord } from "@/lib/control-api";

const steps = ["Objetivo", "Cartera", "Agente", "Programación", "Revisión"];
const timezoneOffsets: Record<string, string> = {
  "America/Mexico_City": "-06:00",
  "America/Monterrey": "-06:00",
};

function scheduledIso(localValue: string, timezone: string) {
  return `${localValue}:00${timezoneOffsets[timezone] ?? "-06:00"}`;
}

export function CampaignWizard({ portfolios, profiles }: { portfolios: PortfolioRecord[]; profiles: AgentProfileRecord[] }) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    name: "", objective: "payment_reminder" as "payment_reminder" | "agreement_follow_up",
    portfolioId: portfolios[0]?.id ?? "", profileId: profiles[0]?.id ?? "",
    timezone: "America/Mexico_City", startAt: "", endAt: "", retryMinutes: 15,
    maxAttempts: 3, notes: "",
  });
  const portfolio = useMemo(() => portfolios.find((item) => item.id === draft.portfolioId), [draft.portfolioId, portfolios]);
  const profile = useMemo(() => profiles.find((item) => item.id === draft.profileId), [draft.profileId, profiles]);

  function next() {
    setError("");
    if (step === 0 && !draft.name.trim()) return setError("Escribe un nombre para la campaña.");
    if (step === 1 && !draft.portfolioId) return setError("Selecciona una cartera.");
    if (step === 2 && !draft.profileId) return setError("Selecciona un perfil de agente.");
    if (step === 3 && (!draft.startAt || !draft.endAt || draft.endAt <= draft.startAt)) return setError("Configura una ventana de ejecución válida.");
    setStep((current) => Math.min(4, current + 1));
  }

  function create() {
    setError("");
    startTransition(async () => {
      try {
        await submitCampaign({
          name: draft.name.trim(), objective: draft.objective, portfolio_id: draft.portfolioId,
          agent_profile_version_id: draft.profileId,
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
      <header className="wizard-header"><Link href="/">← Volver</Link><div className="brand"><span className="brand-mark">C</span><span>convergia</span></div><span>Borrador local</span></header>
      <section className="wizard-layout">
        <aside><p className="eyebrow">Nueva campaña</p><ol>{steps.map((label, index) => <li className={index === step ? "current" : index < step ? "done" : ""} key={label}><span>{index + 1}</span>{label}</li>)}</ol></aside>
        <section className="wizard-form">
          <p className="eyebrow">Paso {step + 1} de 5</p>
          {step === 0 && <><h1>¿Qué quieres lograr?</h1><p className="muted">El objetivo define las políticas y métricas de la conversación.</p><label>Nombre de la campaña<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ej. Recordatorio segunda quincena" /></label><fieldset><legend>Objetivo</legend><label className={`choice ${draft.objective === "payment_reminder" ? "active" : ""}`}><input type="radio" checked={draft.objective === "payment_reminder"} onChange={() => setDraft({ ...draft, objective: "payment_reminder" })} /><span><strong>Recordatorio de pago</strong><small>Busca una fecha y monto concretos sin presión indebida.</small></span></label><label className={`choice ${draft.objective === "agreement_follow_up" ? "active" : ""}`}><input type="radio" checked={draft.objective === "agreement_follow_up"} onChange={() => setDraft({ ...draft, objective: "agreement_follow_up" })} /><span><strong>Seguimiento de acuerdo</strong><small>Confirma el estado de un compromiso existente.</small></span></label></fieldset></>}
          {step === 1 && <><h1>Elige la cartera</h1><p className="muted">La cartera sólo referencia destinatarios autorizados de la fuente externa.</p>{portfolios.length ? <fieldset>{portfolios.map((item) => <label className={`choice ${draft.portfolioId === item.id ? "active" : ""}`} key={item.id}><input type="radio" checked={draft.portfolioId === item.id} onChange={() => setDraft({ ...draft, portfolioId: item.id })} /><span><strong>{item.name}</strong><small>{item.estimated_recipients ?? "Sin estimación"} destinatarios · {item.external_key}</small></span></label>)}</fieldset> : <div className="empty-state">No hay carteras configuradas. <Link href="/app/settings/catalogs">Crear catálogo →</Link></div>}</>}
          {step === 2 && <><h1>Selecciona al agente</h1><p className="muted">La versión elegida quedará congelada para esta campaña.</p>{profiles.length ? <fieldset>{profiles.map((item) => <label className={`choice ${draft.profileId === item.id ? "active" : ""}`} key={item.id}><input type="radio" checked={draft.profileId === item.id} onChange={() => setDraft({ ...draft, profileId: item.id })} /><span><strong>{item.agent_name} · {item.company_name}</strong><small>Versión {item.version} · {item.personality}</small></span></label>)}</fieldset> : <div className="empty-state">No hay perfiles configurados. <Link href="/app/settings/catalogs">Crear perfil →</Link></div>}</>}
          {step === 3 && <><h1>Programa la ejecución</h1><p className="muted">Define la ventana y límites de reintentos; crear la campaña no inicia llamadas.</p><div className="form-grid"><label>Inicio<input type="datetime-local" value={draft.startAt} onChange={(event) => setDraft({ ...draft, startAt: event.target.value })} /></label><label>Fin<input type="datetime-local" value={draft.endAt} onChange={(event) => setDraft({ ...draft, endAt: event.target.value })} /></label><label>Zona horaria<select value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })}><option value="America/Mexico_City">America/Mexico_City</option><option value="America/Monterrey">America/Monterrey</option></select></label><label>Minutos entre reintentos<input type="number" min="1" max="1440" value={draft.retryMinutes} onChange={(event) => setDraft({ ...draft, retryMinutes: Number(event.target.value) })} /></label><label>Máximo de intentos<input type="number" min="1" max="20" value={draft.maxAttempts} onChange={(event) => setDraft({ ...draft, maxAttempts: Number(event.target.value) })} /></label></div><label>Notas<textarea value={draft.notes} maxLength={500} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Contexto operativo opcional" /></label></>}
          {step === 4 && <><h1>Revisa antes de crear</h1><p className="muted">La campaña se guardará como borrador; no originará llamadas automáticamente.</p><dl className="review-list"><div><dt>Campaña</dt><dd>{draft.name}</dd></div><div><dt>Objetivo</dt><dd>{draft.objective === "payment_reminder" ? "Recordatorio de pago" : "Seguimiento de acuerdo"}</dd></div><div><dt>Cartera</dt><dd>{portfolio?.name}</dd></div><div><dt>Agente</dt><dd>{profile?.agent_name} para {profile?.company_name} · v{profile?.version}</dd></div><div><dt>Ventana</dt><dd>{draft.startAt} a {draft.endAt} · {draft.timezone}</dd></div><div><dt>Reintentos</dt><dd>{draft.maxAttempts} intentos · cada {draft.retryMinutes} minutos</dd></div></dl></>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="wizard-actions">{step > 0 && <button type="button" className="secondary-action" onClick={() => setStep(step - 1)}>← Anterior</button>}{step < 4 ? <button type="button" className="primary-action" onClick={next}>Continuar →</button> : <button type="button" className="primary-action" disabled={pending} onClick={create}>{pending ? "Creando…" : "Crear campaña"}</button>}</div>
        </section>
      </section>
    </main>
  );
}
