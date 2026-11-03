"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { submitCampaign } from "./actions";
import type { AgentProfileRecord, AgentVariable, TelephonyResultOption } from "@/lib/control-api";
import type { ImportAnalysis } from "@/lib/collections-import";

// ─── Local types ─────────────────────────────────────────────────────────────

type AgentWithLabels = AgentProfileRecord & { labels: { id: string; name: string }[] };

/**
 * The /api/collections-import/analyze endpoint returns ImportAnalysis.
 * The backend may extend it with campaign-specific fields as it evolves.
 */
type CampaignAnalysis = ImportAnalysis & {
  file_id?: string;
  valid_rows?: number;
  discarded_rows?: number;
  discard_reasons?: { reason: string; count: number }[];
};

type CampaignMappingSuggestion = {
  status: "suggested" | "no_suggestions" | "unavailable" | "disabled" | "rate_limited";
  mapping?: Record<string, string>; // variable_name → column_header
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ["Campaña", "Base de contactos", "Variables", "Dialer", "Programación", "Resumen"] as const;

const TZ_OFFSETS: Record<string, string> = {
  "America/Mexico_City": "-06:00",
  "America/Monterrey": "-06:00",
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function toIso(localValue: string, timezone: string): string {
  return `${localValue}:00${TZ_OFFSETS[timezone] ?? "-06:00"}`;
}

/** Returns YYYY-MM-DDTHH:MM defaults based on current Mexico City time (UTC-6). */
function getMexicoDefaults(): { start: string; end: string } {
  const now = new Date();
  // Convert to approximate Mexico City time (UTC-6 standard; ignores DST)
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const mxMs = utcMs - 6 * 60 * 60_000;
  const mxNow = new Date(mxMs);
  // If it's past 9 PM, default to tomorrow
  const base = mxNow.getUTCHours() >= 21
    ? new Date(mxMs + 24 * 60 * 60_000)
    : mxNow;
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, "0");
  const d = String(base.getUTCDate()).padStart(2, "0");
  return { start: `${y}-${m}-${d}T08:00`, end: `${y}-${m}-${d}T21:00` };
}

/**
 * Formats the schedule window as human-readable Spanish text.
 * e.g. "martes 3 nov 2026, 8:00 a.m. a 9:00 p.m. (hora del centro)"
 */
function formatSchedule(startAt: string, endAt: string, timezone: string): string {
  if (!startAt || !endAt) return "No configurado";
  const off = TZ_OFFSETS[timezone] ?? "-06:00";
  try {
    const s = new Date(`${startAt}:00${off}`);
    const e = new Date(`${endAt}:00${off}`);
    const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const fmt12 = (d: Date) => {
      const h = d.getUTCHours();
      const min = String(d.getUTCMinutes()).padStart(2, "0");
      return `${h % 12 || 12}:${min} ${h >= 12 ? "p.m." : "a.m."}`;
    };
    const tzLabel =
      timezone === "America/Mexico_City" || timezone === "America/Monterrey"
        ? "hora del centro"
        : timezone;
    return `${days[s.getUTCDay()]} ${s.getUTCDate()} ${months[s.getUTCMonth()]} ${s.getUTCFullYear()}, ${fmt12(s)} a ${fmt12(e)} (${tzLabel})`;
  } catch {
    return `${startAt} – ${endAt}`;
  }
}

// ─── ReviewCard sub-component ─────────────────────────────────────────────────

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="review-card">
      <div className="review-card-header">
        <strong>{title}</strong>
        <button type="button" className="link-action" onClick={onEdit}>
          Editar
        </button>
      </div>
      {children}
    </div>
  );
}

// ─── Main wizard component ────────────────────────────────────────────────────

