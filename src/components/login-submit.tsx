"use client";

import { Loader2Icon, ShieldCheckIcon } from "lucide-react";
import { useFormStatus } from "react-dom";

export function LoginSubmit() {
  const { pending } = useFormStatus();

  return (
    <>
      <button
        type="submit"
        className="login-button"
        disabled={pending}
        aria-disabled={pending}
      >
        {pending ? (
          <>
            Conectando… <Loader2Icon className="login-button-spinner" aria-hidden="true" />
          </>
        ) : (
          <>
            Entrar a Cadencia <span aria-hidden="true">↗</span>
          </>
        )}
      </button>

      {pending ? (
        <div className="login-loading-backdrop" role="status" aria-live="polite">
          <div className="login-loading-card">
            <div className="login-loading-icon" aria-hidden="true">
              <ShieldCheckIcon />
              <Loader2Icon className="login-loading-spinner" />
            </div>
            <p className="eyebrow">Acceso seguro</p>
            <h2>Conectando con tu organización…</h2>
            <p>Te llevaremos a Auth0 para verificar tu identidad.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
