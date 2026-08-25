"use client";

import { useState } from "react";
import type { AgentLabelRecord } from "@/lib/control-api";

type PendingLabel = { name: string; criteria: string };

export function LabelsPicker({ library }: { library: AgentLabelRecord[] }) {
  const [pending, setPending] = useState<PendingLabel[]>([]);
  const [name, setName] = useState("");
  const [criteria, setCriteria] = useState("");
  const [error, setError] = useState("");

  // Etiquetas únicas de la biblioteca no todavía en la lista pendiente
  const uniqueLibrary = library.filter(
    (l, i, arr) =>
      arr.findIndex((x) => x.name.toLowerCase() === l.name.toLowerCase()) === i &&
      !pending.some((p) => p.name.toLowerCase() === l.name.toLowerCase()),
  );

  function addLabel() {
    const trimName = name.trim();
    const trimCriteria = criteria.trim();
    if (!trimName) { setError("El nombre de la etiqueta es obligatorio."); return; }
    if (!trimCriteria) { setError("La descripción / criterio es obligatorio."); return; }
    if (pending.some((p) => p.name.toLowerCase() === trimName.toLowerCase())) {
      setError("Ya agregaste una etiqueta con ese nombre.");
      return;
    }
    setPending((prev) => [...prev, { name: trimName, criteria: trimCriteria }]);
    setName("");
    setCriteria("");
    setError("");
  }

  function removeLabel(index: number) {
    setPending((prev) => prev.filter((_, i) => i !== index));
  }

  function pickFromLibrary(label: AgentLabelRecord) {
    if (pending.some((p) => p.name.toLowerCase() === label.name.toLowerCase())) return;
    setPending((prev) => [...prev, { name: label.name, criteria: label.criteria }]);
  }

  return (
    <div className="labels-picker">
      {/* Hidden field serializado para el server action */}
      <input type="hidden" name="labels_json" value={JSON.stringify(pending)} />

      {/* Biblioteca de etiquetas previas */}
      {uniqueLibrary.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p className="label-library-heading">Biblioteca · clic para agregar</p>
          <div className="label-library-list">
            {uniqueLibrary.map((l) => (
              <button
                key={l.id}
                type="button"
                className="label-library-chip"
                onClick={() => pickFromLibrary(l)}
                title={l.criteria}
              >
                + {l.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de etiquetas pendientes */}
      {pending.length > 0 && (
        <div className="agent-labels-list" style={{ marginBottom: 20 }}>
          {pending.map((label, i) => (
            <div className="agent-label-row" key={`${label.name}-${i}`}>
              <div>
                <strong>{label.name}</strong>
                <small className="muted">{label.criteria}</small>
              </div>
              <button
                type="button"
                className="danger-text"
                onClick={() => removeLabel(i)}
                style={{ fontSize: 11 }}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formulario para agregar nueva etiqueta */}
      <div>
        <div className="form-grid">
          <label>
            Nombre de la etiqueta
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLabel(); } }}
              placeholder="Falta de pago"
              maxLength={80}
            />
          </label>
          <label>
            Descripción / criterio de detección
            <input
              type="text"
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLabel(); } }}
              placeholder="El cliente indicó que no puede pagar en este momento por falta de liquidez"
              maxLength={500}
            />
          </label>
        </div>
        {error && <p className="form-error" role="alert" style={{ marginTop: 8 }}>{error}</p>}
        <button type="button" className="secondary-action" onClick={addLabel} style={{ marginTop: 10 }}>
          Agregar etiqueta
        </button>
      </div>
    </div>
  );
}
