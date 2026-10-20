import Link from "next/link";

export type ListQuery = { q?: string; status?: string; from?: string; to?: string };
export const campaignStatusLabels: Record<string, string> = {
  draft: "Borrador", scheduled: "Programada", running: "En curso", paused: "Pausada",
  completed: "Terminada", cancelled: "Cancelada", failed: "Con incidencia",
};
export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}
export function CollectionFilters({ query, campaigns = false, action }: { query: ListQuery; campaigns?: boolean; action: string }) {
  return <form action={action} className={`collection-filters ${campaigns ? "with-dates" : ""}`}>
    <label>Buscar por {campaigns ? "nombre" : "nombre, empresa o clave"}<input type="search" name="q" defaultValue={query.q} placeholder={campaigns ? "Nombre de campaña" : "Nombre, empresa o parte de la clave"} /></label>
    {campaigns && <>
      <label>Estado<select name="status" defaultValue={query.status ?? ""}><option value="">Todos los estados</option>{Object.entries(campaignStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Creada desde<input aria-label="Creada desde" type="date" name="from" defaultValue={query.from} max={query.to || undefined} /></label>
      <label>Creada hasta<input aria-label="Creada hasta" type="date" name="to" defaultValue={query.to} min={query.from || undefined} /></label>
    </>}
    <div className="collection-filter-actions"><button className="primary-action" type="submit">Filtrar</button><Link href={action}>Limpiar</Link></div>
  </form>;
}
export function readListQuery(raw: Record<string, string | string[] | undefined>): ListQuery {
  const text = (key: string) => typeof raw[key] === "string" ? raw[key] as string : "";
  const date = (key: string) => /^\d{4}-\d{2}-\d{2}$/.test(text(key)) ? text(key) : "";
  return { q: text("q"), status: text("status"), from: date("from"), to: date("to") };
}
export function filterCampaigns<T extends { name: string; status: string; created_at: string }>(items: T[], query: ListQuery) {
  const localDay = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" });
  return items.filter(item => {
    const day = localDay.format(new Date(item.created_at));
    return normalizeSearch(item.name).includes(normalizeSearch(query.q ?? "")) &&
      (!query.status || item.status === query.status) && (!query.from || day >= query.from) && (!query.to || day <= query.to);
  });
}
