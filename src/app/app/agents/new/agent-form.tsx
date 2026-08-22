"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createAgentAction, type AgentFormState } from "./actions";

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

export function AgentForm() {
  const [state, formAction, pending] = useActionState<AgentFormState, FormData>(
    createAgentAction,
    {},
  );
  const [agentName, setAgentName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [profileKey, setProfileKey] = useState("");
  const [profileKeyEdited, setProfileKeyEdited] = useState(false);

  const generatedProfileKey = [slugify(companyName), slugify(agentName)].filter(Boolean).join("-");
  const visibleProfileKey = profileKeyEdited ? profileKey : generatedProfileKey;

  return (
    <form action={formAction} className="campaign-edit-form">
      <section className="edit-section">
        <p className="eyebrow">Identidad del agente</p>
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
          <label className="wide-field">
            Objetivo
            <input name="objective" placeholder="Gestión de cobranza y acuerdos de pago" />
          </label>
          <label className="wide-field">
            Personalidad y estilo
            <textarea name="personality" required maxLength={1000} rows={3} placeholder="Empática, clara y directa. Explica antes de solicitar un compromiso y nunca inventa información." />
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
            <textarea name="script" rows={8} placeholder="Hola, ¿hablo con {{nombre_cliente}}? Le llamo de {{company_name}}, soy {{agent_name}}…" style={{ minHeight: 180 }} />
          </label>
          <label className="wide-field">
            Escenarios de flujo
            <textarea name="flow_scenarios" rows={6} placeholder="Si el cliente dice que ya pagó: confirmar fecha y monto y agradecer. Si el cliente pide tiempo: ofrecer extensión de hasta 5 días…" style={{ minHeight: 140 }} />
          </label>
        </div>
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
