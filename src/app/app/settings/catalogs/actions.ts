"use server";

import {
  startLocalPocTestCall,
  startManualTestCall,
  type TestAgentOptions,
} from "@/lib/control-api";

export type CallState = { status?: "ok" | "error"; message?: string; call_uuid?: string };

const DEFAULT_AGENT: TestAgentOptions = {
  agent_name: "Valeria",
  company_name: "la institución",
  personality:
    "Empática, clara y directa. Explica antes de solicitar un compromiso y nunca inventa información.",
};

function value(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}
function numeric(data: FormData, key: string) {
  return Number(value(data, key) || 0);
}
function agentFrom(data: FormData): TestAgentOptions {
  return {
    agent_name: value(data, "agent_name") || DEFAULT_AGENT.agent_name,
    company_name: value(data, "company_name") || DEFAULT_AGENT.company_name,
    personality: value(data, "personality") || DEFAULT_AGENT.personality,
    ...(value(data, "voice_id") ? { voice_id: value(data, "voice_id") } : {}),
  };
}

export async function callManualAction(
  _previous: CallState,
  data: FormData,
): Promise<CallState> {
  const telefono = value(data, "telefono");
  if (!telefono) return { status: "error", message: "El teléfono es obligatorio." };
  if (value(data, "confirmed") !== "yes")
    return { status: "error", message: "Debes confirmar antes de iniciar la llamada." };
  try {
    const result = await startManualTestCall({
      nombre_cliente: value(data, "nombre_cliente"),
      telefono,
      dia_pago: value(data, "dia_pago") || undefined,
      saldo_pendiente: numeric(data, "saldo_pendiente"),
      articulo: value(data, "articulo") || undefined,
      pagos_atrasados: numeric(data, "pagos_atrasados"),
      modalidad: value(data, "modalidad") || undefined,
      cuota_semanal: numeric(data, "cuota_semanal"),
      agent: agentFrom(data),
    });
    return { status: "ok", call_uuid: result.call_uuid };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("control_api_422"))
      return { status: "error", message: "El teléfono no tiene un formato válido. Usa 10 dígitos mexicanos (ej. 8112345678)." };
    if (msg.includes("control_api_502") || msg.includes("telephony_not_configured"))
      return { status: "error", message: "La telefonía no está disponible en este momento." };
    if (msg.includes("control_api_403") || msg.includes("control_api_401"))
      return { status: "error", message: "No tienes permisos para iniciar llamadas." };
    return { status: "error", message: "No fue posible iniciar la llamada. Intenta de nuevo." };
  }
}

export async function callClientAction(
  _previous: CallState,
  data: FormData,
): Promise<CallState> {
  const portfolioId = value(data, "portfolio_id");
  const clientId = numeric(data, "client_id");
  if (value(data, "confirmed") !== "yes")
    return { status: "error", message: "Debes confirmar antes de iniciar la llamada." };
  try {
    const result = await startLocalPocTestCall(portfolioId, clientId);
    return { status: "ok", call_uuid: result.call_uuid };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("control_api_502") || msg.includes("telephony_not_configured"))
      return { status: "error", message: "La telefonía no está disponible en este momento." };
    if (msg.includes("control_api_403") || msg.includes("control_api_401"))
      return { status: "error", message: "No tienes permisos para iniciar llamadas." };
    return { status: "error", message: "No fue posible iniciar la llamada. Intenta de nuevo." };
  }
}
