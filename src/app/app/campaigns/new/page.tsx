import {
  getAgentProfiles, getPortfolios, getSelectedWorkspace, getTelephonyResults, listAgentLabels,
  type AgentLabelRecord, type TelephonyResultOption,
} from "@/lib/control-api";
import { CampaignWizard } from "./campaign-wizard";
import { redirect } from "next/navigation";

export default async function NewCampaignPage() {
  if ((await getSelectedWorkspace())?.key === "survey") redirect("/app/surveys/new");
  const [allPortfolios, agentProfiles, telephonyResults] = await Promise.all([
    getPortfolios(),
    getAgentProfiles(),
    getTelephonyResults().catch((): TelephonyResultOption[] => []),
  ]);
  // Solo mostrar carteras con adaptador soportado por el dispatcher
  const portfolios = allPortfolios.filter(
    (p) => p.adapter_type === "csv_upload" || p.adapter_type === "local_poc",
  );

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
