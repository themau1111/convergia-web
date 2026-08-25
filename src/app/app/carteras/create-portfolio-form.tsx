"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCsvPortfolio } from "@/lib/control-api";

export function CreatePortfolioForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = nameRef.current?.value.trim() ?? "";
    if (!name) { setError("El nombre es obligatorio."); return; }
    setError("");
    startTransition(async () => {
      try {
        await createCsvPortfolio(name);
        router.refresh();
        setOpen(false);
        if (nameRef.current) nameRef.current.value = "";
      } catch {
        setError("No fue posible crear la cartera. Intenta de nuevo.");
      }
    });
  }

  if (!open) {
    return (
      <button className="primary-action" onClick={() => setOpen(true)}>
        Nueva cartera <span>+</span>
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="csv-create-form">
      <label>
        Nombre de la cartera
        <input ref={nameRef} type="text" placeholder="Cobranza enero 2025" maxLength={120} required autoFocus />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="secondary-action" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <button type="submit" className="primary-action" disabled={pending}>
          {pending ? "Creando…" : "Crear cartera"}
        </button>
      </div>
    </form>
  );
}
