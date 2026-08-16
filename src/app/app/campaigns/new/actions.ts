"use server";

import { redirect } from "next/navigation";

import {
  createAgentProfile, createCampaign, createDataSource, createPortfolio,
  type CampaignCreatePayload, type DataSourceRecord,
} from "@/lib/control-api";

export type CampaignSetupPayload = Omit<CampaignCreatePayload, "portfolio_id" | "agent_profile_version_id"> & {
  portfolio_id?: string;
  new_source?: { name: string; adapter_type: DataSourceRecord["adapter_type"] };
  new_portfolio?: { name: string; external_key: string; estimated_recipients?: number };
  agent: { agent_name: string; company_name: string; personality: string; voice_id?: string };
};

function key(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "agente";
}

export async function submitCampaign(payload: CampaignSetupPayload) {
  let portfolioId = payload.portfolio_id;
  if (!portfolioId && payload.new_source && payload.new_portfolio) {
    const source = await createDataSource(payload.new_source.name, payload.new_source.adapter_type);
    const portfolio = await createPortfolio({ data_source_id: source.id, ...payload.new_portfolio });
    portfolioId = portfolio.id;
  }
  if (!portfolioId) throw new Error("missing_portfolio");
  const profile = await createAgentProfile({
    profile_key: `${key(payload.agent.company_name)}-${key(payload.agent.agent_name)}`,
    ...payload.agent,
  });
  const campaign = await createCampaign({
    name: payload.name, objective: payload.objective, portfolio_id: portfolioId,
    agent_profile_version_id: profile.id, schedule: payload.schedule, notes: payload.notes,
  });
  redirect(`/?created=${encodeURIComponent(campaign.id)}`);
}
