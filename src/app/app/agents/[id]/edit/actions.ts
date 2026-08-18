"use server";

import { revalidatePath } from "next/cache";
import { updateAgentProfile } from "@/lib/control-api";

export type AgentEditState = { error?: string; ok?: string };

export async function saveAgentEdit(
  agentId: string,
  _previous: AgentEditState,
  data: FormData,
): Promise<AgentEditState> {
  const agentName = String(data.get("agent_name") ?? "").trim();
  const companyName = String(data.get("company_name") ?? "").trim();
  const personality = String(data.get("personality") ?? "").trim();
  const script = String(data.get("script") ?? "").trim();
  const flowScenarios = String(data.get("flow_scenarios") ?? "").trim();
  const objective = String(data.get("objective") ?? "").trim();
  const voiceId = String(data.get("voice_id") ?? "").trim();

  if (!agentName) return { error: "El nombre del agente es obligatorio." };
  if (!companyName) return { error: "El nombre de la empresa es obligatorio." };
  if (!personality) return { error: "La personalidad es obligatoria." };

  try {
    await updateAgentProfile(agentId, {
      agent_name: agentName,
      company_name: companyName,
      personality,
      voice_id: voiceId || null,
      ...(script ? { script } : {}),
      ...(flowScenarios ? { flow_scenarios: flowScenarios } : {}),
      ...(objective ? { objective } : {}),
    });
    revalidatePath(`/app/agents/${agentId}`);
    revalidatePath("/app/agents");
    return { ok: "Agente actualizado correctamente." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("control_api_409"))
      return { error: "No se puede editar el agente porque tiene una campaña activa." };
    if (msg.includes("control_api_403") || msg.includes("control_api_401"))
      return { error: "No tienes permisos para editar este agente." };
    return { error: "No fue posible guardar los cambios. Intenta de nuevo." };
  }
}
