"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { deleteAgentAction, type DeleteAgentState } from "./actions";

export function DeleteAgentButton({
  versionId,
  agentName,
}: {
  versionId: string;
  agentName: string;
}) {
  const [state, formAction, pending] = useActionState<DeleteAgentState, FormData>(
    deleteAgentAction,
    {},
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm(`¿Eliminar el perfil "${agentName}"? Esta acción no se puede deshacer.`)) {
      e.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <input type="hidden" name="version_id" value={versionId} />
      <button
        type="submit"
        className="icon-button danger-icon-button"
        aria-label={`Eliminar ${agentName}`}
        disabled={pending}
        title="Eliminar perfil"
      >
        ✕
      </button>
    </form>
  );
}
