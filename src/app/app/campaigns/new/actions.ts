"use server";

import { redirect } from "next/navigation";

import {
  createCampaign,
  type CampaignCreatePayload,
} from "@/lib/control-api";

export type CampaignSetupPayload = CampaignCreatePayload;

export async function submitCampaign(payload: CampaignSetupPayload) {
  if (!payload.portfolio_id) throw new Error("missing_portfolio");
  if (!payload.agent_profile_version_id) throw new Error("missing_agent");

  const campaign = await createCampaign(payload);
  redirect(`/?created=${encodeURIComponent(campaign.id)}`);
}
