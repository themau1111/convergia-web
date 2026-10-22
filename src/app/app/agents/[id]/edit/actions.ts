"use server";

import { revalidatePath } from "next/cache";
import { updateAgentProfile } from "@/lib/control-api";
import { labelsFromFormData } from "@/lib/agent-prompt-import";
import { paymentOptionsFromFormData } from "../../payment-options";

export type AgentEditState = { error?: string; ok?: string; savedId?: string };

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
  const additionalInstructions = String(data.get("additional_instructions") ?? "").trim();
  const voiceId = String(data.get("voice_id") ?? "").trim();
  const rawKey = String(data.get("agent_definition_key") ?? "collections").trim();
  const agentDefinitionKey = (["collections", "rac", "survey"].includes(rawKey)
    ? rawKey : "collections") as "collections" | "rac" | "survey";

  if (!agentName) return { error: "El nombre del agente es obligatorio." };
  if (!companyName) return { error: "El nombre de la empresa es obligatorio." };
  if (!personality) return { error: "La personalidad es obligatoria." };

  let labels;
  try { labels = labelsFromFormData(data); }
  catch { return { error: "Revisa las etiquetas: nombres únicos y criterios completos (máximo 50)." }; }
  try {
    const saved = await updateAgentProfile(agentId, {
      agent_name: agentName,
      labels,
      company_name: companyName,
      personality,
      voice_id: voiceId || null,
      agent_definition_key: agentDefinitionKey,
      script,
      flow_scenarios: flowScenarios,
      objective,
      additional_instructions: additionalInstructions,
      payment_options: paymentOptionsFromFormData(data),
    });
    revalidatePath(`/app/agents/${agentId}`);
    revalidatePath("/app/agents");
    return { ok: "Agente y etiquetas guardados correctamente.", savedId: saved.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("control_api_409"))
      return { error: "Hay una campaña activa o una etiqueta con el mismo nombre y otro criterio. Revisa el detalle antes de guardar." };
    if (msg.includes("control_api_403") || msg.includes("control_api_401"))
      return { error: "No tienes permisos para editar este agente." };
    return { error: "No fue posible guardar los cambios. Intenta de nuevo." };
  }
}
