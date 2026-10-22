"use client";

import { useRef, useState } from "react";

export type ImportedAgentFields = {
  agent_name: string;
  company_name: string;
  objective: string;
  personality: string;
  script: string;
  flow_scenarios: string;
  additional_instructions: string;
};

type Props = {
  onImport: (fields: ImportedAgentFields) => void;
};

export function PromptImportDialog({ onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function openDialog() { setOpen(true); setError(null); }
  function closeDialog() { if (!busy) setOpen(false); }

  async function analyze() {
    const prompt = textareaRef.current?.value.trim() ?? "";
    if (!prompt) { setError("Pega el prompt antes de analizar."); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/agents/import-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error ?? `Error ${res.status}`); return; }
      onImport(data as ImportedAgentFields);
      setOpen(false);
    } catch {
      setError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="secondary-action" style={{ justifySelf: "start" }} onClick={openDialog}>
        Importar desde prompt
      </button>

      {open && (
        <div
          className="confirmation-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prompt-import-title"
          onClick={(e) => { if (e.target === e.currentTarget) closeDialog(); }}
        >
          <div className="confirmation-modal" style={{ width: "min(100%, 680px)", maxWidth: "100%" }}>
            <p className="eyebrow" style={{ margin: "0 0 6px" }}>Agente</p>
            <h2 id="prompt-import-title" style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 760, letterSpacing: "-.03em" }}>
              Importar desde prompt
            </h2>
            <p className="muted" style={{ margin: "0 0 16px", fontSize: 13, lineHeight: 1.5 }}>
              Pega el prompt completo de tu agente. La IA distribuirá automáticamente el contenido
              en los campos del formulario. Revisa los campos antes de guardar.
            </p>

            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>
              Prompt del agente
              <textarea
                ref={textareaRef}
                rows={14}
                disabled={busy}
                placeholder={"# IDENTIDAD\nEres Rebeca, agente de cobranza de Mueblería RAC…\n\n# FLUJO DE LA LLAMADA\nPaso 1. …"}
                style={{
                  width: "100%",
                  resize: "vertical",
                  padding: "10px 12px",
                  border: "1px solid #d8d3e4",
                  borderRadius: 10,
                  background: "var(--surface, white)",
                  color: "var(--ink)",
                  fontFamily: "monospace",
                  fontSize: 12,
                  lineHeight: 1.55,
                  outline: "none",
                }}
              />
            </label>

            {error && (
              <p role="alert" style={{ margin: "10px 0 0", color: "#b33", fontSize: 13 }}>{error}</p>
            )}

            <div className="confirmation-actions" style={{ marginTop: 18 }}>
              <button type="button" className="secondary-action" disabled={busy} onClick={closeDialog}>
                Cancelar
              </button>
              <button type="button" className="primary-action" disabled={busy} onClick={() => void analyze()}>
                {busy ? "Analizando con IA…" : "Analizar y rellenar campos"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
