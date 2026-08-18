"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { saveAgentEdit, type AgentEditState } from "./actions";
import type { AgentProfileRecord } from "@/lib/control-api";

const SCRIPT_VARS = "{{nombre_cliente}}, {{saldo_pendiente}}, {{dia_pago}}, {{articulo}}, {{pagos_atrasados}}, {{modalidad}}, {{cuota_semanal}}, {{campaign_name}}, {{company_name}}, {{agent_name}}";

export function EditAgentForm({ agent }: { agent: AgentProfileRecord }) {
  const boundAction = saveAgentEdit.bind(null, agent.id);
  const [state, formAction, pending] = useActionState<AgentEditState, FormData>(boundAction, {});
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      toast.success("Cambios guardados", { description: state.ok });
      router.push(`/app/agents/${agent.id}`);
    } else if (state.error) {
      toast.error("Error al guardar", { description: state.error });
    }
  }, [state, agent.id, router]);

  return (
    <form action={formAction} className="campaign-edit-form">
      <section className="edit-section">
        <p className="eyebrow">Identidad del agente</p>
        <div className="form-grid">
          <label>
            Nombre del agente
            <input name="agent_name" required defaultValue={agent.agent_name} maxLength={120} />
          </label>
          <label>
            Empresa presentada
            <input name="company_name" required defaultValue={agent.company_name} maxLength={120} />
          </label>
          <label>
            ID de voz (opcional)
            <input name="voice_id" defaultValue={agent.voice_id ?? ""} placeholder="Se usará la voz predeterminada" />
          </label>
          <label>
            Objetivo
            <input name="objective" defaultValue={agent.objective ?? ""} placeholder="Gestión de cobranza y acuerdos de pago" />
          </label>
          <label className="wide-field">
            Personalidad y estilo
            <textarea name="personality" required defaultValue={agent.personality} maxLength={1000} rows={3} />
          </label>
        </div>
      </section>

      <section className="edit-section">
        <p className="eyebrow">Script de conversación</p>
        <p className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
          Variables disponibles: <code style={{ background: "#f0f1ed", padding: "2px 5px", borderRadius: 4, fontSize: 11 }}>{SCRIPT_VARS}</code>
        </p>
        <div className="form-grid">
          <label className="wide-field">
            Script principal
            <textarea name="script" defaultValue={agent.script ?? ""} rows={8} style={{ minHeight: 180 }} />
          </label>
          <label className="wide-field">
            Escenarios de flujo
            <textarea name="flow_scenarios" defaultValue={agent.flow_scenarios ?? ""} rows={6} style={{ minHeight: 140 }} />
          </label>
        </div>
      </section>

      {state.error && <p className="form-error" role="alert">{state.error}</p>}

      <div className="edit-actions">
        <button
          type="button"
          className="secondary-action"
          onClick={() => router.push(`/app/agents/${agent.id}`)}
        >
          Cancelar
        </button>
        <button type="submit" className="primary-action" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
