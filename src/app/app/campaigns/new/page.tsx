import {
  getAgentProfiles, getPortfolios, getTelephonyResults, listAgentLabels,
  type AgentLabelRecord, type TelephonyResultOption,
} from "@/lib/control-api";
import { CampaignWizard } from "./campaign-wizard";

export default async function NewCampaignPage() {
  const [portfolios, agentProfiles, telephonyResults] = await Promise.all([
    getPortfolios(),
    getAgentProfiles(),
    getTelephonyResults().catch((): TelephonyResultOption[] => []),
  ]);

  // Pre-load labels for each agent so the wizard can show them without client fetches
  const agentsWithLabels = await Promise.all(
    agentProfiles.map(async (agent) => {
      const labels: AgentLabelRecord[] = await listAgentLabels(agent.id).catch(() => []);
      return { ...agent, labels };
    }),
  );

  return (
    <CampaignWizard
      portfolios={portfolios}
      agentProfiles={agentsWithLabels}
      telephonyResults={telephonyResults}
    />
  );
}
