"use server";

import { createCsvPortfolio } from "@/lib/control-api";

export async function createCsvPortfolioAction(name: string): Promise<{ id: string; name: string }> {
  return createCsvPortfolio(name);
}
