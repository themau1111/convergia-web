"use client";

import { useRef, useState } from "react";

type UploadResult = {
  inserted: number;
  skipped: number;
  errors: { row: number; reason: string }[];
};

export function UploadContactsForm({ portfolioId, portfolioName }: { portfolioId: string; portfolioName: string }) {
  const [result, setResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setResult(null);
    setUploadError(null);
    setPending(true);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch(`/api/upload-contacts/${encodeURIComponent(portfolioId)}`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setUploadError(data.error ?? `Error ${response.status}`);
        return;
      }

      setResult(data as UploadResult);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setUploadError("No fue posible conectar con el servidor. Intenta de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="portfolio-upload-panel">
      <summary><span><strong>Importar contactos</strong><small>Carga un archivo .csv o .xlsx a {portfolioName}</small></span><b>Importar</b></summary>
      <form onSubmit={handleSubmit} className="upload-contacts-form">
        <label>
          Archivo de contactos
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx"
            required
            style={{ border: "1px solid #d5d6cf", borderRadius: 9, background: "white", padding: "10px 12px", width: "100%" }}
          />
        </label>
        <small className="muted">Formatos aceptados: .csv y .xlsx. El archivo debe incluir columnas de teléfono y nombre.</small>
        <button type="submit" className="secondary-action" disabled={pending}>
          {pending ? "Importando…" : "Importar archivo"}
        </button>

        {uploadError && (
          <p className="form-error" role="alert">{uploadError}</p>
        )}

        {result && (
          <div className="upload-result">
            <strong>{result.inserted} contactos importados</strong>
            {result.skipped > 0 && <span> · {result.skipped} omitidos</span>}
            {result.errors.length > 0 && (
              <>
                <span> · {result.errors.length} con error</span>
                <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 12, color: "#9b432d" }}>
                  {result.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>Fila {err.row}: {err.reason}</li>
                  ))}
                  {result.errors.length > 10 && <li>… y {result.errors.length - 10} más</li>}
                </ul>
              </>
            )}
          </div>
        )}
      </form>
    </details>
  );
}
