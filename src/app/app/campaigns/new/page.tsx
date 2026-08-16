import { getPortfolios } from "@/lib/control-api";
import { CampaignWizard } from "./campaign-wizard";

export default async function NewCampaignPage() {
  const portfolios = await getPortfolios();
  return <CampaignWizard portfolios={portfolios} />;
}
