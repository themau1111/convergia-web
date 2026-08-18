import Link from "next/link";
import { revalidatePath } from "next/cache";

import { ConfirmationButton } from "@/components/confirmation-button";
import { ManualCallForm } from "./manual-call-form";
import { RecipientCallButton } from "./recipient-call-button";
import { UploadContactsForm } from "./upload-form";

import {
  createLocalPocClient, createLocalPocPortfolio, deactivateLocalPocClient,
  getDataSources, getLocalPocClients, getLocalPortfolioAgentConfig, getPortfolios,
  startPortfolioTestCalls, syncLocalPocPortfolios,
  type LocalClientRecord, type LocalPortfolioAgentConfig, updateLocalPocClient,
  updateLocalPortfolioAgentConfig,
} from "@/lib/control-api";

const DEFAULT_AGENT = {
  agent_name: "Valeria", company_name: "la institución",
  personality: "Empática, clara y directa. Explica antes de solicitar un compromiso y nunca inventa información.",
};
const value = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const required = (data: FormData, key: string) => { const result = value(data, key); if (!result) throw new Error(`missing_${key}`); return result; };
const numeric = (data: FormData, key: string) => Number(value(data, key) || 0);

export default async function LocalOperationsPage() {
  const [sources, portfolios] = await Promise.all([getDataSources(), getPortfolios()]);
  const localSources = sources.filter((source) => source.adapter_type === "local_poc");
  const sourceIds = new Set(localSources.map((source) => source.id));
  const localPortfolios = portfolios.filter((portfolio) => sourceIds.has(portfolio.data_source_id));
  const entries: Array<readonly [string, { clients: LocalClientRecord[]; agent: LocalPortfolioAgentConfig | null; error: boolean }]> = await Promise.all(localPortfolios.map(async (portfolio) => {
    try { const [clients, agent] = await Promise.all([getLocalPocClients(portfolio.id), getLocalPortfolioAgentConfig(portfolio.id)]); return [portfolio.id, { clients, agent, error: false }] as const; }
    catch { return [portfolio.id, { clients: [] as LocalClientRecord[], agent: null, error: true }] as const; }
  }));
  const results = new Map(entries);
  const total = entries.reduce((sum, [, item]) => sum + item.clients.length, 0);

  async function syncLocal(data: FormData) { "use server"; await syncLocalPocPortfolios(required(data, "data_source_id")); revalidatePath("/app/settings/catalogs"); }
  async function addPortfolio(data: FormData) { "use server"; await createLocalPocPortfolio(required(data, "data_source_id"), { name: required(data, "name"), ...(value(data, "key") ? { key: value(data, "key") } : {}), description: value(data, "description") }); revalidatePath("/app/settings/catalogs"); }
  async function addClient(data: FormData) { "use server"; await createLocalPocClient(required(data, "portfolio_id"), { nombre_cliente: required(data, "nombre_cliente"), telefono: required(data, "telefono"), dia_pago: value(data, "dia_pago"), saldo_pendiente: numeric(data, "saldo_pendiente"), articulo: value(data, "articulo"), pagos_atrasados: numeric(data, "pagos_atrasados"), modalidad: value(data, "modalidad"), cuota_semanal: numeric(data, "cuota_semanal") }); revalidatePath("/app/settings/catalogs"); }
  async function editClient(data: FormData) { "use server"; await updateLocalPocClient(required(data, "portfolio_id"), numeric(data, "client_id"), { nombre_cliente: required(data, "nombre_cliente"), telefono: required(data, "telefono"), dia_pago: value(data, "dia_pago"), saldo_pendiente: numeric(data, "saldo_pendiente"), articulo: value(data, "articulo"), pagos_atrasados: numeric(data, "pagos_atrasados"), modalidad: value(data, "modalidad"), cuota_semanal: numeric(data, "cuota_semanal") }); revalidatePath("/app/settings/catalogs"); }
  async function deactivateClient(data: FormData) { "use server"; await deactivateLocalPocClient(required(data, "portfolio_id"), numeric(data, "client_id")); revalidatePath("/app/settings/catalogs"); }
  async function callPortfolio(data: FormData) { "use server"; if (value(data, "confirmed") !== "yes") throw new Error("confirmation_required"); await startPortfolioTestCalls(required(data, "portfolio_id"), required(data, "confirmation_name")); }
  async function savePortfolioAgent(data: FormData) { "use server"; await updateLocalPortfolioAgentConfig(required(data, "portfolio_id"), { company_name: required(data, "company_name"), agent_name: required(data, "agent_name"), personality: required(data, "personality"), ...(value(data, "voice_id") ? { voice_id: value(data, "voice_id") } : {}) }); revalidatePath("/app/settings/catalogs"); }

  return <main className="members-shell local-ops-page">
    <header className="members-header"><div><p className="eyebrow">Laboratorio operativo</p><h1>Pruebas y carteras</h1><p className="muted">Consulta destinatarios locales, administra datos ficticios y ejecuta llamadas controladas.</p></div><Link href="/">← Volver al pulso</Link></header>
    <section className="local-ops-summary"><article><small>Carteras locales</small><strong>{localPortfolios.length}</strong></article><article><small>Destinatarios activos</small><strong>{total}</strong></article><article><small>Origen</small><strong>SQLite POC</strong></article></section>

    <section className="manual-call-card"><div><p className="eyebrow">Llamada rápida</p><h2>Llama sin registrar a la persona</h2><p className="muted">El número y sus datos se usan sólo para esta llamada; no se agregan a ninguna cartera.</p></div><ManualCallForm /></section>

    <section className="portfolio-browser">
      <div className="section-heading"><div><p className="eyebrow">Destinatarios registrados</p><h2>Carteras locales</h2></div><span>{total} personas disponibles</span></div>
      <div className="portfolio-stack">{localPortfolios.map((portfolio) => {
        const result = results.get(portfolio.id); const count = result?.clients.length ?? 0; const agent = result?.agent;
        return <details className="portfolio-panel" key={portfolio.id}>
          <summary><span><strong>{portfolio.name}</strong><small>{portfolio.external_key}</small></span><b>{result?.error ? "Error al cargar" : `${count} activos`}</b></summary>
          {result?.error ? <p className="portfolio-load-error">No se pudo consultar esta cartera.</p> : <>
            <details className="portfolio-agent-panel">
              <summary><span><strong>Identidad para llamadas</strong><small>{agent?.agent_name} representa a {agent?.company_name}</small></span><b>Configurar</b></summary>
              <form action={savePortfolioAgent} className="portfolio-agent-form">
                <input type="hidden" name="portfolio_id" value={portfolio.id} />
                <div className="form-grid"><label>Empresa<input name="company_name" defaultValue={agent?.company_name ?? DEFAULT_AGENT.company_name} required /></label><label>Nombre del agente<input name="agent_name" defaultValue={agent?.agent_name ?? DEFAULT_AGENT.agent_name} required /></label><label className="wide-field">Personalidad<textarea name="personality" defaultValue={agent?.personality ?? DEFAULT_AGENT.personality} maxLength={1000} required /></label><label>ID de voz opcional<input name="voice_id" defaultValue={agent?.voice_id ?? ""} /></label></div>
                <button className="secondary-action">Guardar identidad</button>
              </form>
            </details>
            <UploadContactsForm portfolioId={portfolio.id} portfolioName={portfolio.name} />
            <div className="portfolio-recipient-scroll">{result?.clients.map((client) =>
              <details className="recipient-row" key={client.id}>
                <summary><span><strong>{client.nombre_cliente}</strong><span className="recipient-phone">{client.telefono}</span><small>{client.articulo || "Sin producto"} · ${client.saldo_pendiente.toLocaleString("es-MX")}</small></span><b>Administrar</b></summary>
                <div className="recipient-row-panel">
                  <form action={editClient} className="inline-client-editor">
                    <input type="hidden" name="portfolio_id" value={portfolio.id} /><input type="hidden" name="client_id" value={client.id} />
                    <label>Nombre<input name="nombre_cliente" defaultValue={client.nombre_cliente} required /></label><label>Teléfono<input name="telefono" defaultValue={client.telefono} required /></label><label>Saldo<input name="saldo_pendiente" type="number" min="0" step=".01" defaultValue={client.saldo_pendiente} /></label><label>Producto<input name="articulo" defaultValue={client.articulo ?? ""} /></label><label>Día de pago<input name="dia_pago" defaultValue={client.dia_pago ?? ""} /></label><label>Pagos atrasados<input name="pagos_atrasados" type="number" min="0" defaultValue={client.pagos_atrasados} /></label><label>Modalidad<input name="modalidad" defaultValue={client.modalidad ?? ""} /></label><label>Cuota<input name="cuota_semanal" type="number" min="0" step=".01" defaultValue={client.cuota_semanal} /> </label>
                    <button className="secondary-action wide-field">Guardar cambios</button>
                  </form>
                  <div className="recipient-row-actions">
                    <RecipientCallButton portfolioId={portfolio.id} clientId={client.id} portfolioName={portfolio.name} />
                    <form action={deactivateClient} className="recipient-deactivate-form"><input type="hidden" name="portfolio_id" value={portfolio.id} /><input type="hidden" name="client_id" value={client.id} /><div><strong>Retirar de esta cartera</strong><small>Dejará de aparecer en pruebas y lotes.</small></div><ConfirmationButton className="danger-action" title={`¿Desactivar a ${client.nombre_cliente}?`} description={`Dejará de aparecer en las pruebas y llamadas de ${portfolio.name}. Sus datos no se eliminarán de forma definitiva.`} confirmLabel="Desactivar destinatario">Desactivar destinatario</ConfirmationButton></form>
                  </div>
                </div>
              </details>)}
            </div>
            <form action={callPortfolio} className="portfolio-batch-call"><div><strong>Llamar a toda la cartera</strong><small>{count ? `Escribe “${portfolio.name}” para confirmar ${count} llamadas reales con ${agent?.agent_name ?? DEFAULT_AGENT.agent_name}.` : "Agrega destinatarios antes de iniciar un lote."}</small></div><input type="hidden" name="portfolio_id" value={portfolio.id} /><input name="confirmation_name" required disabled={!count} placeholder={portfolio.name} /><input type="hidden" name="confirmed" value="yes" /><button className="danger-action" disabled={!count}>Llamar a todos</button></form>
          </>}
        </details>;
      })}</div>
    </section>

    <section className="local-admin-card"><div><p className="eyebrow">Administración local</p><h2>Agregar datos de prueba</h2><p className="muted">Estas altas sí permanecen en SQLite.</p>{localSources.map((source) => <form action={syncLocal} key={source.id}><input type="hidden" name="data_source_id" value={source.id} /><button className="text-button">Sincronizar carteras existentes</button></form>)}</div><div className="local-admin-forms"><details><summary>Nueva cartera</summary><form action={addPortfolio}>{localSources.length === 1 ? <input type="hidden" name="data_source_id" value={localSources[0].id} /> : <label>Fuente<select name="data_source_id" required>{localSources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}</select></label>}<label>Nombre<input name="name" required /></label><label>Clave opcional<input name="key" pattern="[a-z0-9_]+" /></label><label>Descripción<input name="description" /></label><button className="primary-action">Crear cartera</button></form></details><details><summary>Nuevo destinatario</summary><form action={addClient}><label>Cartera<select name="portfolio_id" required>{localPortfolios.map((portfolio) => <option value={portfolio.id} key={portfolio.id}>{portfolio.name}</option>)}</select></label><div className="form-grid"><label>Nombre<input name="nombre_cliente" required /></label><label>Teléfono<input name="telefono" required /></label><label>Saldo<input name="saldo_pendiente" type="number" min="0" step=".01" /></label><label>Producto<input name="articulo" /></label><label>Día de pago<input name="dia_pago" /></label><label>Pagos atrasados<input name="pagos_atrasados" type="number" min="0" /></label><label>Modalidad<input name="modalidad" /></label><label>Cuota<input name="cuota_semanal" type="number" min="0" step=".01" /></label></div><button className="primary-action">Agregar destinatario</button></form></details></div></section>
  </main>;
}
