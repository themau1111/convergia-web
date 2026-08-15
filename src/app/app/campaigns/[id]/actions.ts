"use server";

import { revalidatePath } from "next/cache";

import { changeCampaignStatus } from "@/lib/control-api";

export type LifecycleState = { error?: string };
const allowed = new Set(["scheduled", "running", "paused", "cancelled"]);

export async function changeCampaignLifecycle(
  campaignId: string,
  _previous: LifecycleState,
  formData: FormData,
): Promise<LifecycleState> {
  const status = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!allowed.has(status)) return { error: "Estado no permitido." };
  try {
    await changeCampaignStatus(
      campaignId,
      status as "scheduled" | "running" | "paused" | "cancelled",
      reason,
    );
    revalidatePath(`/app/campaigns/${campaignId}`);
    revalidatePath("/");
    return {};
  } catch {
    return { error: "No fue posible cambiar el estado. Revisa la transición y tus permisos." };
  }
}
