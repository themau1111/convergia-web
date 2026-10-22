"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { saveAgentEdit, type AgentEditState } from "./actions";
import type { AgentProfileRecord } from "@/lib/control-api";
import { PaymentOptionsForm } from "../../payment-options-form";
import { PromptImportDialog, type ImportedAgentFields } from "../../prompt-import-dialog";

const SCRIPT_VARS = "{{nombre_cliente}}, {{saldo_pendiente}}, {{dia_pago}}, {{articulo}}, {{pagos_atrasados}}, {{modalidad}}, {{cuota_semanal}}, {{campaign_name}}, {{company_name}}, {{agent_name}}";

export function EditAgentForm({ agent }: { agent: AgentProfileRecord }) {
  const boundAction = saveAgentEdit.bind(null, agent.id);
  const [state, formAction, pending] = useActionState<AgentEditState, FormData>(boundAction, {});
  const router = useRouter();

  const [agentName, setAgentName] = useState(agent.agent_name);
  const [companyName, setCompanyName] = useState(agent.company_name);
  const [objective, setObjective] = useState(agent.objective ?? "");
  const [personality, setPersonality] = useState(agent.personality);
  const [script, setScript] = useState(agent.script ?? "");
  const [flowScenarios, setFlowScenarios] = useState(agent.flow_scenarios ?? "");
  const [additionalInstructions, setAdditionalInstructions] = useState(agent.additional_instructions ?? "");

  useEffect(() => {
    if (state.ok) {
      toast.success("Cambios guardados", { description: state.ok });
      router.push(`/app/agents/${agent.id}`);
    } else if (state.error) {
      toast.error("Error al guardar", { description: state.error });
    }
  }, [state, agent.id, router]);

  function handleImport(fields: ImportedAgentFields) {
    if (fields.agent_name) setAgentName(fields.agent_name);
    if (fields.company_name) setCompanyName(fields.company_name);
    if (fields.objective) setObjective(fields.objective);
    if (fields.personality) setPersonality(fields.personality);
    if (fields.script) setScript(fields.script);
    if (fields.flow_scenarios) setFlowScenarios(fields.flow_scenarios);
    if (fields.additional_instructions) setAdditionalInstructions(fields.additional_instructions);
  }

  return (
    <form action={formAction} className="campaign-edit-form">
      <section className="edit-section">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <p className="eyebrow" style={{ margin: 0 }}>Identidad del agente</p>
          <PromptImportDialog onImport={handleImport} />
        </div>
        <div className="form-grid">
          <label>
            Nombre del agente
            <input name="agent_name" required value={agentName} onChange={(e) => setAgentName(e.target.value)} maxLength={120} />
          </label>
          <label>
            Empresa presentada
            <input name="company_name" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={120} />
          </label>
          <label>
            ID de voz (opcional)
            <input name="voice_id" defaultValue={agent.voice_id ?? ""} placeholder="Se usará la voz predeterminada" />
          </label>
          <label>
            Objetivo
            <input name="objective" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Gestión de cobranza y acuerdos de pago" />
          </label>
          <label>
            Definición del agente
            <select name="agent_definition_key" defaultValue={agent.agent_definition_key ?? "collections"}>
              <option value="collections">collections — Cobranza estándar</option>
              <option value="rac">rac — Mueblería RAC</option>
              <option value="survey">survey — Encuestas</option>
            </select>
          </label>
          <label className="wide-field">
            Personalidad y estilo
            <textarea name="personality" required value={personality} onChange={(e) => setPersonality(e.target.value)} maxLength={1000} rows={3} />
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
            <textarea name="script" value={script} onChange={(e) => setScript(e.target.value)} rows={8} style={{ minHeight: 180 }} />
          </label>
          <label className="wide-field">
            Escenarios de flujo
            <textarea name="flow_scenarios" value={flowScenarios} onChange={(e) => setFlowScenarios(e.target.value)} rows={6} style={{ minHeight: 140 }} />
          </label>
          <label className="wide-field">
            Instrucciones adicionales <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 11 }}>(opcional)</span>
            <textarea
              name="additional_instructions"
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              rows={4}
              placeholder="Contexto de negocio, variables, límites, reglas de pago u otras instrucciones complementarias…"
              style={{ minHeight: 100 }}
            />
          </label>
        </div>
      </section>

      <PaymentOptionsForm paymentOptions={agent.payment_options} />

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
