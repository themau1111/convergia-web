"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { addLabelAction, removeLabelAction, type LabelState } from "./actions";
import type { AgentLabelRecord } from "@/lib/control-api";

export function AddLabelForm({
  agentId,
  library = [],
}: {
  agentId: string;
  library?: AgentLabelRecord[];
}) {
  const boundAction = addLabelAction.bind(null, agentId);
  const [state, formAction, pending] = useActionState<LabelState, FormData>(boundAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const criteriaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Etiqueta agregada", { description: state.ok });
      formRef.current?.reset();
    } else if (state.error) {
      toast.error("Error", { description: state.error });
    }
  }, [state]);

  function pickFromLibrary(label: AgentLabelRecord) {
    if (nameRef.current) nameRef.current.value = label.name;
    if (criteriaRef.current) criteriaRef.current.value = label.criteria;
    nameRef.current?.focus();
  }

  return (
    <>
      {library.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p className="label-library-heading">Biblioteca · clic para prerellenar</p>
          <div className="label-library-list">
            {library.map((l) => (
              <button
                key={l.id}
                type="button"
                className="label-library-chip"
                onClick={() => pickFromLibrary(l)}
                title={l.criteria}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <form ref={formRef} action={formAction} className="agent-label-form">
        <div className="form-grid">
          <label>
            Nombre de la etiqueta
            <input ref={nameRef} name="name" required placeholder="Promesa de pago" maxLength={80} />
          </label>
          <label>
            Criterio de detección
            <input
              ref={criteriaRef}
              name="criteria"
              required
              placeholder="El cliente prometió pagar en una fecha específica"
              maxLength={500}
            />
          </label>
        </div>
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
        <button type="submit" className="secondary-action" disabled={pending}>
          {pending ? "Agregando…" : "Agregar etiqueta"}
        </button>
      </form>
    </>
  );
}

export function DeleteLabelForm({
  agentId,
  labelId,
  labelName,
}: {
  agentId: string;
  labelId: string;
  labelName: string;
}) {
  const [, formAction, pending] = useActionState<LabelState, FormData>(removeLabelAction, {});
  return (
    <form action={formAction} style={{ display: "inline" }}>
      <input type="hidden" name="agent_id" value={agentId} />
      <input type="hidden" name="label_id" value={labelId} />
      <button
        type="submit"
        className="danger-text"
        disabled={pending}
        title={`Eliminar etiqueta "${labelName}"`}
        style={{ fontSize: 11 }}
      >
        {pending ? "…" : "Eliminar"}
      </button>
    </form>
  );
}
