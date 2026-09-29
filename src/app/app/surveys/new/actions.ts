"use server";
import { redirect } from "next/navigation";
import { configureSurveyCampaign, createCampaign } from "@/lib/control-api";
export type SurveyCampaignState = { error?: string };
export async function createSurveyCampaignAction(_: SurveyCampaignState, form: FormData): Promise<SurveyCampaignState> {
  const name = String(form.get("name") ?? "").trim(), questionnaire = String(form.get("questionnaire") ?? ""), portfolio = String(form.get("portfolio") ?? ""), interviewer = String(form.get("interviewer") ?? "");
  if (!name || !questionnaire || !portfolio || !interviewer) return { error: "Selecciona cuestionario publicado, muestra y entrevistador." };
  try {
    const now = new Date(), end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const campaign = await createCampaign({ name, campaign_type: "survey", objective: "agreement_follow_up", portfolio_id: portfolio, agent_profile_version_id: interviewer, notes: String(form.get("notes") ?? "").trim(), draft: true, schedule: { timezone: "America/Mexico_City", start_at: now.toISOString(), end_at: end.toISOString(), retry_minutes: 15, max_attempts_per_recipient: 1 }, dialer: { rounds: 1, cooldown_minutes: 0, telephony_filter: [], label_filter: [] } });
    await configureSurveyCampaign(campaign.id, { questionnaire_version_id: questionnaire, rotation_seed: crypto.randomUUID() + crypto.randomUUID(), methodology: { contact_scope: "authorized_test_or_approved_sample" } });
    redirect(`/app/surveys/${campaign.id}`);
  } catch { return { error: "No fue posible crear y configurar la encuesta. Ninguna llamada fue iniciada." }; }
}
