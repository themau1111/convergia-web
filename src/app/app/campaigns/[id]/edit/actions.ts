"use server";

import { revalidatePath } from "next/cache";
import { updateCampaign } from "@/lib/control-api";

export type EditState = { error?: string; ok?: string };

const timezoneOffsets: Record<string, string> = {
  "America/Mexico_City": "-06:00",
  "America/Monterrey": "-06:00",
};

function scheduledIso(localValue: string, timezone: string) {
  return `${localValue}:00${timezoneOffsets[timezone] ?? "-06:00"}`;
}

export async function saveCampaignEdit(
  campaignId: string,
  _previous: EditState,
  data: FormData,
): Promise<EditState> {
  const name = String(data.get("name") ?? "").trim();
  const notes = String(data.get("notes") ?? "").trim();
  const startAt = String(data.get("start_at") ?? "").trim();
  const endAt = String(data.get("end_at") ?? "").trim();
  const timezone = String(data.get("timezone") ?? "America/Mexico_City");
  const retryMinutes = Number(data.get("retry_minutes") || 15);
  const maxAttempts = Number(data.get("max_attempts_per_recipient") || 3);

  if (!name) return { error: "El nombre de la campaña es obligatorio." };
  if (!startAt || !endAt) return { error: "Configura la ventana de ejecución." };
  if (endAt <= startAt) return { error: "La fecha de fin debe ser posterior al inicio." };

  try {
    await updateCampaign(campaignId, {
      name,
      notes: notes || undefined,
      schedule: {
        timezone,
        start_at: scheduledIso(startAt, timezone),
        end_at: scheduledIso(endAt, timezone),
        retry_minutes: retryMinutes,
        max_attempts_per_recipient: maxAttempts,
      },
    });
    revalidatePath(`/app/campaigns/${campaignId}`);
    revalidatePath("/");
    return { ok: "Campaña actualizada correctamente." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("control_api_409"))
      return { error: "Solo puedes editar una campaña que esté en estado Pausada." };
    if (msg.includes("control_api_403") || msg.includes("control_api_401"))
      return { error: "No tienes permisos para editar esta campaña." };
    return { error: "No fue posible guardar los cambios. Intenta de nuevo." };
  }
}
