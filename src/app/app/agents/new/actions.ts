"use server";

import { redirect } from "next/navigation";
import { createAgentProfile } from "@/lib/control-api";

export type AgentFormState = { error?: string };

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "agente";
}

export async function createAgentAction(
  _previous: AgentFormState,
  data: FormData,
): Promise<AgentFormState> {
  const agentName = String(data.get("agent_name") ?? "").trim();
  const companyName = String(data.get("company_name") ?? "").trim();
  const personality = String(data.get("personality") ?? "").trim();
  const script = String(data.get("script") ?? "").trim();
  const flowScenarios = String(data.get("flow_scenarios") ?? "").trim();
  const objective = String(data.get("objective") ?? "").trim();
  const voiceId = String(data.get("voice_id") ?? "").trim();
  const profileKeyRaw = String(data.get("profile_key") ?? "").trim();
  const profileKey = profileKeyRaw || `${slugify(companyName)}-${slugify(agentName)}`;

  if (!agentName) return { error: "El nombre del agente es obligatorio." };
  if (!companyName) return { error: "El nombre de la empresa es obligatorio." };
  if (!personality) return { error: "La personalidad es obligatoria." };

  let agentId: string;
  try {
    const agent = await createAgentProfile({
      profile_key: profileKey,
      agent_name: agentName,
      company_name: companyName,
      personality,
      ...(voiceId ? { voice_id: voiceId } : {}),
      ...(script ? { script } : {}),
      ...(flowScenarios ? { flow_scenarios: flowScenarios } : {}),
      ...(objective ? { objective } : {}),
    });
    agentId = agent.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("control_api_409"))
      return { error: "Ya existe un agente con esa clave. Usa una clave diferente." };
    if (msg.includes("control_api_403") || msg.includes("control_api_401"))
      return { error: "No tienes permisos para crear agentes." };
    return { error: "No fue posible crear el agente. Revisa los datos e inténtalo de nuevo." };
  }
  redirect(`/app/agents/${agentId}`);
}