export function CampaignWizard({
  agentProfiles,
  telephonyResults,
}: {
  agentProfiles: AgentWithLabels[];
  telephonyResults: TelephonyResultOption[];
}) {
  const defaults = useMemo(() => getMexicoDefaults(), []);

  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // ── File upload state ────────────────────────────────────────────────────────
  const [contactFile, setContactFile] = useState<File | null>(null);
  const [fileAnalysis, setFileAnalysis] = useState<CampaignAnalysis | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  // Incrementing key forces the <input type="file"> to remount (clearing its selection)
  const [fileInputKey, setFileInputKey] = useState(0);

  // ── AI mapping suggestion state ──────────────────────────────────────────────
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestMessage, setSuggestMessage] = useState("");

  // ── Campaign draft ───────────────────────────────────────────────────────────
  const [draft, setDraft] = useState({
    name: "",
    agentProfileVersionId: agentProfiles[0]?.id ?? "",
    // variableMapping: agentVariableName → 0-based column index (0 = phone, so valid ≥ 1)
    variableMapping: {} as Record<string, number | null>,
    rounds: 1,
    cooldownMinutes: 60,
    telephonyFilter: [] as string[],
    labelFilter: [] as string[],
    timezone: "America/Mexico_City",
    startAt: defaults.start,
    endAt: defaults.end,
    notes: "",
  });

  // ── Derived values ───────────────────────────────────────────────────────────

  const selectedAgent = useMemo(
    () => agentProfiles.find((a) => a.id === draft.agentProfileVersionId),
    [draft.agentProfileVersionId, agentProfiles],
  );

  const agentVars: AgentVariable[] = selectedAgent?.agent_variables ?? [];

  const selectedSheet = useMemo(() => {
    if (!fileAnalysis) return null;
    return (
      fileAnalysis.sheets.find((s) => s.name === fileAnalysis.selected_sheet)
      ?? fileAnalysis.sheets[0]
      ?? null
    );
  }, [fileAnalysis]);

  const fileColumns = useMemo(() => selectedSheet?.columns ?? [], [selectedSheet]);

  /** Columns available for agent-variable mapping (exclude column 0 = phone). */
  const mappableColumns = useMemo(
    () => fileColumns.filter((c) => c.index > 0),
    [fileColumns],
  );

  const totalRows = selectedSheet?.data_rows ?? 0;
  const validRows = fileAnalysis?.valid_rows;
  const discardedRows = fileAnalysis?.discarded_rows;
  const validContactCount = validRows !== undefined ? validRows : totalRows;

  // ── Alerts for Resumen step ───────────────────────────────────────────────────

  const estimatedVolume = validContactCount * draft.rounds;

  // nowMs is captured once at mount (good enough for the 15-min soft warning)
  const [nowMs] = useState<number>(() => Date.now());
  const { windowMinutes, minutesToStart } = useMemo(() => {
    const sMs = draft.startAt
      ? new Date(`${draft.startAt}:00${TZ_OFFSETS[draft.timezone] ?? "-06:00"}`).getTime()
      : null;
    const eMs = draft.endAt
      ? new Date(`${draft.endAt}:00${TZ_OFFSETS[draft.timezone] ?? "-06:00"}`).getTime()
      : null;
    return {
      windowMinutes: sMs && eMs ? (eMs - sMs) / 60_000 : 0,
      minutesToStart: sMs ? (sMs - nowMs) / 60_000 : 999,
    };
  }, [draft.startAt, draft.endAt, draft.timezone, nowMs]);

  type AlertEntry = { level: "error" | "warn"; message: string };
  const alerts: AlertEntry[] = [];

  if (contactFile && validContactCount === 0) {
    alerts.push({
      level: "error",
      message: "No hay contactos válidos en el archivo. Corrige el archivo antes de crear la campaña.",
    });
  }
  if (agentVars.some((v) => !v.required && draft.variableMapping[v.name] == null)) {
    alerts.push({
      level: "warn",
      message: "Algunas variables opcionales no tienen columna asignada; el agente las recibirá vacías.",
    });
  }
  if (minutesToStart >= 0 && minutesToStart < 15) {
    alerts.push({ level: "warn", message: "La campaña inicia en menos de 15 minutos." });
  }
  if (estimatedVolume > 0 && windowMinutes > 0 && windowMinutes < estimatedVolume * 0.5) {
    alerts.push({
      level: "warn",
      message: `La ventana de ${Math.round(windowMinutes)} min puede ser corta para ${estimatedVolume} intentos estimados.`,
    });
  }

  const hasCriticalAlert = alerts.some((a) => a.level === "error");

  // ── Event handlers ────────────────────────────────────────────────────────────

  function resetContactFile() {
    setContactFile(null);
    setFileAnalysis(null);
    setFileError("");
    setFileInputKey((k) => k + 1);
  }

  function selectAgent(id: string) {
    setDraft((prev) => ({
      ...prev,
      agentProfileVersionId: id,
      labelFilter: [],
      variableMapping: {},
    }));
    // Clear contact file when agent changes (variables may differ)
    resetContactFile();
    setSuggestMessage("");
  }

  async function analyzeFile(file: File) {
    setFileLoading(true);
    setFileError("");
    setFileAnalysis(null);
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error("El archivo supera el límite de 4 MiB");
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/collections-import/analyze", { method: "POST", body: form });
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Error ${res.status} al analizar el archivo`);
      }
      const data = await res.json() as CampaignAnalysis;
      if (!data.sheets?.length) throw new Error("El archivo no contiene hojas o columnas utilizables");
      setFileAnalysis(data);
    } catch (cause) {
      setFileError(cause instanceof Error ? cause.message : "No se pudo analizar el archivo");
    } finally {
      setFileLoading(false);
    }
  }

  async function suggestMapping() {
    if (!contactFile || !selectedSheet || agentVars.length === 0) return;
    setSuggestLoading(true);
    setSuggestMessage("");
    try {
      const form = new FormData();
      form.set("file", contactFile);
      form.set("sheet", selectedSheet.name);
      form.set("header_row", String(selectedSheet.header_row));
      form.set(
        "agent_variables",
        JSON.stringify(agentVars.map((v) => ({ name: v.name, description: v.description, type: v.type }))),
      );
      const res = await fetch("/api/collections-import/suggest-mapping", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("La IA no está disponible. Continúa con el mapeo manual.");
      const data = await res.json() as CampaignMappingSuggestion;

      if (data.status === "suggested" && data.mapping) {
        const updates: Record<string, number | null> = {};
        for (const [varName, header] of Object.entries(data.mapping)) {
          const col = mappableColumns.find(
            (c) =>
              c.header === header ||
              c.header.toLowerCase() === header.toLowerCase(),
          );
          if (col) updates[varName] = col.index;
        }
        setDraft((prev) => ({
          ...prev,
          variableMapping: { ...prev.variableMapping, ...updates },
        }));
        setSuggestMessage("Mapeo sugerido aplicado. Revisa las asignaciones antes de continuar.");
      } else if (data.status === "no_suggestions") {
        setSuggestMessage("La IA no encontró equivalencias claras. Continúa con el mapeo manual.");
      } else if (data.status === "rate_limited") {
        setSuggestMessage("Límite temporal alcanzado. Espera un momento o continúa manualmente.");
      } else {
        setSuggestMessage("La IA no está disponible ahora. Continúa con el mapeo manual.");
      }
    } catch (cause) {
      setSuggestMessage(
        cause instanceof Error ? cause.message : "No se pudo consultar la IA.",
      );
    } finally {
      setSuggestLoading(false);
    }
  }

  function toggleTelephonyFilter(value: string) {
    setDraft((prev) => ({
      ...prev,
      telephonyFilter: prev.telephonyFilter.includes(value)
        ? prev.telephonyFilter.filter((v) => v !== value)
        : [...prev.telephonyFilter, value],
    }));
  }

  function toggleLabelFilter(id: string) {
    setDraft((prev) => ({
      ...prev,
      labelFilter: prev.labelFilter.includes(id)
        ? prev.labelFilter.filter((v) => v !== id)
        : [...prev.labelFilter, id],
    }));
  }

  function next() {
    setError("");

    if (step === 0) {
      if (!draft.name.trim()) return setError("Escribe un nombre para la campaña.");
      if (!draft.agentProfileVersionId) return setError("Selecciona un agente.");
    }
    if (step === 1) {
      if (fileLoading) return setError("Espera a que el archivo termine de analizarse.");
      if (!contactFile || !fileAnalysis) return setError("Carga y analiza un archivo de contactos.");
      if (fileError) return setError(fileError);
    }
    if (step === 2) {
      const missing = agentVars.filter(
        (v) => v.required && draft.variableMapping[v.name] == null,
      );
      if (missing.length > 0) {
        return setError(
          `Asigna una columna para: ${missing.map((v) => v.name).join(", ")}`,
        );
      }
    }
    if (step === 4) {
      if (!draft.startAt || !draft.endAt) return setError("Configura las fechas de inicio y fin.");
      if (draft.endAt <= draft.startAt) return setError("La fecha de fin debe ser posterior al inicio.");
    }

    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  }

  function buildPayload(asDraft: boolean) {
    // Convert variableMapping (varName → colIndex) to column_mapping (varName → "variable_N")
    const column_mapping: Record<string, string> = {};
    for (const [varName, colIndex] of Object.entries(draft.variableMapping)) {
      if (colIndex != null && colIndex > 0) {
        column_mapping[varName] = `variable_${colIndex}`;
      }
    }
    return {
      name: draft.name.trim(),
      agent_profile_version_id: draft.agentProfileVersionId,
      contact_file_id: fileAnalysis?.file_id,
      column_mapping: Object.keys(column_mapping).length > 0 ? column_mapping : undefined,
      dialer: {
        rounds: draft.rounds,
        cooldown_minutes: draft.cooldownMinutes,
        telephony_filter: draft.telephonyFilter,
        label_filter: draft.labelFilter,
      },
      schedule: {
        timezone: draft.timezone,
        start_at: toIso(draft.startAt, draft.timezone),
        end_at: toIso(draft.endAt, draft.timezone),
      },
      notes: draft.notes.trim(),
      draft: asDraft,
    };
  }

  function create(asDraft = false) {
    setError("");
    startTransition(async () => {
      try {
        await submitCampaign(buildPayload(asDraft));
      } catch {
        setError("No fue posible crear la campaña. Revisa los datos e inténtalo de nuevo.");
      }
    });
  }

  const lastStep = STEPS.length - 1;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main className="wizard-shell">
      <header className="wizard-header">
        <Link href="/app/campaigns">← Volver</Link>
        <div className="brand">
          <span className="brand-mark">C</span>
          <span>cadencia</span>
        </div>
        <span>Borrador seguro</span>
      </header>

      <section className="wizard-layout">
        <aside>
          <p className="eyebrow">Nueva campaña</p>
          <ol>
            {STEPS.map((label, index) => (
              <li
                key={label}
                className={index === step ? "current" : index < step ? "done" : ""}
              >
                <span>{index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        </aside>

        <section className="wizard-form">
          <p className="eyebrow">Paso {step + 1} de {STEPS.length}</p>

          {/* ──────────────────── Paso 0: Campaña ──────────────────── */}
          {step === 0 && (
            <>
              <h1>Configura la campaña</h1>
              <p className="muted">
                Asigna un nombre y elige el agente que conducirá las llamadas.
              </p>
              <label>
                Nombre de la campaña
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Ej. Recordatorio segunda quincena"
                />
              </label>

              {agentProfiles.length > 0 ? (
                <fieldset>
                  <legend>Agente</legend>
                  {agentProfiles.map((agent) => (
                    <label
                      key={agent.id}
                      className={`choice ${
                        draft.agentProfileVersionId === agent.id ? "active" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        checked={draft.agentProfileVersionId === agent.id}
                        onChange={() => selectAgent(agent.id)}
                      />
                      <span>
                        <strong>{agent.agent_name}</strong>
                        <small>
                          {agent.company_name} · v{agent.version}
                          {agent.objective ? ` · ${agent.objective}` : ""}
                          {(agent.agent_variables?.length ?? 0) > 0
                            ? ` · ${agent.agent_variables!.length} variable${
                                agent.agent_variables!.length !== 1 ? "s" : ""
                              }`
                            : ""}
                          {agent.labels.length > 0
                            ? ` · ${agent.labels.length} etiqueta${
                                agent.labels.length !== 1 ? "s" : ""
                              }`
                            : ""}
                        </small>
                      </span>
                    </label>
                  ))}
                </fieldset>
              ) : (
                <div className="empty-state">
                  No hay agentes configurados.{" "}
                  <Link href="/app/agents/new">Crea un agente primero.</Link>
                </div>
              )}
            </>
          )}

          {/* ──────────────── Paso 1: Base de contactos ──────────────── */}
          {step === 1 && (
            <>
              <h1>Base de contactos</h1>
              <p className="muted">
                Carga el archivo con los destinatarios. La <strong>primera columna</strong> debe ser
                el número de teléfono.
              </p>

              {fileLoading ? (
                <p role="status" style={{ color: "var(--muted)", fontSize: 14, margin: "20px 0" }}>
                  Analizando {contactFile?.name}…
                </p>
              ) : contactFile && fileAnalysis ? (
                /* ── File analyzed: show summary ── */
                <div className="review-card">
                  <div className="review-card-header">
                    <span>
                      <strong>{contactFile.name}</strong>
                      <span
                        style={{
                          marginLeft: 10,
                          color: "var(--muted)",
                          fontSize: 12,
                          fontWeight: 400,
                        }}
                      >
                        {(contactFile.size / 1024).toFixed(0)} KB
                      </span>
                    </span>
                  </div>
                  <dl
                    className="review-list"
                    style={{ margin: 0, border: 0, borderRadius: 0, borderBottom: "1px solid var(--line)" }}
                  >
                    <div>
                      <dt>Total de filas</dt>
                      <dd>{totalRows}</dd>
                    </div>
                    {validRows !== undefined && (
                      <div>
                        <dt>Contactos válidos</dt>
                        <dd>{validRows}</dd>
                      </div>
                    )}
                    {discardedRows !== undefined && discardedRows > 0 && (
                      <div>
                        <dt>Descartados</dt>
                        <dd>{discardedRows}</dd>
                      </div>
                    )}
                    {fileAnalysis.discard_reasons?.map((r) => (
                      <div key={r.reason}>
                        <dt style={{ paddingLeft: 14, color: "var(--muted)" }}>↳ {r.reason}</dt>
                        <dd>{r.count}</dd>
                      </div>
                    ))}
                    <div>
                      <dt>Columna 1</dt>
                      <dd>📞 Teléfono (fijo)</dd>
                    </div>
                    {fileColumns
                      .filter((c) => c.index > 0)
                      .map((col) => (
                        <div key={col.index}>
                          <dt>Columna {col.index + 1}</dt>
                          <dd>{col.header}</dd>
                        </div>
                      ))}
                  </dl>
                  <div style={{ padding: "12px 18px" }}>
                    <button
                      type="button"
                      className="secondary-action"
                      style={{ fontSize: 12, padding: "8px 12px" }}
                      onClick={resetContactFile}
                    >
                      Cambiar archivo
                    </button>
                  </div>
                </div>
              ) : (
                /* ── No file yet (or error): show instructions + input ── */
                <>
                  <div className="file-upload-hint">
                    <p style={{ margin: "0 0 6px" }}>
                      Formato soportado: <strong>.csv</strong> o <strong>.xlsx</strong>, hasta{" "}
                      <strong>4 MiB</strong>.
                    </p>
                    <p style={{ margin: 0 }}>
                      La <strong>primera columna</strong> debe contener el teléfono. Las columnas
                      siguientes estarán disponibles para mapear variables del agente.
                    </p>
                  </div>
                  <label>
                    Archivo de contactos
                    <input
                      key={fileInputKey}
                      type="file"
                      accept=".csv,.xlsx"
                      disabled={fileLoading}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (!file) return;
                        setContactFile(file);
                        setFileAnalysis(null);
                        setFileError("");
                        void analyzeFile(file);
                      }}
                    />
                  </label>
                  {fileError && (
                    <p className="form-error" role="alert">
                      {fileError}
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {/* ──────────────────── Paso 2: Variables ──────────────────── */}
          {step === 2 && (
            <>
              <h1>Mapeo de variables</h1>
              <p className="muted">
                Asocia las columnas del archivo con las variables que el agente usará en la
                conversación.
              </p>

              {agentVars.length === 0 ? (
                <div className="empty-state">
                  Este agente no requiere mapeo de variables. Puedes continuar al siguiente paso.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      margin: "16px 0 4px",
                    }}
                  >
                    <button
                      type="button"
                      className="secondary-action"
                      style={{ fontSize: 13, padding: "8px 14px" }}
                      disabled={suggestLoading || mappableColumns.length === 0}
                      onClick={() => void suggestMapping()}
                    >
                      {suggestLoading ? "Consultando IA…" : "✨ Sugerir mapeo con IA"}
                    </button>
                    {mappableColumns.length === 0 && (
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        Sin columnas disponibles para mapear
                      </span>
                    )}
                  </div>

                  {suggestMessage && (
                    <p
                      role="status"
                      className="muted"
                      style={{ fontSize: 13, margin: "8px 0 16px" }}
                    >
                      {suggestMessage}
                    </p>
                  )}

                  <div
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      overflow: "hidden",
                      marginTop: 16,
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                      <thead>
                        <tr
                          style={{
                            borderBottom: "1px solid var(--line)",
                            background: "var(--paper)",
                          }}
                        >
                          <th
                            style={{
                              textAlign: "left",
                              padding: "10px 16px",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            Variable del agente
                          </th>
                          <th
                            style={{
                              textAlign: "left",
                              padding: "10px 16px",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            Columna del archivo
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentVars.map((variable, i) => (
                          <tr
                            key={variable.name}
                            style={{
                              borderTop: i > 0 ? "1px solid var(--line)" : undefined,
                            }}
                          >
                            <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                              <strong>{variable.name}</strong>
                              {variable.required && (
                                <span
                                  style={{
                                    marginLeft: 5,
                                    color: "#e05c38",
                                    fontSize: 11,
                                    fontWeight: 700,
                                  }}
                                >
                                  *
                                </span>
                              )}
                              {variable.description && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "var(--muted)",
                                    marginTop: 3,
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {variable.description}
                                </div>
                              )}
                              <div
                                style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}
                              >
                                Tipo: {variable.type}
                              </div>
                            </td>
                            <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                              <select
                                value={draft.variableMapping[variable.name] ?? ""}
                                style={{ width: "100%" }}
                                onChange={(e) => {
                                  const val =
                                    e.target.value === "" ? null : Number(e.target.value);
                                  setDraft((prev) => ({
                                    ...prev,
                                    variableMapping: {
                                      ...prev.variableMapping,
                                      [variable.name]: val,
                                    },
                                  }));
                                }}
                              >
                                <option value="">— Sin asignar —</option>
                                {mappableColumns.map((col) => (
                                  <option key={col.index} value={col.index}>
                                    Col. {col.index + 1}: {col.header}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {mappableColumns.length === 0 && (
                    <p
                      className="muted"
                      style={{ marginTop: 12, fontSize: 13 }}
                    >
                      El archivo solo contiene la columna de teléfono. Agrega más columnas para
                      poder mapear variables.
                    </p>
                  )}
                  <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
                    * Variable obligatoria · Las columnas no asignadas se ignoran.
                  </p>
                </>
              )}
            </>
          )}

          {/* ──────────────────── Paso 3: Dialer ──────────────────────── */}
          {step === 3 && (
            <>
              <h1>Configuración del marcador</h1>
              <p className="muted">
                Define cuántas rondas de llamadas se realizarán y qué resultados disparan una nueva
                ronda.
              </p>

              <div className="form-grid">
                <label>
                  Rondas de llamadas
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={draft.rounds}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        rounds: Math.max(1, Math.min(10, Number(e.target.value))),
                      })
                    }
                  />
                </label>
                {draft.rounds > 1 && (
                  <label>
                    Minutos de espera entre rondas
                    <input
                      type="number"
                      min="1"
                      max="10080"
                      value={draft.cooldownMinutes}
                      onChange={(e) =>
                        setDraft({ ...draft, cooldownMinutes: Number(e.target.value) })
                      }
                    />
                  </label>
                )}
              </div>

              {telephonyResults.length > 0 && (
                <fieldset>
                  <legend>Excluir de rondas siguientes por resultado de telefonía</legend>
                  <p className="muted" style={{ marginBottom: 10, fontSize: 13 }}>
                    Los contactos con estos resultados{" "}
                    <strong>no recibirán llamadas en rondas posteriores</strong>. Los números
                    inválidos (SIP 404) se desactivan automáticamente.
                  </p>
                  {telephonyResults.map((opt) => (
                    <label key={opt.value} className="checkbox" style={{ marginBottom: 8 }}>
                      <input
                        type="checkbox"
                        checked={draft.telephonyFilter.includes(opt.value)}
                        onChange={() => toggleTelephonyFilter(opt.value)}
                      />
                      {opt.label}
                      {opt.value === "invalid" && (
                        <span style={{ marginLeft: 6, fontSize: 11, color: "var(--muted)" }}>
                          (se desactivan automáticamente)
                        </span>
                      )}
                    </label>
                  ))}
                </fieldset>
              )}

              {selectedAgent && selectedAgent.labels.length > 0 && (
                <fieldset>
                  <legend>Excluir por etiqueta de resultado</legend>
                  <p className="muted" style={{ marginBottom: 10, fontSize: 13 }}>
                    Los contactos con estas etiquetas detectadas en rondas anteriores no recibirán
                    más llamadas.
                  </p>
                  {selectedAgent.labels.map((lbl) => (
                    <label key={lbl.id} className="checkbox" style={{ marginBottom: 8 }}>
                      <input
                        type="checkbox"
                        checked={draft.labelFilter.includes(lbl.id)}
                        onChange={() => toggleLabelFilter(lbl.id)}
                      />
                      {lbl.name}
                    </label>
                  ))}
                </fieldset>
              )}
            </>
          )}

          {/* ──────────────────── Paso 4: Programación ───────────────── */}
          {step === 4 && (
            <>
              <h1>Programa la ejecución</h1>
              <p className="muted">
                Define la ventana de llamadas. Crear la campaña no inicia llamadas
                automáticamente.
              </p>

              <div className="form-grid">
                <label>
                  Inicio
                  <input
                    type="datetime-local"
                    value={draft.startAt}
                    onChange={(e) => setDraft({ ...draft, startAt: e.target.value })}
                  />
                </label>
                <label>
                  Fin
                  <input
                    type="datetime-local"
                    value={draft.endAt}
                    onChange={(e) => setDraft({ ...draft, endAt: e.target.value })}
                  />
                </label>
                <label>
                  Zona horaria
                  <select
                    value={draft.timezone}
                    onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
                  >
                    <option value="America/Mexico_City">America/Mexico_City</option>
                    <option value="America/Monterrey">America/Monterrey</option>
                  </select>
                </label>
              </div>

              <label>
                Notas
                <textarea
                  value={draft.notes}
                  maxLength={500}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="Contexto operativo opcional"
                />
              </label>
            </>
          )}

          {/* ──────────────────── Paso 5: Resumen ────────────────────── */}
          {step === 5 && (
            <>
              <h1>Resumen de la campaña</h1>
              <p className="muted">
                Revisa los detalles. Usa los botones Editar para modificar cualquier sección.
              </p>

              {/* Tarjeta: Campaña y agente */}
              <ReviewCard title="Campaña y agente" onEdit={() => setStep(0)}>
                <dl className="review-list" style={{ margin: 0, border: 0, borderRadius: 0 }}>
                  <div>
                    <dt>Nombre</dt>
                    <dd>{draft.name}</dd>
                  </div>
                  {selectedAgent && (
                    <>
                      <div>
                        <dt>Agente</dt>
                        <dd>{selectedAgent.agent_name}</dd>
                      </div>
                      <div>
                        <dt>Empresa</dt>
                        <dd>{selectedAgent.company_name}</dd>
                      </div>
                      <div>
                        <dt>Versión</dt>
                        <dd>v{selectedAgent.version}</dd>
                      </div>
                      {selectedAgent.objective && (
                        <div>
                          <dt>Objetivo</dt>
                          <dd>{selectedAgent.objective}</dd>
                        </div>
                      )}
                    </>
                  )}
                </dl>
              </ReviewCard>

              {/* Tarjeta: Base de contactos */}
              <ReviewCard title="Base de contactos" onEdit={() => setStep(1)}>
                <dl className="review-list" style={{ margin: 0, border: 0, borderRadius: 0 }}>
                  <div>
                    <dt>Archivo</dt>
                    <dd>{contactFile?.name ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Total de filas</dt>
                    <dd>{totalRows}</dd>
                  </div>
                  {validRows !== undefined && (
                    <div>
                      <dt>Contactos válidos</dt>
                      <dd>{validRows}</dd>
                    </div>
                  )}
                  {discardedRows !== undefined && discardedRows > 0 && (
                    <div>
                      <dt>Descartados</dt>
                      <dd>{discardedRows}</dd>
                    </div>
                  )}
                </dl>
              </ReviewCard>

              {/* Tarjeta: Variables (only if agent declares variables) */}
              {agentVars.length > 0 && (
                <ReviewCard title="Variables" onEdit={() => setStep(2)}>
                  {Object.entries(draft.variableMapping).some(([, v]) => v != null) ? (
                    <table
                      style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--line)" }}>
                          <th
                            style={{
                              textAlign: "left",
                              padding: "8px 16px",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            Variable
                          </th>
                          <th
                            style={{
                              textAlign: "left",
                              padding: "8px 16px",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            Columna
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentVars.map((v, i) => {
                          const colIdx = draft.variableMapping[v.name];
                          const col =
                            colIdx != null
                              ? fileColumns.find((c) => c.index === colIdx)
                              : null;
                          return (
                            <tr
                              key={v.name}
                              style={{
                                borderTop: i > 0 ? "1px solid var(--line)" : undefined,
                              }}
                            >
                              <td style={{ padding: "8px 16px" }}>
                                {v.name}
                                {v.required && (
                                  <span
                                    style={{
                                      color: "#e05c38",
                                      marginLeft: 4,
                                      fontSize: 11,
                                    }}
                                  >
                                    *
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "8px 16px" }}>
                                {col ? (
                                  <strong>
                                    Col. {col.index + 1}: {col.header}
                                  </strong>
                                ) : (
                                  <span style={{ color: "var(--muted)" }}>Sin asignar</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p
                      style={{ margin: "12px 16px", fontSize: 13, color: "var(--muted)" }}
                    >
                      Ninguna variable mapeada.
                    </p>
                  )}
                </ReviewCard>
              )}

              {/* Tarjeta: Marcador */}
              <ReviewCard title="Marcador" onEdit={() => setStep(3)}>
                <dl className="review-list" style={{ margin: 0, border: 0, borderRadius: 0 }}>
                  <div>
                    <dt>Rondas</dt>
                    <dd>{draft.rounds}</dd>
                  </div>
                  {draft.rounds > 1 && (
                    <div>
                      <dt>Espera entre rondas</dt>
                      <dd>{draft.cooldownMinutes} minutos</dd>
                    </div>
                  )}
                  {draft.telephonyFilter.length > 0 && (
                    <div>
                      <dt>Excluir telefonía</dt>
                      <dd>{draft.telephonyFilter.join(", ")}</dd>
                    </div>
                  )}
                  {draft.labelFilter.length > 0 && (
                    <div>
                      <dt>Excluir etiquetas</dt>
                      <dd>
                        {draft.labelFilter
                          .map(
                            (id) =>
                              selectedAgent?.labels.find((l) => l.id === id)?.name ?? id,
                          )
                          .join(", ")}
                      </dd>
                    </div>
                  )}
                </dl>
              </ReviewCard>

              {/* Tarjeta: Programación */}
              <ReviewCard title="Programación" onEdit={() => setStep(4)}>
                <dl className="review-list" style={{ margin: 0, border: 0, borderRadius: 0 }}>
                  <div>
                    <dt>Ventana</dt>
                    <dd>{formatSchedule(draft.startAt, draft.endAt, draft.timezone)}</dd>
                  </div>
                  {draft.notes && (
                    <div>
                      <dt>Notas</dt>
                      <dd>{draft.notes}</dd>
                    </div>
                  )}
                </dl>
              </ReviewCard>

              {/* Volumen estimado */}
              <div
                style={{
                  margin: "16px 0",
                  padding: "14px 18px",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  background: "var(--card)",
                }}
              >
                <p
                  style={{
                    margin: "0 0 6px",
                    color: "var(--muted)",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Volumen estimado
                </p>
                <p style={{ margin: 0, fontSize: 14 }}>
                  {validContactCount} contacto{validContactCount !== 1 ? "s" : ""}
                  {" × "}
                  {draft.rounds} ronda{draft.rounds !== 1 ? "s" : ""}
                  {" = "}
                  <strong>
                    {estimatedVolume} intento{estimatedVolume !== 1 ? "s" : ""}
                  </strong>
                </p>
              </div>

              {/* Alertas */}
              {alerts.length > 0 && (
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  {alerts.map((alert, i) => (
                    <div
                      key={i}
                      role="alert"
                      style={{
                        padding: "10px 14px",
                        borderRadius: 9,
                        fontSize: 13,
                        lineHeight: 1.4,
                        background: alert.level === "error" ? "#fff0eb" : "#fffbe8",
                        color: alert.level === "error" ? "#9b432d" : "#7a5a14",
                        border: `1px solid ${
                          alert.level === "error" ? "#f5c5b2" : "#f0e0aa"
                        }`,
                      }}
                    >
                      {alert.level === "error" ? "🚫 " : "⚠️ "}
                      {alert.message}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="wizard-actions">
            {step > 0 && (
              <button
                type="button"
                className="secondary-action"
                onClick={() => {
                  setError("");
                  setStep(step - 1);
                }}
              >
                ← Anterior
              </button>
            )}
            {step < lastStep ? (
              <button
                type="button"
                className="primary-action"
                disabled={step === 1 && fileLoading}
                onClick={next}
              >
                Continuar →
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="secondary-action"
                  disabled={pending}
                  onClick={() => create(true)}
                >
                  Guardar borrador
                </button>
                <button
                  type="button"
                  className="primary-action"
                  disabled={pending || hasCriticalAlert}
                  onClick={() => create(false)}
                >
                  {pending ? "Creando…" : "Crear campaña →"}
                </button>
              </>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
