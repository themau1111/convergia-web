"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type UploadResult = {
  inserted: number;
  skipped: number;
  errors: { row: number; reason: string }[];
};

export function UploadCsvContactsForm({ portfolioId, portfolioName }: { portfolioId: string; portfolioName: string }) {
  const [result, setResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setResult(null);
    setUploadError(null);
    setPending(true);

    try {
      const formData = new FormData();
      formData.set("portfolio_id", portfolioId);
      formData.set("file", file);

      const response = await fetch("/api/upload-csv-contacts", {
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
      router.refresh();
    } catch {
      setUploadError("No fue posible conectar con el servidor. Intenta de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="csv-upload-form">
      <label>
        Archivo de contactos
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          required
        />
      </label>
      <p className="muted" style={{ fontSize: 12, margin: "-4px 0 0" }}>
        Columnas: <strong>Telefono</strong>, <strong>Nombre</strong>, Variable 1 … Variable 5 · Formatos: CSV o XLSX
      </p>
      <button type="submit" className="secondary-action" disabled={pending}>
        {pending ? "Importando…" : `Importar a "${portfolioName}"`}
      </button>

      {uploadError && <p className="form-error" role="alert">{uploadError}</p>}

      {result && (
        <div className="upload-result">
          <strong>{result.inserted} contactos importados</strong>
          {result.skipped > 0 && <span> · {result.skipped} omitidos</span>}
          {result.errors.length > 0 && (
            <>
              <span> · {result.errors.length} con error</span>
              <ul style={{ margin: "8px 0 0", paddingLeft: 16, fontSize: 12, color: "#9b432d" }}>
                {result.errors.slice(0, 8).map((err, i) => (
                  <li key={i}>Fila {err.row}: {err.reason}</li>
                ))}
                {result.errors.length > 8 && <li>… y {result.errors.length - 8} más</li>}
              </ul>
            </>
          )}
        </div>
      )}
    </form>
  );
}
