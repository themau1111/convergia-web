"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCsvPortfolioAction } from "./actions";

type UploadResult = {
  inserted: number;
  skipped: number;
  errors: { row: number; reason: string }[];
};

export function CreatePortfolioForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [pending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function reset() {
    setOpen(false);
    setError("");
    setUploadResult(null);
    if (nameRef.current) nameRef.current.value = "";
    if (fileRef.current) fileRef.current.value = "";
  }

  async function uploadCsv(portfolioId: string, file: File): Promise<UploadResult | null> {
    const formData = new FormData();
    formData.set("portfolio_id", portfolioId);
    formData.set("file", file);
    const res = await fetch("/api/upload-csv-contacts", { method: "POST", body: formData });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `Error ${res.status}`);
    }
    return res.json() as Promise<UploadResult>;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = nameRef.current?.value.trim() ?? "";
    if (!name) { setError("El nombre es obligatorio."); return; }
    setError("");
    setUploadResult(null);

    startTransition(async () => {
      try {
        const portfolio = await createCsvPortfolioAction(name);

        const file = fileRef.current?.files?.[0];
        if (file) {
          const result = await uploadCsv(portfolio.id, file);
          setUploadResult(result);
        }

        router.refresh();
        // Stay open only if there's an upload result to display; close otherwise
        if (!file) reset();
        else {
          if (nameRef.current) nameRef.current.value = "";
          if (fileRef.current) fileRef.current.value = "";
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible crear la cartera. Intenta de nuevo.");
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
        <input
          ref={nameRef}
          type="text"
          placeholder="Cobranza enero 2025"
          maxLength={120}
          required
          autoFocus
        />
      </label>

      <label>
        Archivo CSV o Excel <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opcional — puedes subirlo después)</span>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
        />
      </label>
      <p className="muted" style={{ fontSize: 12, margin: "-4px 0 0" }}>
        Columnas esperadas: <strong>Telefono</strong>, <strong>Nombre</strong>, Variable 1 … Variable 5
      </p>

      {error && <p className="form-error" role="alert">{error}</p>}

      {uploadResult && (
        <div className="upload-result">
          <strong>{uploadResult.inserted} contactos importados</strong>
          {uploadResult.skipped > 0 && <span> · {uploadResult.skipped} omitidos</span>}
          {uploadResult.errors.length > 0 && (
            <>
              <span> · {uploadResult.errors.length} con error</span>
              <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 12, color: "#9b432d" }}>
                {uploadResult.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>Fila {err.row}: {err.reason}</li>
                ))}
                {uploadResult.errors.length > 5 && <li>… y {uploadResult.errors.length - 5} más</li>}
              </ul>
            </>
          )}
          <button type="button" className="secondary-action" style={{ marginTop: 10 }} onClick={reset}>
            Cerrar
          </button>
        </div>
      )}

      {!uploadResult && (
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="secondary-action" onClick={reset}>
            Cancelar
          </button>
          <button type="submit" className="primary-action" disabled={pending}>
            {pending ? "Creando…" : "Crear cartera"}
          </button>
        </div>
      )}
    </form>
  );
}
