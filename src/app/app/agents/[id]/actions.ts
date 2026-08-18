"use server";

import { revalidatePath } from "next/cache";
import { createAgentLabel, deleteAgentLabel } from "@/lib/control-api";

export type LabelState = { error?: string; ok?: string };

export async function addLabelAction(
  agentId: string,
  _previous: LabelState,
  data: FormData,
): Promise<LabelState> {
  const name = String(data.get("name") ?? "").trim();
  const criteria = String(data.get("criteria") ?? "").trim();
  const positionRaw = String(data.get("position") ?? "").trim();

  if (!name) return { error: "El nombre de la etiqueta es obligatorio." };
  if (!criteria) return { error: "El criterio de detección es obligatorio." };

  try {
    await createAgentLabel(agentId, {
      name,
      criteria,
      ...(positionRaw ? { position: Number(positionRaw) } : {}),
    });
    revalidatePath(`/app/agents/${agentId}`);
    return { ok: "Etiqueta agregada correctamente." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("control_api_403") || msg.includes("control_api_401"))
      return { error: "No tienes permisos para agregar etiquetas." };
    return { error: "No fue posible agregar la etiqueta. Intenta de nuevo." };
  }
}

export async function removeLabelAction(
  _previous: LabelState,
  data: FormData,
): Promise<LabelState> {
  const agentId = String(data.get("agent_id") ?? "").trim();
  const labelId = String(data.get("label_id") ?? "").trim();

  if (!agentId || !labelId) return { error: "Datos incompletos." };

  try {
    await deleteAgentLabel(agentId, labelId);
    revalidatePath(`/app/agents/${agentId}`);
    return { ok: "Etiqueta eliminada." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("control_api_403") || msg.includes("control_api_401"))
      return { error: "No tienes permisos para eliminar etiquetas." };
    return { error: "No fue posible eliminar la etiqueta. Intenta de nuevo." };
  }
}
