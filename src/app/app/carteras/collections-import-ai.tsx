"use client";

import { useState } from "react";
import type { ImportAiSuggestion, ImportSheet } from "@/lib/collections-import";

const labels: Record<string, string> = {
  nombre: "Nombre del titular", telefono: "Teléfono",
  source_account_id: "Referencia de crédito", saldo_pendiente: "Posible saldo a gestionar",
};

export function CollectionsImportAi({ file, sheet, disabled, onApply }: {
  file: File; sheet: ImportSheet; disabled: boolean;
  onApply: (candidates: ImportAiSuggestion["candidates"]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<ImportAiSuggestion | null>(null);
  const [message, setMessage] = useState("");

  async function suggest() {
    setBusy(true); setMessage(""); setSuggestion(null);
    try {
      const form = new FormData(); form.set("file", file);
      form.set("sheet", sheet.name); form.set("header_row", String(sheet.header_row));
      const response = await fetch("/api/collections-import/suggest-mapping", { method: "POST", body: form });
      if (!response.ok) throw new Error("No se pudo consultar la IA. Puedes continuar asignando las columnas manualmente.");
      const data: ImportAiSuggestion = await response.json();
      if (data.header_signature !== sheet.header_signature) throw new Error("Los encabezados cambiaron; vuelve a analizarlos.");
      setSuggestion(data);
      if (data.status === "suggested") setMessage("Revisa las propuestas antes de aplicarlas. Se conservarán tus asignaciones actuales.");
      else if (data.status === "no_suggestions") setMessage("No hay equivalencias adicionales claras. Puedes asignar las columnas manualmente.");
      else if (data.status === "rate_limited") setMessage("Se alcanzó el límite temporal de consultas. Espera un minuto o continúa manualmente.");
      else setMessage("La IA no está disponible por ahora. Puedes continuar con la asignación manual.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No se pudo consultar la IA. Continúa manualmente.");
    } finally { setBusy(false); }
  }

  return <div>
    <p className="csv-form-help">Si los títulos son nuevos, la IA puede sugerir equivalencias. Al solicitarla, se envían a OpenAI sólo las etiquetas de los encabezados seleccionados; no se envían filas ni el archivo. Revisa primero que la fila elegida contenga títulos de columnas.</p>
    <button type="button" className="secondary-action" disabled={disabled || busy} onClick={() => void suggest()}>{busy ? "Consultando IA…" : "Sugerir columnas con IA"}</button>
    {message && <p role="status" className="csv-form-help">{message}</p>}
    {suggestion && suggestion.candidates.length > 0 && <>
      <ul>{suggestion.candidates.map((candidate) => <li key={candidate.column_index}>
        {sheet.columns.find((c) => c.index === candidate.column_index)?.header}: {labels[candidate.field]}
        {candidate.field === "saldo_pendiente" && " — selección manual requerida"}
      </li>)}</ul>
      {suggestion.candidates.some((c) => c.field !== "saldo_pendiente") && <button type="button" className="secondary-action" disabled={disabled || busy} onClick={() => {
        onApply(suggestion.candidates); setSuggestion(null); setMessage("Propuestas aplicadas a campos libres. Revisa las columnas y elige el saldo antes de previsualizar.");
      }}>Aplicar propuestas a campos libres</button>}
      {suggestion.candidates.some((c) => c.field === "saldo_pendiente") && <p className="csv-form-help">Elige el saldo a gestionar en la asignación de columnas. La IA no lo selecciona automáticamente.</p>}
    </>}
  </div>;
}
