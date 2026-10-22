"use client";

import styles from "./labels-picker.module.css";

import { useState } from "react";
import type { AgentLabelRecord } from "@/lib/control-api";

import type { PendingLabel } from "@/lib/agent-prompt-import";
export type { PendingLabel } from "@/lib/agent-prompt-import";

type Props = {
  library: AgentLabelRecord[];
  pending: PendingLabel[];
  onChange: (labels: PendingLabel[]) => void;
};

export function LabelsPicker({ library, pending, onChange }: Props) {
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
    if (pending.length >= 50) { setError("Puedes agregar hasta 50 etiquetas."); return; }
    const trimName = name.trim();
    const trimCriteria = criteria.trim();
    if (!trimName) { setError("El nombre de la etiqueta es obligatorio."); return; }
    if (!trimCriteria) { setError("La descripción / criterio es obligatorio."); return; }
    if (pending.some((p) => p.name.toLowerCase() === trimName.toLowerCase())) {
      setError("Ya agregaste una etiqueta con ese nombre.");
      return;
    }
    onChange([...pending, { name: trimName, criteria: trimCriteria }]);
    setName("");
    setCriteria("");
    setError("");
  }

  function removeLabel(index: number) {
    onChange(pending.filter((_, i) => i !== index));
  }

  function pickFromLibrary(label: AgentLabelRecord) {
    if (pending.some((p) => p.name.toLowerCase() === label.name.toLowerCase())) return;
    if (pending.length >= 50) { setError("Puedes agregar hasta 50 etiquetas."); return; }
    onChange([...pending, { name: label.name, criteria: label.criteria }]);
  }

  return (
    <div className={`labels-picker ${styles.picker}`}>
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
            <div className="agent-label-row" key={label.name.trim().toLocaleLowerCase("es")}>
              <div>
                <strong>{label.name}</strong>
                <small className="muted">{label.criteria}</small>
              </div>
              <button
                type="button"
                className={styles.remove}
                onClick={() => removeLabel(i)}
                aria-label={`Quitar etiqueta ${label.name}`}
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
            <textarea
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              rows={3}
              placeholder="Por ejemplo: el cliente indica que no puede pagar por falta de liquidez"
              maxLength={500}
            />
          </label>
        </div>
        {error && <p className="form-error" role="alert" style={{ marginTop: 8 }}>{error}</p>}
        <button type="button" className={`secondary-action ${styles.add}`} onClick={addLabel}>
          Agregar etiqueta
        </button>
      </div>
    </div>
  );
}
