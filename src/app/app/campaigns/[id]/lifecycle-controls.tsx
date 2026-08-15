"use client";

import { useActionState } from "react";

import { changeCampaignLifecycle, type LifecycleState } from "./actions";

const transitions: Record<string, { status: string; label: string; danger?: boolean }[]> = {
  draft: [{ status: "scheduled", label: "Programar campaña" }, { status: "cancelled", label: "Cancelar", danger: true }],
  scheduled: [{ status: "running", label: "Marcar en curso" }, { status: "paused", label: "Pausar" }, { status: "cancelled", label: "Cancelar", danger: true }],
  running: [{ status: "paused", label: "Pausar" }, { status: "cancelled", label: "Cancelar", danger: true }],
  paused: [{ status: "scheduled", label: "Reprogramar" }, { status: "running", label: "Reanudar" }, { status: "cancelled", label: "Cancelar", danger: true }],
};

export function LifecycleControls({ campaignId, status, canManage, preflightReady }: { campaignId: string; status: string; canManage: boolean; preflightReady: boolean }) {
  const action = changeCampaignLifecycle.bind(null, campaignId);
  const [state, formAction, pending] = useActionState<LifecycleState, FormData>(action, {});
  const options = transitions[status] ?? [];
  if (!canManage || !options.length) return null;

  return (
    <form className="lifecycle-card" action={formAction} onSubmit={(event) => {
      const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      if (!submitter || !window.confirm(`¿Confirmas la acción “${submitter.textContent}”?`)) event.preventDefault();
    }}>
      <div><p className="eyebrow">Control administrativo</p><strong>Cambiar ciclo de campaña</strong><small>Estas acciones no inician llamadas ni activan el dispatcher.</small></div>
      <label>Razón operativa <input name="reason" maxLength={300} placeholder="Opcional, recomendada para pausa o cancelación" /></label>
      <div className="lifecycle-actions">{options.map((option) => { const needsPreflight = option.status === "scheduled" || option.status === "running"; return <button disabled={pending || (needsPreflight && !preflightReady)} title={needsPreflight && !preflightReady ? "Resuelve la prevalidación antes de continuar" : undefined} className={option.danger ? "danger-action" : "secondary-action"} name="status" value={option.status} key={option.status}>{option.label}</button>; })}</div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </form>
  );
}
