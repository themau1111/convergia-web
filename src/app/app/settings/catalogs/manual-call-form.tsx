"use client";

import { useActionState, useEffect, useState } from "react";
import type { AgentProfileRecord } from "@/lib/control-api";
import { toast } from "sonner";
import { callManualAction, type CallState } from "./actions";
import { MANUAL_CALL_DEFAULTS } from "./manual-call-defaults";

const DEFAULT_AGENT_PLACEHOLDERS = {
  company_name: "la institución",
  agent_name: "Valeria",
  personality:
    "Empática, clara y directa. Explica antes de solicitar un compromiso y nunca inventa información.",
};

type ProfileOption = Pick<AgentProfileRecord, "id" | "agent_name" | "company_name" | "version">;

export function ManualCallForm({ profiles = [] }: { profiles?: ProfileOption[] }) {
  const [state, formAction, pending] = useActionState<CallState, FormData>(callManualAction, {});
  const [profileId, setProfileId] = useState("");

  useEffect(() => {
    if (state.status === "ok") {
      toast.success("Llamada iniciada", {
        description: `UUID: ${state.call_uuid}`,
      });
    } else if (state.status === "error") {
      toast.error("No se pudo iniciar la llamada", {
        description: state.message,
      });
    }
  }, [state]);

  return (
    <form action={formAction}>
      <label>
        Perfil del agente
        <select name="agent_profile_version_id" value={profileId} onChange={(event) => setProfileId(event.target.value)}>
          <option value="">Configuración manual de recordatorio</option>
          {profiles.map((profile) => <option key={profile.id} value={profile.id}>
            {profile.agent_name} · {profile.company_name} · v{profile.version}
          </option>)}
        </select>
      </label>
      {profileId && <p className="muted">La llamada utiliza la identidad, la voz y las reglas de esta versión del perfil.</p>}
      <div className="form-grid">
        <label>
          Teléfono
          <input name="telefono" required placeholder="8112345678" />
        </label>
        <label>
          Nombre de prueba
          <input name="nombre_cliente" defaultValue={MANUAL_CALL_DEFAULTS.nombre_cliente} />
        </label>
      </div>
      <details>
        <summary>{profileId ? "Agregar datos de cobranza" : "Agregar datos de cobranza y personalidad"}</summary>
        <div className="form-grid advanced-call-fields">
          {!profileId && <>
          <label>Empresa<input name="company_name" placeholder={DEFAULT_AGENT_PLACEHOLDERS.company_name} /></label>
          <label>Agente<input name="agent_name" placeholder={DEFAULT_AGENT_PLACEHOLDERS.agent_name} /></label>
          <label className="wide-field">Personalidad<textarea name="personality" placeholder={DEFAULT_AGENT_PLACEHOLDERS.personality} /></label>
          </>}
          <label>Saldo<input name="saldo_pendiente" type="number" min="0.01" step=".01" defaultValue={MANUAL_CALL_DEFAULTS.saldo_pendiente} /></label>
          <label>Producto<input name="articulo" defaultValue={MANUAL_CALL_DEFAULTS.articulo} /></label>
          <label>Día de pago<input name="dia_pago" defaultValue={MANUAL_CALL_DEFAULTS.dia_pago} /></label>
          <label>Pagos atrasados<input name="pagos_atrasados" type="number" min="0" defaultValue={MANUAL_CALL_DEFAULTS.pagos_atrasados} /></label>
          <label>Días de atraso (opcional)<input name="dias_atraso" type="number" min="0" /></label>
          <label>Modalidad<input name="modalidad" defaultValue={MANUAL_CALL_DEFAULTS.modalidad} /></label>
          <label>Cuota<input name="cuota_semanal" type="number" min="0.01" step=".01" defaultValue={MANUAL_CALL_DEFAULTS.cuota_semanal} /></label>
          {!profileId && <label>ID de voz<input name="voice_id" /></label>}
        </div>
      </details>
      <div className="call-submit-row">
        <label className="call-confirm">
          <input type="checkbox" name="confirmed" value="yes" required /> Confirmo una llamada real
        </label>
        <button className="test-call-button" disabled={pending}>
          {pending ? "Iniciando…" : "Iniciar llamada ↗"}
        </button>
      </div>
    </form>
  );
}
