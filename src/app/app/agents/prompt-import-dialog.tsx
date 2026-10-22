"use client";

import styles from "./prompt-import-dialog.module.css";
import { useEffect, useId, useRef, useState } from "react";
import { importedAgentFieldsSchema, MAX_PROMPT_CHARS, type ImportedAgentFields } from "@/lib/agent-prompt-import";
export type { ImportedAgentFields } from "@/lib/agent-prompt-import";

type Props = { onImport: (fields: ImportedAgentFields) => void };
const fieldTitles = {
  agent_name: "Nombre", company_name: "Empresa", objective: "Objetivo", personality: "Personalidad",
  script: "Script", flow_scenarios: "Escenarios", additional_instructions: "Instrucciones adicionales",
} as const;

export function PromptImportDialog({ onImport }: Props) {
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ImportedAgentFields | null>(null);
  const [draft, setDraft] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
      if (proposal) previewRef.current?.focus({ preventScroll: true });
      else headingRef.current?.focus({ preventScroll: true });
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
    } else dialogRef.current?.close();
  }, [open, proposal]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  function openDialog() { setOpen(true); setError(null); setProposal(null); }
  function closeDialog() { if (!busy) setOpen(false); }

  async function analyze() {
    const prompt = draft.trim();
    if (!prompt || prompt.length > MAX_PROMPT_CHARS) { setError(`Pega un prompt de hasta ${MAX_PROMPT_CHARS} caracteres.`); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/agents/import-prompt", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) { setError(typeof data?.error === "string" ? data.error : "No se pudo analizar el prompt."); return; }
      const result = importedAgentFieldsSchema.safeParse(data);
      if (!result.success) { setError("El análisis devolvió campos incompletos. Inténtalo de nuevo."); return; }
      setProposal(result.data);
    } catch { setError("No se pudo conectar con el servidor. Inténtalo de nuevo."); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button type="button" className={`secondary-action ${styles.trigger}`} onClick={openDialog}>Importar desde prompt</button>
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}
        onCancel={(event) => { event.preventDefault(); closeDialog(); }} onClose={() => setOpen(false)}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <div>
              <p className={styles.step}>{proposal ? "Paso 2 de 2 · Revisa la propuesta" : "Paso 1 de 2 · Pega tu prompt"}</p>
              <h2 id={titleId} ref={headingRef} tabIndex={-1}>Importar desde prompt</h2>
            </div>
            <button type="button" className={styles.close} aria-label="Cerrar importación" disabled={busy} onClick={closeDialog}>×</button>
          </div>
          <p className={styles.description}>La IA propone campos y etiquetas. Revisa el resultado antes de aplicarlo; el agente se guarda desde el formulario.</p>
        </header>
        <div ref={bodyRef} className={styles.body} aria-busy={busy}>
          {proposal ? (
            <div ref={previewRef} tabIndex={-1} className={styles.preview}>
              <p className={styles.notice} role="status">Los campos con contenido reemplazarán lo escrito. Las etiquetas nuevas se agregarán a las existentes.</p>
              <div className={styles.fields}>
                {Object.entries(fieldTitles).map(([key, title]) => (
                  <details key={key} className={styles.field}>
                    <summary><span>{title}{!proposal[key as keyof typeof fieldTitles] && <span className={styles.missing}> · Sin información</span>}</span></summary>
                    <p>{proposal[key as keyof typeof fieldTitles] || "Completa este campo manualmente si corresponde."}</p>
                  </details>
                ))}
              </div>
              <section className={styles.labels} aria-label="Etiquetas sugeridas">
                <h3>Etiquetas sugeridas ({proposal.suggested_labels.length})</h3>
                {proposal.suggested_labels.length ? <ul>{proposal.suggested_labels.map((label) => (
                  <li key={label.name}><strong>{label.name}</strong><span>{label.criteria}</span></li>
                ))}</ul> : <p className={styles.notice} role="status">No se sugirieron etiquetas. Puedes agregarlas manualmente o volver a analizar.</p>}
              </section>
              <p className={styles.reviewHelp}>Comprueba las fechas permitidas, la confidencialidad y las diferencias entre pago, devolución y aclaración.
                Selecciona la definición RAC en el formulario cuando corresponda. La importación no cambia las políticas ni las opciones de pago.</p>
            </div>
          ) : (
            <>
              <label className={styles.label}>
                Prompt del agente
                <textarea ref={textareaRef} className={styles.editor} value={draft} onChange={(event) => setDraft(event.target.value)} rows={10} maxLength={MAX_PROMPT_CHARS} disabled={busy}
                  aria-describedby={`${titleId}-privacy ${titleId}-count`} placeholder={"# IDENTIDAD\nDescribe quién es el agente y a qué empresa representa…\n\n# FLUJO\nIncluye los pasos y las reglas de la conversación."} />
              </label>
              <div className={styles.help}>
                <span id={`${titleId}-privacy`}>Se enviará el texto completo a OpenAI. Usa una plantilla sin datos personales.</span>
                <span id={`${titleId}-count`}>{draft.length.toLocaleString("es-MX")} / {MAX_PROMPT_CHARS.toLocaleString("es-MX")} caracteres</span>
              </div>
              {busy && <p className={styles.notice} role="status">Analizando el prompt. Puede tardar unos segundos…</p>}
            </>
          )}
          {error && <p role="alert" className={styles.error}>{error}</p>}
        </div>
        <footer className={styles.footer} data-preview={Boolean(proposal)}>
          <button type="button" className={`secondary-action ${styles.cancel}`} disabled={busy} onClick={closeDialog}>Cancelar</button>
          {proposal ? <>
            <button type="button" className="secondary-action" onClick={() => setProposal(null)}>Editar prompt</button>
            <button type="button" className={`primary-action ${styles.apply}`} onClick={() => { onImport(proposal); setOpen(false); }}>Aplicar al formulario</button>
          </> : <button type="button" className={`primary-action ${styles.apply}`} disabled={busy || !draft.trim()} onClick={() => void analyze()}>
            {busy ? "Analizando…" : "Analizar prompt"}
          </button>}
        </footer>
      </dialog>
    </>
  );
}
