"use client";

import type { AgentVariable } from "@/lib/control-api";
import { detectedVariables, variablesInText } from "@/lib/agent-variables";

export function VariablesEditor({ variables, onChange, prompt }: { variables: AgentVariable[]; onChange: (value: AgentVariable[]) => void; prompt: string }) {
  const used = variablesInText(prompt);
  const missing = used.filter(name => !variables.some(v => v.name === name));
  const unused = variables.filter(v => !used.includes(v.name));
  function edit(index: number, patch: Partial<AgentVariable>) {
    onChange(variables.map((v, i) => i === index ? { ...v, ...patch } : v));
  }
  return <section className="edit-section">
    <p className="eyebrow">Variables del agente</p>
    <p className="muted">Declara los datos que usarás con {"{{nombre}}"}. La campaña validará su tipo y los valores obligatorios.</p>
    <input type="hidden" name="agent_variables_json" value={JSON.stringify(variables)} />
    {missing.length > 0 && <p role="status">Sin declarar: {missing.join(", ")}</p>}
    {unused.length > 0 && <p role="status">Declaradas sin usar en el prompt: {unused.map(v => v.name).join(", ")}</p>}
    {variables.map((v, index) => <fieldset key={index} style={{ marginBlock: 16 }}>
      <legend>Variable {index + 1}</legend>
      <div className="form-grid">
        <label>Nombre<input value={v.name} required pattern="[a-z][a-z0-9_]*" maxLength={60} onChange={e => edit(index, { name: e.target.value })} /></label>
        <label>Tipo<select value={v.type} onChange={e => edit(index, { type: e.target.value as AgentVariable["type"] })}>
          <option value="text">Texto</option><option value="number">Número</option><option value="currency">Moneda</option><option value="date">Fecha</option>
        </select></label>
        <label>Descripción<input value={v.description} maxLength={300} onChange={e => edit(index, { description: e.target.value })} /></label>
        <label className="checkbox"><input type="checkbox" checked={v.required} onChange={e => edit(index, { required: e.target.checked })} />Obligatoria</label>
      </div>
      <button type="button" className="secondary-action" onClick={() => onChange(variables.filter((_, i) => i !== index))}>Quitar variable {index + 1}</button>
    </fieldset>)}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      <button type="button" className="secondary-action" disabled={variables.length >= 100} onClick={() => onChange([...variables, { name: "", type: "text", required: false, description: "" }])}>Agregar variable</button>
      <button type="button" className="secondary-action" onClick={() => onChange(detectedVariables(prompt, variables).slice(0, 100))}>Detectar variables del prompt</button>
    </div>
  </section>;
}
