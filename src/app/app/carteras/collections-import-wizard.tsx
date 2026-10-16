"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ImportAnalysis, ImportMapping, ImportOptions, ImportPreview, ImportResult, ImportSheet } from "@/lib/collections-import";
import { CollectionsImportAi } from "./collections-import-ai";
import styles from "./collections-import-wizard.module.css";

const fields = [
  ["nombre", "Nombre del titular"], ["telefono", "Teléfono"],
  ["source_account_id", "Referencia de crédito"], ["saldo_pendiente", "Saldo a gestionar"],
  ...Array.from({ length: 5 }, (_, i) => [`variable_${i + 1}`, `Variable ${i + 1}`]),
];

function Counts({ value }: { value: ImportResult }) {
  return <dl className={styles.counts}>{[["Nuevos", value.inserted], ["Actualizados", value.updated], ["Sin cambios", value.unchanged], ["Omitidos", value.skipped]].map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>;
}

function PreviewDetails({ value }: { value: ImportPreview }) {
  const errors = [...new Map(value.errors.map((item) => [`${item.row}-${item.reason}`, item])).values()];
  return <>
    <h4>3. Confirma los cambios</h4>
    <Counts value={value} />
    <p className="csv-form-help">{value.source_rows} filas de origen · {value.normalized_contacts} destinos · {value.distinct_credits} referencias de crédito.</p>
    {value.credits_with_multiple_phones > 0 && <p className={styles.note}>{value.credits_with_multiple_phones} créditos tienen varios teléfonos. Se conservarán como destinos distintos de la misma referencia.</p>}
    {value.zero_balance_contacts > 0 && <p className={styles.warning}>{value.zero_balance_contacts} destinos tienen saldo cero. Se conservará ese valor y los recordatorios quedarán bloqueados por la prevalidación.</p>}
    {value.blocked_reason && <p className={styles.warning}>{value.blocked_reason}</p>}
    {errors.length > 0 && <details><summary>Revisar {value.skipped} filas o destinos omitidos</summary><ul className={styles.errors}>{errors.map((item) => <li key={`${item.row}-${item.reason}`}>Fila {item.row}: {item.reason}</li>)}</ul>{value.skipped > value.errors.length && <p>Se muestran los primeros {value.errors.length} errores.</p>}</details>}
  </>;
}

export function CollectionsImportWizard({ portfolioId, portfolioName }: { portfolioId: string; portfolioName: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [sheet, setSheet] = useState<ImportSheet | null>(null);
  const [headerRow, setHeaderRow] = useState(1);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [amountFormat, setAmountFormat] = useState<ImportOptions["amount_format"]>("dot_decimal");
  const [profileId, setProfileId] = useState("");
  const [remember, setRemember] = useState(false);
  const [formatName, setFormatName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);

  function invalidate() { setPreview(null); setResult(null); setError(""); }

  async function post<T>(route: string, form: FormData): Promise<T> {
    const response = await fetch(`/api/collections-import/${route}`, { method: "POST", body: form });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error ?? "No se pudo procesar el archivo");
    }
    return response.json() as Promise<T>;
  }

  async function analyze(selectedFile: File, selectedSheet?: string, selectedHeader?: number) {
    const id = ++requestId.current;
    invalidate(); setBusy(true);
    try {
      if (selectedFile.size > 4 * 1024 * 1024) throw new Error("El archivo supera 4 MiB");
      const form = new FormData(); form.set("file", selectedFile);
      if (selectedSheet) form.set("sheet", selectedSheet);
      if (selectedHeader) form.set("header_row", String(selectedHeader));
      const data = await post<ImportAnalysis>("analyze", form);
      if (id !== requestId.current) return;
      const chosen = data.sheets.find((s) => s.name === data.selected_sheet);
      if (!chosen) throw new Error("No se encontraron encabezados utilizables");
      const profile = data.profiles.find((p) => p.id === data.matched_profile_id);
      setAnalysis(data); setSheet(chosen); setHeaderRow(chosen.header_row);
      setMapping(profile?.options.mapping ?? chosen.suggested_mapping);
      setAmountFormat(profile?.options.amount_format ?? "dot_decimal");
      setProfileId(profile?.id ?? ""); setFormatName(profile?.name ?? ""); setRemember(false);
    } catch (cause) {
      if (id === requestId.current) { setAnalysis(null); setSheet(null); setError(cause instanceof Error ? cause.message : "No se pudo analizar el archivo"); }
    } finally { if (id === requestId.current) setBusy(false); }
  }

  function assign(index: number, field: string) {
    invalidate(); setProfileId("");
    setMapping((current) => {
      const next: ImportMapping = {};
      for (const [key, columns] of Object.entries(current)) {
        const remaining = columns.filter((column) => column !== index);
        if (remaining.length) next[key] = remaining;
      }
      if (field) next[field] = field === "telefono" ? [...(next[field] ?? []), index] : [index];
      return next;
    });
  }

  const canPreview = file && sheet && headerRow === sheet.header_row &&
    ["nombre", "telefono", "saldo_pendiente"].every((key) => mapping[key]?.length) && (mapping.telefono?.length ?? 0) <= 5;

  async function makePreview() {
    if (!file || !sheet || !canPreview) return;
    invalidate(); setBusy(true);
    try {
      const form = new FormData(); form.set("file", file);
      form.set("options", JSON.stringify({ sheet: sheet.name, header_row: sheet.header_row, mapping, amount_format: amountFormat }));
      setPreview(await post<ImportPreview>(`${portfolioId}/preview`, form));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo previsualizar"); }
    finally { setBusy(false); }
  }

  async function confirm() {
    if (!file || !preview?.can_confirm) return;
    setError(""); setBusy(true);
    try {
      if (remember && !formatName.trim()) throw new Error("Escribe un nombre para recordar este formato");
      const form = new FormData(); form.set("file", file); form.set("preview_id", preview.preview_id);
      if (remember) form.set("format_name", formatName.trim());
      setResult(await post<ImportResult>(`${portfolioId}/confirm`, form));
      setPreview(null); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo importar"); }
    finally { setBusy(false); }
  }

  return <div className={styles.wizard} aria-busy={busy}>
    <label className={styles.label}>Archivo para {portfolioName}
      <input className="csv-file-input" type="file" accept=".csv,.xlsx" disabled={busy} onChange={(event) => {
        const selected = event.target.files?.[0] ?? null;
        setFile(selected); setAnalysis(null); setSheet(null); invalidate();
        if (selected) void analyze(selected);
      }} />
    </label>
    <p className="csv-form-help">CSV o XLSX, hasta 4 MiB. Primero revisas el formato y los cambios; después confirmas la importación. Teléfonos mexicanos y saldos en MXN.</p>
    {busy && <p role="status">Procesando archivo…</p>}
    {analysis && sheet && <>
      <fieldset className={styles.section} disabled={busy}>
        <legend>1. Revisa el origen</legend>
        <div className={styles.controls}>
          <label className={styles.label}>Hoja
            <select value={sheet.name} onChange={(e) => file && void analyze(file, e.target.value)}>{analysis.sheets.map((s) => <option key={s.name}>{s.name}</option>)}</select>
          </label>
          <label className={styles.label}>Fila de encabezados
            <input type="number" min={1} max={50} value={headerRow || ""} onChange={(e) => {
              const value = e.currentTarget.valueAsNumber;
              setHeaderRow(Number.isFinite(value) && Number.isInteger(value) && value >= 1 && value <= 50 ? value : 0);
              invalidate();
            }} />
          </label>
          <button type="button" className="secondary-action" disabled={!headerRow || headerRow > 50} onClick={() => file && void analyze(file, sheet.name, headerRow)}>Actualizar encabezados</button>
        </div>
        <p className="csv-form-help">{sheet.data_rows} filas de datos detectadas. Cambia la fila si el archivo tiene un título o notas antes de sus columnas.</p>
      </fieldset>
      <fieldset className={styles.section} disabled={busy}>
        <legend>2. Asigna las columnas</legend>
        {analysis.profiles.length > 0 && <label className={styles.label}>Formato guardado del cliente
          <select value={profileId} onChange={(event) => {
            invalidate(); setProfileId(event.target.value);
            const profile = analysis.profiles.find((p) => p.id === event.target.value);
            setMapping(profile?.options.mapping ?? sheet.suggested_mapping);
            setAmountFormat(profile?.options.amount_format ?? "dot_decimal");
            setFormatName(profile?.name ?? "");
          }}><option value="">Asignación sugerida</option>{analysis.profiles.map((p) => <option key={p.id} value={p.id} disabled={p.header_signature !== sheet.header_signature}>{p.name}{p.header_signature !== sheet.header_signature ? " — columnas diferentes" : ""}</option>)}</select>
        </label>}
        {profileId && <p className={styles.note}>Se reconoció un formato guardado con las mismas columnas. Puedes revisar sus equivalencias.</p>}
        {file && <CollectionsImportAi key={`${sheet.name}:${sheet.header_row}:${sheet.header_signature}`} file={file} sheet={sheet} disabled={busy || headerRow !== sheet.header_row} onApply={(candidates) => {
          invalidate(); setProfileId("");
          setMapping((current) => {
            const next = { ...current };
            const used = new Set(Object.values(current).flat());
            for (const candidate of candidates) {
              if (candidate.field === "saldo_pendiente" || used.has(candidate.column_index) || next[candidate.field]?.length) continue;
              next[candidate.field] = candidates.filter((c) => c.field === candidate.field && !used.has(c.column_index)).map((c) => c.column_index).slice(0, candidate.field === "telefono" ? 5 : 1);
              for (const index of next[candidate.field]) used.add(index);
            }
            return next;
          });
        }} />}
        <div className={styles.mapping}>
          {sheet.columns.map((column) => <label className={styles.column} key={column.index}>
            <span><strong>{column.header}</strong><small>Columna {column.index + 1}</small></span>
            <select aria-label={`Asignar ${column.header} (columna ${column.index + 1})`} value={Object.entries(mapping).find(([, positions]) => positions.includes(column.index))?.[0] ?? ""} onChange={(e) => assign(column.index, e.target.value)}>
              <option value="">No importar</option>{fields.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>)}
        </div>
        {!mapping.saldo_pendiente?.length && <p className={styles.warning}>Selecciona qué columna contiene el saldo que debemos gestionar. No sumaremos ni elegiremos entre varios saldos por ti.</p>}
        {(mapping.telefono?.length ?? 0) > 5 && <p className={styles.warning}>Selecciona hasta cinco columnas de teléfono.</p>}
        <label className={styles.label}>Formato de los importes escritos como texto
          <select value={amountFormat} onChange={(e) => { setAmountFormat(e.target.value as ImportOptions["amount_format"]); invalidate(); }}>
            <option value="dot_decimal">Punto decimal: 1,234.56</option><option value="comma_decimal">Coma decimal: 1.234,56</option>
          </select>
        </label>
        <p className="csv-form-help">Necesitamos titular, teléfono y saldo a gestionar. La referencia de crédito conserva deudas distintas aunque compartan teléfono. Puedes asignar varios teléfonos sin sumar saldos.</p>
        {!mapping.source_account_id?.length && <p className={styles.note}>Sin referencia de crédito, las coincidencias se resolverán por teléfono y nombre del titular.</p>}
      </fieldset>
      <button type="button" className="secondary-action" disabled={busy || !canPreview} onClick={() => void makePreview()}>Previsualizar cambios</button>
    </>}
    {preview && <section className={styles.section} aria-label="Previsualización de importación">
      <PreviewDetails value={preview} />
      <label className={styles.checkbox}><input type="checkbox" checked={remember} disabled={busy} onChange={(e) => setRemember(e.target.checked)} /> Recordar este formato para el cliente</label>
      {remember && <label className={styles.label}>Nombre del formato<input value={formatName} maxLength={120} disabled={busy} onChange={(e) => setFormatName(e.target.value)} placeholder="Ej. RAC — entrega mensual" /></label>}
      <p className="csv-form-help">Importar conservará los IDs existentes. No eliminará contactos, no reactivará contactos desactivados ni iniciará campañas. La vista previa vence en 20 minutos.</p>
      <button type="button" className="primary-action" disabled={busy || !preview.can_confirm || (remember && !formatName.trim())} onClick={() => void confirm()}>Confirmar importación</button>
    </section>}
    {result && <section className={styles.result} role="status"><h4>Importación completada</h4><Counts value={result} /><p>Los cambios se aplicaron a {portfolioName}.</p></section>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
