import { z } from "zod";

export const MAX_PROMPT_CHARS = 12_000;
export const MAX_PROMPT_BYTES = 80_000;
export const pendingLabelsSchema = z.array(z.object({
  name: z.string().trim().min(1).max(80),
  criteria: z.string().trim().min(1).max(500),
}).strict()).max(50).superRefine((labels, ctx) => {
  const seen = new Set<string>();
  for (const label of labels) {
    const key = label.name.toLocaleLowerCase("es");
    if (seen.has(key)) ctx.addIssue({ code: "custom", message: "Hay etiquetas con el mismo nombre." });
    seen.add(key);
  }
});

export const importedAgentFieldsSchema = z.object({
  agent_name: z.string().max(120),
  company_name: z.string().max(120),
  objective: z.string().max(500),
  personality: z.string().max(1000),
  script: z.string().max(4000),
  flow_scenarios: z.string().max(4000),
  additional_instructions: z.string().max(8000),
  suggested_labels: pendingLabelsSchema.max(8),
}).strict();
export type ImportedAgentFields = z.infer<typeof importedAgentFieldsSchema>;
export type PendingLabel = z.infer<typeof pendingLabelsSchema>[number];

export function mergeImportedLabels(existing: PendingLabel[], incoming: PendingLabel[]) {
  const names = new Set(existing.map((label) => label.name.trim().toLocaleLowerCase("es")));
  const merged = [...existing];
  for (const label of incoming) {
    const key = label.name.trim().toLocaleLowerCase("es");
    if (!names.has(key)) {
      names.add(key);
      merged.push({ name: label.name.trim(), criteria: label.criteria.trim() });
    }
  }
  return merged;
}

export function labelsFromFormData(data: FormData): PendingLabel[] {
  return pendingLabelsSchema.parse(JSON.parse(String(data.get("labels_json") ?? "[]")));
}
