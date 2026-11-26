"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteAgentProfile } from "@/lib/control-api";

export type DeleteAgentState = { error?: string };

export async function deleteAgentAction(
  _previous: DeleteAgentState,
  data: FormData,
): Promise<DeleteAgentState> {
  const versionId = String(data.get("version_id") ?? "").trim();
  if (!versionId) return { error: "ID de perfil no proporcionado." };

  try {
    await deleteAgentProfile(versionId);
    revalidatePath("/app/agents");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("control_api_403") || msg.includes("control_api_401"))
      return { error: "No tienes permisos para eliminar este perfil." };
    if (msg.includes("409") || msg.includes("en uso"))
      return { error: "Este perfil está en uso por una campaña y no puede eliminarse." };
    return { error: "No fue posible eliminar el perfil. Intenta de nuevo." };
  }
  redirect("/app/agents");
}
