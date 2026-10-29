"use client";

import styles from "../agent-forms.module.css";

import { mergeImportedLabels } from "@/lib/agent-prompt-import";
import Link from "next/link";
import { useActionState, useState } from "react";
import { createAgentAction, type AgentFormState } from "./actions";
import { LabelsPicker, type PendingLabel } from "./labels-picker";
import { PaymentOptionsForm } from "../payment-options-form";
import { PromptImportDialog, type ImportedAgentFields } from "../prompt-import-dialog";
import type { AgentLabelRecord } from "@/lib/control-api";

const SCRIPT_VARS = "{{nombre_cliente}}, {{saldo_pendiente}}, {{dia_pago}}, {{articulo}}, {{pagos_atrasados}}, {{modalidad}}, {{cuota_semanal}}, {{campaign_name}}, {{company_name}}, {{agent_name}}";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const EMPTY_LIBRARY: AgentLabelRecord[] = [];

export function AgentForm({ library = EMPTY_LIBRARY }: { library?: AgentLabelRecord[] }) {
  const [state, formAction, pending] = useActionState<AgentFormState, FormData>(
    createAgentAction,
    {},
  );
  const [agentName, setAgentName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [profileKey, setProfileKey] = useState("");
  const [profileKeyEdited, setProfileKeyEdited] = useState(false);
  const [objective, setObjective] = useState("");
  const [personality, setPersonality] = useState("");
  const [script, setScript] = useState("");
  const [flowScenarios, setFlowScenarios] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [pendingLabels, setPendingLabels] = useState<PendingLabel[]>([]);

  const generatedProfileKey = [slugify(companyName), slugify(agentName)].filter(Boolean).join("-");
  const visibleProfileKey = profileKeyEdited ? profileKey : generatedProfileKey;

  function handleImport(fields: ImportedAgentFields) {
    if (fields.agent_name) setAgentName(fields.agent_name);
    if (fields.company_name) setCompanyName(fields.company_name);
    if (fields.objective) setObjective(fields.objective);
    if (fields.personality) setPersonality(fields.personality);
    if (fields.script) setScript(fields.script);
    if (fields.flow_scenarios) setFlowScenarios(fields.flow_scenarios);
    if (fields.additional_instructions) setAdditionalInstructions(fields.additional_instructions);
    if (fields.suggested_labels?.length) {
      setPendingLabels((prev) => mergeImportedLabels(prev, fields.suggested_labels));
    }
  }

  return (
    <form action={formAction} className={`campaign-edit-form ${styles.form}`}>
      <section className="edit-section">
        <div className={styles.sectionHeading}>
          <p className="eyebrow">Identidad del agente</p>
          <PromptImportDialog onImport={handleImport} />
        </div>
        <div className="form-grid">
          <label>
            Nombre del agente
            <input
              name="agent_name"
              required
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Valeria"
            />
          </label>
          <label>
            Empresa presentada
            <input
              name="company_name"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Financiera Horizonte"
            />
          </label>
          <label>
            Clave de perfil
            <input
              name="profile_key"
              value={visibleProfileKey}
              onChange={(e) => { setProfileKey(e.target.value); setProfileKeyEdited(true); }}
              placeholder="financiera-horizonte-valeria"
              pattern="[a-z0-9\-]+"
              title="Solo letras minúsculas, números y guiones"
            />
          </label>
          <label>
            ID de voz (opcional)
            <input name="voice_id" placeholder="Se usará la voz predeterminada" />
          </label>
          <label>
            Definición del agente
            <select name="agent_definition_key" required defaultValue="rac">
              <option value="rac">Agente generativo (recomendado)</option>
              <option value="collections">Cobranza estándar (legado)</option>
            </select>
            <small className="muted">El modo generativo permite al agente razonar y argumentar. Usa "Cobranza estándar" solo para campañas existentes que lo requieran.</small>
          </label>
          <label className="wide-field">
            Objetivo
            <input
              name="objective" maxLength={500}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Gestión de cobranza y acuerdos de pago"
            />
          </label>
          <label className="wide-field">
            Personalidad y estilo
            <textarea
              name="personality"
              required
              maxLength={1000}
              rows={3}
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder="Empática, clara y directa. Explica antes de solicitar un compromiso y nunca inventa información."
            />
          </label>
        </div>
      </section>

      <PaymentOptionsForm />

      <section className="edit-section">
        <p className="eyebrow">Script de conversación</p>
        <p className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
          Variables disponibles: <code className={styles.variables}>{SCRIPT_VARS}</code>
        </p>
        <div className="form-grid">
          <label className="wide-field">
            Script principal
            <textarea
              name="script" maxLength={4000}
              rows={8}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Hola, ¿hablo con {{nombre_cliente}}? Le llamo de {{company_name}}, soy {{agent_name}}…"
              style={{ minHeight: 180 }}
            />
          </label>
          <label className="wide-field">
            Escenarios de flujo
            <textarea
              name="flow_scenarios" maxLength={4000}
              rows={6}
              value={flowScenarios}
              onChange={(e) => setFlowScenarios(e.target.value)}
              placeholder="Si el cliente dice que ya pagó: confirmar fecha y monto y agradecer. Si el cliente pide tiempo: ofrecer extensión de hasta 5 días…"
              style={{ minHeight: 140 }}
            />
          </label>

            <label className="wide-field">
              Instrucciones adicionales <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opcional)</span>
              <textarea
                name="additional_instructions" maxLength={8000}
                rows={6}
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                style={{ minHeight: 140 }}
              />
            </label>
        </div>
      </section>

      <section className="edit-section">
        <p className="eyebrow">Etiquetas de comportamiento</p>
        <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
          Las etiquetas clasifican automáticamente los resultados de las llamadas según lo que ocurra en la conversación.
          Por ejemplo: <em>falta de pago</em>, <em>no toma la llamada</em>, <em>promesa de pago</em>.
          Puedes agregarlas ahora o después de crear el agente.
        </p>
        <LabelsPicker library={library} pending={pendingLabels} onChange={setPendingLabels} />
      </section>

      {state.error && (
        <p className="form-error" role="alert">{state.error}</p>
      )}

      <div className="edit-actions">
        <Link className="secondary-action" href="/app/agents">Cancelar</Link>
        <button type="submit" className="primary-action" disabled={pending}>
          {pending ? "Creando…" : "Crear agente"}
        </button>
      </div>
    </form>
  );
}
