import Link from "next/link";

import { getCsvPortfolios, getCsvContacts } from "@/lib/control-api";
import type { CsvPortfolioRecord, CsvContactRecord } from "@/lib/control-api";
import { CreatePortfolioForm } from "./create-portfolio-form";
import { UploadCsvContactsForm } from "./upload-contacts-form";

const TEMPLATE_HEADERS = "Telefono,Nombre,Variable 1,Variable 2,Variable 3,Variable 4,Variable 5";
const TEMPLATE_EXAMPLE = "5218112345678,Juan Pérez,Dato 1,Dato 2,Dato 3,Dato 4,Dato 5";
const TEMPLATE_BLOB = `data:text/csv;charset=utf-8,${encodeURIComponent(`${TEMPLATE_HEADERS}\n${TEMPLATE_EXAMPLE}\n`)}`;

export default async function CarterasPage() {
  const portfolios = await getCsvPortfolios().catch(() => [] as CsvPortfolioRecord[]);

  const portfolioContacts: Map<string, CsvContactRecord[]> = new Map();
  await Promise.all(
    portfolios.map(async (p) => {
      const contacts = await getCsvContacts(p.id).catch(() => [] as CsvContactRecord[]);
      portfolioContacts.set(p.id, contacts);
    }),
  );

  return (
    <main className="members-shell">
      <header className="members-header">
        <div>
          <p className="eyebrow">Marcación</p>
          <h1>Carteras CSV</h1>
          <p className="muted">
            Sube archivos CSV o Excel con tus contactos y úsalos en campañas.
            Las variables 1–5 quedan disponibles en el script del agente como{" "}
            <code style={{ fontSize: 11 }}>{"{{variable_1}}"}</code> … <code style={{ fontSize: 11 }}>{"{{variable_5}}"}</code>.
          </p>
        </div>
        <div className="header-actions">
          <Link href="/">← Volver al pulso</Link>
          <a
            href={TEMPLATE_BLOB}
            download="plantilla_cartera.csv"
            className="secondary-action"
          >
            Descargar plantilla CSV
          </a>
          <CreatePortfolioForm />
        </div>
      </header>

      {portfolios.length === 0 ? (
        <div className="empty-state">
          <strong>Aún no hay carteras.</strong>
          <span>Crea tu primera cartera y sube un archivo CSV con tus contactos.</span>
        </div>
      ) : (
        <div className="portfolio-stack">
          {portfolios.map((portfolio) => {
            const contacts = portfolioContacts.get(portfolio.id) ?? [];
            const vars = ["variable_1", "variable_2", "variable_3", "variable_4", "variable_5"] as const;
            const usedVars = contacts.length > 0
              ? vars.filter((v) => contacts.some((c) => c[v] !== null))
              : [];

            return (
              <details className="csv-portfolio-panel" key={portfolio.id}>
                <summary>
                  <span>
                    <strong>{portfolio.name}</strong>
                    <small>{portfolio.contact_count} contactos · creada {new Date(portfolio.created_at).toLocaleDateString("es-MX")}</small>
                  </span>
                  <b>{portfolio.contact_count > 0 ? `${portfolio.contact_count} listos` : "Vacía"}</b>
                </summary>

                <div className="csv-portfolio-body">
                  {/* Upload form */}
                  <section className="csv-portfolio-section">
                    <p className="eyebrow">Importar contactos</p>
                    <UploadCsvContactsForm portfolioId={portfolio.id} portfolioName={portfolio.name} />
                  </section>

                  {/* Contact preview */}
                  {contacts.length > 0 && (
                    <section className="csv-portfolio-section">
                      <p className="eyebrow">
                        Vista previa · {contacts.length} contactos
                        {usedVars.length > 0 && (
                          <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 8 }}>
                            Variables activas: {usedVars.map((v) => v.replace("_", " ")).join(", ")}
                          </span>
                        )}
                      </p>
                      <div className="csv-contacts-table-wrap">
                        <table className="csv-contacts-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Teléfono</th>
                              <th>Nombre</th>
                              {usedVars.map((v) => (
                                <th key={v}>{v.replace("_", " ").replace("v", "V")}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {contacts.slice(0, 50).map((c) => (
                              <tr key={c.id}>
                                <td>{c.position}</td>
                                <td>{c.telefono}</td>
                                <td>{c.nombre}</td>
                                {usedVars.map((v) => (
                                  <td key={v}>{c[v] ?? <span className="muted">—</span>}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {contacts.length > 50 && (
                          <p className="muted" style={{ padding: "8px 12px", fontSize: 12 }}>
                            Mostrando 50 de {contacts.length} contactos.
                          </p>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </main>
  );
}
