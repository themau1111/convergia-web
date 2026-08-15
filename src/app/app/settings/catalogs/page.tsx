import Link from "next/link";
import { revalidatePath } from "next/cache";

import {
  createAgentProfile,
  createDataSource,
  createLocalPocClient,
  createLocalPocPortfolio,
  createPortfolio,
  getAgentProfiles,
  getDataSources,
  getLocalPocClients,
  getPortfolios,
  type DataSourceRecord,
  deactivateLocalPocClient,
  syncLocalPocPortfolios,
  getSqlDataSourceMapping,
  getSqlDataSourcePlan,
  updateSqlDataSourceMapping,
  updateLocalPocClient,
} from "@/lib/control-api";

function required(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`missing_${key}`);
  return value;
}

function profileKey(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

export default async function CatalogsPage() {
  const [sources, portfolios, profiles] = await Promise.all([
    getDataSources(), getPortfolios(), getAgentProfiles(),
  ]);
  const sqlSources = sources.filter((source) => source.adapter_type === "mysql" || source.adapter_type === "postgresql");
  const localSources = sources.filter((source) => source.adapter_type === "local_poc");
  const localSourceIds = new Set(localSources.map((source) => source.id));
  const localPortfolios = portfolios.filter((portfolio) => localSourceIds.has(portfolio.data_source_id));
  const externalSources = sources.filter((source) => source.adapter_type !== "local_poc");
  const configuredMappings = new Map((await Promise.all(sqlSources.map(async (source) => [
    source.id, await getSqlDataSourceMapping(source.id).catch(() => null),
  ] as const))).filter((entry) => entry[1]));
  const sqlPlans = new Map((await Promise.all(sqlSources.map(async (source) => [
    source.id, await getSqlDataSourcePlan(source.id).catch(() => null),
  ] as const))).filter((entry) => entry[1]));
  const localClients = new Map(await Promise.all(localPortfolios.map(async (portfolio) => [
    portfolio.id, await getLocalPocClients(portfolio.id).catch(() => []),
  ] as const)));

  async function addSource(formData: FormData) {
    "use server";
    await createDataSource(
      required(formData, "name"),
      required(formData, "adapter_type") as DataSourceRecord["adapter_type"],
    );
    revalidatePath("/app/settings/catalogs");
  }

  async function addPortfolio(formData: FormData) {
    "use server";
    const estimate = String(formData.get("estimated_recipients") ?? "").trim();
    await createPortfolio({
      data_source_id: required(formData, "data_source_id"),
      external_key: required(formData, "external_key"),
      name: required(formData, "name"),
      ...(estimate ? { estimated_recipients: Number(estimate) } : {}),
    });
    revalidatePath("/app/settings/catalogs");
  }

  async function syncLocal(formData: FormData) {
    "use server";
    await syncLocalPocPortfolios(required(formData, "data_source_id"));
    revalidatePath("/app/settings/catalogs");
  }

  async function addLocalPortfolio(formData: FormData) {
    "use server";
    const key = String(formData.get("key") ?? "").trim();
    await createLocalPocPortfolio(required(formData, "data_source_id"), {
      name: required(formData, "name"), ...(key ? { key } : {}),
      description: String(formData.get("description") ?? "").trim(),
    });
    revalidatePath("/app/settings/catalogs");
  }

  async function addLocalClient(formData: FormData) {
    "use server";
    const number = (key: string) => Number(String(formData.get(key) ?? "0").trim() || 0);
    const optional = (key: string) => String(formData.get(key) ?? "").trim() || null;
    await createLocalPocClient(required(formData, "portfolio_id"), {
      nombre_cliente: required(formData, "nombre_cliente"),
      telefono: required(formData, "telefono"), dia_pago: optional("dia_pago"),
      saldo_pendiente: number("saldo_pendiente"), articulo: optional("articulo"),
      pagos_atrasados: number("pagos_atrasados"), modalidad: optional("modalidad"),
      cuota_semanal: number("cuota_semanal"),
    });
    revalidatePath("/app/settings/catalogs");
  }

  async function editLocalClient(formData: FormData) {
    "use server";
    const number = (key: string) => Number(String(formData.get(key) ?? "0").trim() || 0);
    const optional = (key: string) => String(formData.get(key) ?? "").trim() || null;
    await updateLocalPocClient(
      required(formData, "portfolio_id"), number("client_id"), {
        nombre_cliente: required(formData, "nombre_cliente"),
        telefono: required(formData, "telefono"), dia_pago: optional("dia_pago"),
        saldo_pendiente: number("saldo_pendiente"), articulo: optional("articulo"),
        pagos_atrasados: number("pagos_atrasados"), modalidad: optional("modalidad"),
        cuota_semanal: number("cuota_semanal"),
      },
    );
    revalidatePath("/app/settings/catalogs");
  }

  async function deactivateLocalClient(formData: FormData) {
    "use server";
    await deactivateLocalPocClient(
      required(formData, "portfolio_id"), Number(required(formData, "client_id")),
    );
    revalidatePath("/app/settings/catalogs");
  }

  async function saveSqlMapping(formData: FormData) {
    "use server";
    const optional = (key: string) => String(formData.get(key) ?? "").trim() || null;
    const columnKeys = [
      "external_client_id", "phone", "external_account_id", "customer_name", "address",
      "balance_due", "reference_date", "payment_day", "product", "overdue_payments",
      "payment_frequency", "installment_amount",
    ];
    const columns = Object.fromEntries(columnKeys.map((key) => [key, optional(key)]));
    await updateSqlDataSourceMapping(required(formData, "data_source_id"), {
      schema_name: optional("schema_name"), table_name: required(formData, "table_name"),
      portfolio_column: optional("portfolio_column"),
      default_portfolio_key: optional("default_portfolio_key"),
      active_column: optional("active_column"), active_value: optional("active_value"),
      columns: { ...columns, external_client_id: required(formData, "external_client_id"), phone: required(formData, "phone") },
    });
    revalidatePath("/app/settings/catalogs");
  }

  async function addProfile(formData: FormData) {
    "use server";
    const agentName = required(formData, "agent_name");
    await createAgentProfile({
      profile_key: profileKey(required(formData, "profile_key") || agentName),
      agent_name: agentName,
      company_name: required(formData, "company_name"),
      personality: required(formData, "personality"),
      ...(String(formData.get("voice_id") ?? "").trim() ? { voice_id: String(formData.get("voice_id")).trim() } : {}),
    });
    revalidatePath("/app/settings/catalogs");
  }

  return (
    <main className="members-shell">
      <header className="members-header"><div><p className="eyebrow">Configuración</p><h1>Fuentes, carteras y agentes</h1><p className="muted">Configura referencias internas sin exponer credenciales ni filas del cliente.</p></div><Link href="/">← Volver al resumen</Link></header>
      <section className="catalog-grid">
        <article className="catalog-card"><p className="eyebrow">1. Fuente</p><h2>Origen de datos</h2><form action={addSource}><label>Nombre<input name="name" required placeholder="Carteras de prueba" /></label><label>Adaptador<select name="adapter_type" defaultValue="local_poc"><option value="local_poc">Datos locales de prueba</option><option value="mysql">MySQL</option><option value="postgresql">PostgreSQL</option><option value="http_api">API HTTP</option></select></label><button className="primary-action">Agregar fuente</button></form><p className="security-note">La fuente local conserva las carteras y clientes editables de la POC. Las fuentes externas sólo guardarán referencias, nunca credenciales en la web.</p><ul>{sources.map((source) => <li key={source.id}><strong>{source.name}</strong><small>{source.adapter_type} · {source.status}</small>{source.adapter_type === "local_poc" && <form action={syncLocal}><input type="hidden" name="data_source_id" value={source.id} /><button className="text-button">Sincronizar carteras locales</button></form>}</li>)}</ul></article>
        <article className="catalog-card"><p className="eyebrow">2. Cartera externa</p><h2>Selección autorizada</h2><form action={addPortfolio}><label>Nombre<input name="name" required placeholder="Mora temprana" /></label><label>Fuente<select name="data_source_id" required defaultValue=""><option value="" disabled>Selecciona una fuente externa</option>{externalSources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}</select></label><label>Clave externa<input name="external_key" required placeholder="mora_temprana" /></label><label>Destinatarios estimados<input name="estimated_recipients" type="number" min="0" /></label><button className="primary-action" disabled={!externalSources.length}>Agregar referencia</button></form><ul>{portfolios.filter((portfolio) => !localSourceIds.has(portfolio.data_source_id)).map((portfolio) => <li key={portfolio.id}><strong>{portfolio.name}</strong><small>{portfolio.external_key} · {portfolio.estimated_recipients ?? "sin estimación"}</small></li>)}</ul></article>
        <article className="catalog-card"><p className="eyebrow">3. Perfil versionado</p><h2>Identidad del agente</h2><form action={addProfile}><label>Clave del perfil<input name="profile_key" required placeholder="cobranza-amable" /></label><label>Nombre del agente<input name="agent_name" required placeholder="Sofía" /></label><label>Empresa presentada<input name="company_name" required placeholder="Empresa Modelo" /></label><label>Personalidad<textarea name="personality" required maxLength={1000} placeholder="Empática, clara y directa…" /></label><label>ID de voz opcional<input name="voice_id" /></label><button className="primary-action">Crear nueva versión</button></form><ul>{profiles.map((profile) => <li key={profile.id}><strong>{profile.agent_name} · {profile.company_name}</strong><small>v{profile.version} · {profile.personality}</small></li>)}</ul></article>
      </section>
      {localSources.length > 0 && <section className="local-data-card"><div><p className="eyebrow">4. Datos propios</p><h2>Carteras y clientes de prueba</h2><p className="muted">Permanecen en SQLite durante la POC. Los clientes de cartera no son usuarios de acceso a la web.</p><form action={addLocalPortfolio}><label>Fuente local<select name="data_source_id" required>{localSources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}</select></label><label>Nombre de cartera<input name="name" required placeholder="Cobranza interna" /></label><label>Clave opcional<input name="key" pattern="[a-z0-9_]+" placeholder="cobranza_interna" /></label><label>Descripción<input name="description" maxLength={500} /></label><button className="primary-action">Crear cartera local</button></form></div><div><form action={addLocalClient}><div className="form-grid"><label>Cartera<select name="portfolio_id" required>{localPortfolios.map((portfolio) => <option value={portfolio.id} key={portfolio.id}>{portfolio.name}</option>)}</select></label><label>Nombre<input name="nombre_cliente" required /></label><label>Teléfono<input name="telefono" required placeholder="8112345678" /></label><label>Día de pago<input name="dia_pago" /></label><label>Saldo<input name="saldo_pendiente" type="number" min="0" step="0.01" /></label><label>Producto<input name="articulo" /></label><label>Pagos atrasados<input name="pagos_atrasados" type="number" min="0" /></label><label>Modalidad<input name="modalidad" /></label><label>Cuota<input name="cuota_semanal" type="number" min="0" step="0.01" /></label></div><button className="primary-action" disabled={!localPortfolios.length}>Agregar cliente de prueba</button></form><div className="local-client-list">{localPortfolios.map((portfolio) => <article key={portfolio.id}><strong>{portfolio.name}</strong><small>{localClients.get(portfolio.id)?.length ?? 0} clientes activos</small><ul>{localClients.get(portfolio.id)?.map((client) => <li key={client.id}><details><summary><span>{client.nombre_cliente}</span><small>{client.telefono} · ${client.saldo_pendiente.toLocaleString("es-MX")}</small></summary><form action={editLocalClient} className="local-client-edit"><input type="hidden" name="portfolio_id" value={portfolio.id} /><input type="hidden" name="client_id" value={client.id} /><label>Nombre<input name="nombre_cliente" required defaultValue={client.nombre_cliente} /></label><label>Teléfono<input name="telefono" required defaultValue={client.telefono} /></label><label>Día de pago<input name="dia_pago" defaultValue={client.dia_pago ?? ""} /></label><label>Saldo<input name="saldo_pendiente" type="number" min="0" step="0.01" defaultValue={client.saldo_pendiente} /></label><label>Producto<input name="articulo" defaultValue={client.articulo ?? ""} /></label><label>Pagos atrasados<input name="pagos_atrasados" type="number" min="0" defaultValue={client.pagos_atrasados} /></label><label>Modalidad<input name="modalidad" defaultValue={client.modalidad ?? ""} /></label><label>Cuota<input name="cuota_semanal" type="number" min="0" step="0.01" defaultValue={client.cuota_semanal} /></label><button className="text-button">Guardar cambios</button></form><form action={deactivateLocalClient}><input type="hidden" name="portfolio_id" value={portfolio.id} /><input type="hidden" name="client_id" value={client.id} /><button className="danger-text">Desactivar cliente</button></form></details></li>)}</ul></article>)}</div></div></section>}
      {sqlSources.length > 0 && <section className="sql-mapping-card"><div><p className="eyebrow">5. Mapeo SQL</p><h2>Columnas de sólo lectura</h2><p className="muted">Configura identificadores; los valores se consultarán con parámetros enlazados. Aquí no se capturan credenciales.</p><div className="sql-plan-list">{sqlSources.map((source) => { const plan = sqlPlans.get(source.id); return <article key={source.id} className="sql-plan"><strong>{source.name}</strong>{plan ? <><small>{plan.statement_type} · valores {plan.values_bound ? "enlazados" : "directos"}</small><code>{plan.qualified_table}</code><small>{plan.projected_fields.length} campos · cartera {plan.portfolio_mode === "column" ? "por columna" : "fija"} · filtro activo {plan.active_filter ? "sí" : "no"}</small></> : <small>Guarda un mapeo para previsualizar el plan.</small>}</article>; })}</div></div><form action={saveSqlMapping}><div className="form-grid"><label>Fuente<select name="data_source_id" required>{sqlSources.map((source) => <option value={source.id} key={source.id}>{source.name} · {configuredMappings.has(source.id) ? "mapeada" : "sin mapear"}</option>)}</select></label><label>Esquema opcional<input name="schema_name" placeholder="public" /></label><label>Tabla<input name="table_name" required placeholder="accounts" /></label><label>Columna de cartera<input name="portfolio_column" placeholder="portfolio_key" /></label><label>Cartera fija alternativa<input name="default_portfolio_key" placeholder="default" /></label><label>ID del cliente<input name="external_client_id" required placeholder="client_id" /></label><label>Teléfono<input name="phone" required placeholder="phone_number" /></label><label>ID de cuenta<input name="external_account_id" placeholder="account_id" /></label><label>Nombre<input name="customer_name" placeholder="customer_name" /></label><label>Saldo<input name="balance_due" placeholder="balance" /></label><label>Día de pago<input name="payment_day" placeholder="payment_day" /></label><label>Producto<input name="product" placeholder="product" /></label><label>Pagos atrasados<input name="overdue_payments" placeholder="overdue_count" /></label><label>Modalidad<input name="payment_frequency" placeholder="frequency" /></label><label>Cuota<input name="installment_amount" placeholder="installment" /></label><label>Columna activo opcional<input name="active_column" placeholder="active" /></label><label>Valor activo<input name="active_value" placeholder="1" /></label></div><button className="primary-action">Guardar mapeo validado</button></form></section>}
    </main>
  );
}
