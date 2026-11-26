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
    if (msg.includes("control_api_401") || msg.includes("control_api_403"))
      return { error: "No tienes permisos para eliminar este perfil." };
    if (msg.includes("control_api_409"))
      return { error: "Este perfil está en uso por una campaña activa y no puede eliminarse." };
    if (msg.includes("control_api_404") || msg.includes("control_api_405"))
      return { error: "El backend aún no tiene esta operación. Espera el deploy o contacta al administrador." };
    return { error: `No fue posible eliminar el perfil. (${msg})` };
  }
  redirect("/app/agents");
}
