"use server";

import { redirect } from "next/navigation";

import { createCampaign, type CampaignCreatePayload } from "@/lib/control-api";

export async function submitCampaign(payload: CampaignCreatePayload) {
  const campaign = await createCampaign(payload);
  redirect(`/?created=${encodeURIComponent(campaign.id)}`);
}
