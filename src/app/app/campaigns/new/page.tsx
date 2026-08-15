import { getAgentProfiles, getPortfolios } from "@/lib/control-api";
import { CampaignWizard } from "./campaign-wizard";

export default async function NewCampaignPage() {
  const [portfolios, profiles] = await Promise.all([getPortfolios(), getAgentProfiles()]);
  return <CampaignWizard portfolios={portfolios} profiles={profiles} />;
}
