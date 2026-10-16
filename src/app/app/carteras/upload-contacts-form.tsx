"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type UploadResult = {
  inserted: number;
  updated?: number;
  unchanged?: number;
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
          className="csv-file-input"
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          required
        />
      </label>
      <p className="csv-form-help">
        Columnas: <strong>Telefono</strong>, <strong>Nombre</strong>, <strong>Saldo</strong> (o Total 2), Subcredito y Variable 1 … Variable 5. Formatos: CSV o XLSX.
      </p>
      <p className="csv-form-help">Reimportar actualiza el mismo crédito y teléfono sin duplicarlos. Conserva Subcredito cuando haya varias deudas por contacto. Los recordatorios requieren saldo positivo.</p>
      <button type="submit" className="secondary-action" disabled={pending}>
        {pending ? "Importando…" : `Importar a "${portfolioName}"`}
      </button>

      {uploadError && <p className="form-error" role="alert">{uploadError}</p>}

      {result && (
        <div className="upload-result csv-upload-result" role="status">
          <strong>{result.inserted} contactos nuevos</strong>
          {(result.updated ?? 0) > 0 && <span> · {result.updated} actualizados</span>}
          {(result.unchanged ?? 0) > 0 && <span> · {result.unchanged} sin cambios</span>}
          {result.skipped > 0 && <span> · {result.skipped} omitidos</span>}
          {result.errors.length > 0 && (
            <>
              <span> · {result.errors.length} con error</span>
              <ul className="csv-upload-errors">
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
