"use server";

import { redirect } from "next/navigation";
import { createAgentProfile } from "@/lib/control-api";

export type InterviewerState = { error?: string };
const slug = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export async function createInterviewerAction(_: InterviewerState, form: FormData): Promise<InterviewerState> {
  const agent_name = String(form.get("agent_name") ?? "").trim();
  const company_name = String(form.get("company_name") ?? "").trim();
  const personality = String(form.get("personality") ?? "").trim();
  if (!agent_name || !company_name || !personality) return { error: "Completa los datos del entrevistador." };
  try {
    const profile = await createAgentProfile({ profile_key: `${slug(company_name)}-${slug(agent_name)}`, agent_name, company_name, personality,
      agent_definition_key: "survey", objective: "Entrevista neutral y cuestionario aprobado", script: String(form.get("script") ?? "").trim(), flow_scenarios: String(form.get("flow_scenarios") ?? "").trim() });
    redirect(`/app/surveys/interviewers?created=${profile.id}`);
  } catch { return { error: "No fue posible crear el entrevistador. Revisa que la clave no exista." }; }
}
