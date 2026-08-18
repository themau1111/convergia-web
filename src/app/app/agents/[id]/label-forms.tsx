"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { addLabelAction, removeLabelAction, type LabelState } from "./actions";

export function AddLabelForm({ agentId }: { agentId: string }) {
  const boundAction = addLabelAction.bind(null, agentId);
  const [state, formAction, pending] = useActionState<LabelState, FormData>(boundAction, {});

  useEffect(() => {
    if (state.ok) toast.success("Etiqueta agregada", { description: state.ok });
    else if (state.error) toast.error("Error", { description: state.error });
  }, [state]);

  return (
    <form action={formAction} className="agent-label-form">
      <div className="form-grid">
        <label>
          Nombre de la etiqueta
          <input name="name" required placeholder="Promesa de pago" maxLength={80} />
        </label>
        <label>
          Criterio de detección
          <input name="criteria" required placeholder="El cliente prometió pagar en una fecha específica" maxLength={500} />
        </label>
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button type="submit" className="secondary-action" disabled={pending}>
        {pending ? "Agregando…" : "Agregar etiqueta"}
      </button>
    </form>
  );
}

export function DeleteLabelForm({ agentId, labelId, labelName }: { agentId: string; labelId: string; labelName: string }) {
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
