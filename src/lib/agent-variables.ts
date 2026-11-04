import { z } from "zod";
import type { AgentVariable } from "./control-api";

export const SYSTEM_VARIABLES = new Set(["agent_name", "company_name", "campaign_name", "objective", "telefono", "phone"]);
export const agentVariablesSchema = z.array(z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]{0,59}$/),
  type: z.enum(["text", "number", "currency", "date"]),
  required: z.boolean(), description: z.string().max(300),
}).strict()).max(100).superRefine((items, ctx) => {
  const names = items.map(v => v.name);
  if (new Set(names).size !== names.length || names.some(name => SYSTEM_VARIABLES.has(name))) ctx.addIssue({ code: "custom", message: "Revisa nombres duplicados o reservados." });
});

export function variablesInText(text: string) {
  return [...new Set([...text.matchAll(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g)].map(match => match[1]))].filter(name => !SYSTEM_VARIABLES.has(name));
}

export function detectedVariables(text: string, existing: AgentVariable[] = []) {
  const names = new Set(existing.map(v => v.name));
  return [...existing, ...variablesInText(text).filter(name => !names.has(name)).map(name => ({
    name, type: (/saldo|monto|importe|total/.test(name) ? "currency" : /fecha/.test(name) ? "date" : /dias|pagos_atrasados/.test(name) ? "number" : "text") as AgentVariable["type"], required: true, description: "",
  }))];
}

export function variablesFromFormData(data: FormData) {
  return agentVariablesSchema.parse(JSON.parse(String(data.get("agent_variables_json") ?? "[]")));
}
