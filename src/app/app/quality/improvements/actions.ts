"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { decideQualityImprovement, getCurrentMembership } from "@/lib/control-api";

export async function decideProposal(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const hash = String(formData.get("candidate_hash") ?? "");
  const decision = String(formData.get("decision") ?? "");
  let failed = false;
  try {
    const member = await getCurrentMembership();
    if (!["owner", "admin"].includes(member.role) || !/^[a-f0-9-]{36}$/i.test(id) || !/^[a-f0-9]{64}$/.test(hash)
      || !["approved", "rejected", "changes_requested"].includes(decision)) throw new Error("invalid_request");
    await decideQualityImprovement(id, hash, decision as "approved" | "rejected" | "changes_requested");
  } catch {
    failed = true;
  }
  revalidatePath("/app/quality/improvements");
  redirect(`/app/quality/improvements?notice=${failed ? "failed" : "saved"}`);
}
