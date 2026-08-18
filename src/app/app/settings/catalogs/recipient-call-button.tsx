"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { callClientAction, type CallState } from "./actions";

export function RecipientCallButton({
  portfolioId,
  clientId,
  portfolioName,
}: {
  portfolioId: string;
  clientId: number;
  portfolioName: string;
}) {
  const [state, formAction, pending] = useActionState<CallState, FormData>(callClientAction, {});

  useEffect(() => {
    if (state.status === "ok") {
      toast.success("Llamada iniciada", {
        description: `UUID: ${state.call_uuid}`,
      });
    } else if (state.status === "error") {
      toast.error("No se pudo iniciar la llamada", {
        description: state.message,
      });
    }
  }, [state]);

  return (
    <form action={formAction} className="recipient-call-form">
      <input type="hidden" name="portfolio_id" value={portfolioId} />
      <input type="hidden" name="client_id" value={String(clientId)} />
      <div>
        <strong>Llamada individual</strong>
        <small>Usará la identidad configurada para {portfolioName}.</small>
      </div>
      <label className="call-confirm">
        <input type="checkbox" name="confirmed" value="yes" required /> Confirmo una llamada real
      </label>
      <button className="test-call-button" disabled={pending}>
        {pending ? "Iniciando…" : "Llamar ahora"}
      </button>
    </form>
  );
}
