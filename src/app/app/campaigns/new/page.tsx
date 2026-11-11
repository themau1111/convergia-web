import {
  getAgentProfiles, getSelectedWorkspace, getTelephonyResults, listAgentLabels,
  type AgentLabelRecord, type TelephonyResultOption,
} from "@/lib/control-api";
import { CampaignWizard } from "./campaign-wizard";
import { redirect } from "next/navigation";

export default async function NewCampaignPage() {
  if ((await getSelectedWorkspace())?.key === "survey") redirect("/app/surveys/new");
  const [agentProfiles, telephonyResults] = await Promise.all([
    getAgentProfiles(),
    getTelephonyResults().catch((): TelephonyResultOption[] => []),
  ]);

  // Pre-load labels for each agent so the wizard can show them without client fetches
  const agentsWithLabels = await Promise.all(
    agentProfiles.filter(agent => agent.agent_definition_key !== "survey").map(async (agent) => {
      const labels: AgentLabelRecord[] = await listAgentLabels(agent.id).catch(() => []);
      return { ...agent, labels };
    }),
  );

  return (
    <CampaignWizard
      agentProfiles={agentsWithLabels}
      telephonyResults={telephonyResults}
    />
  );
}
