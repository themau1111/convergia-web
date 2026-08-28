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
  const totalContacts = portfolios.reduce((total, portfolio) => total + portfolio.contact_count, 0);
  const readyPortfolios = portfolios.filter((portfolio) => portfolio.contact_count > 0).length;

  const portfolioContacts: Map<string, CsvContactRecord[]> = new Map();
  await Promise.all(
    portfolios.map(async (p) => {
      const contacts = await getCsvContacts(p.id).catch(() => [] as CsvContactRecord[]);
      portfolioContacts.set(p.id, contacts);
    }),
  );

  return (
    <main className="members-shell carteras-page">
      <header className="members-header carteras-header">
        <div>
          <p className="eyebrow">Marcación</p>
          <h1>Carteras CSV</h1>
          <p className="muted">
            Importa contactos desde CSV o Excel y úsalos en tus campañas. Las variables 1–5 quedan disponibles en el script del agente como{" "}
            <code>{"{{variable_1}}"}</code> … <code>{"{{variable_5}}"}</code>.
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

      <section className="carteras-summary" aria-label="Resumen de carteras">
        <article>
          <span>Carteras creadas</span>
          <strong>{portfolios.length}</strong>
          <small>Listas para organizar por campaña</small>
        </article>
        <article>
          <span>Contactos cargados</span>
          <strong>{totalContacts.toLocaleString("es-MX")}</strong>
          <small>Disponibles para la marcación</small>
        </article>
        <article>
          <span>Carteras listas</span>
          <strong>{readyPortfolios}</strong>
          <small>{portfolios.length - readyPortfolios} sin contactos</small>
        </article>
      </section>

      {portfolios.length === 0 ? (
        <div className="empty-state csv-empty-state">
          <strong>Aún no hay carteras.</strong>
          <span>Crea tu primera cartera y sube un archivo CSV con tus contactos.</span>
        </div>
      ) : (
        <section className="csv-portfolio-stack" aria-labelledby="carteras-disponibles">
          <div className="carteras-section-heading">
            <div>
              <p className="eyebrow">Biblioteca de contactos</p>
              <h2 id="carteras-disponibles">Carteras disponibles</h2>
            </div>
            <span>{portfolios.length} {portfolios.length === 1 ? "cartera" : "carteras"}</span>
          </div>
          {portfolios.map((portfolio) => {
            const contacts = portfolioContacts.get(portfolio.id) ?? [];
            const vars = ["variable_1", "variable_2", "variable_3", "variable_4", "variable_5"] as const;
            const usedVars = contacts.length > 0
              ? vars.filter((v) => contacts.some((c) => c[v] !== null))
              : [];

            return (
              <details className="csv-portfolio-panel" key={portfolio.id}>
                <summary>
                  <span className="csv-portfolio-summary-main">
                    <strong>{portfolio.name}</strong>
                    <small>{portfolio.contact_count.toLocaleString("es-MX")} contactos · creada {new Date(portfolio.created_at).toLocaleDateString("es-MX")}</small>
                  </span>
                  <b className={portfolio.contact_count > 0 ? "is-ready" : "is-empty"}>
                    {portfolio.contact_count > 0 ? `${portfolio.contact_count.toLocaleString("es-MX")} listos` : "Vacía"}
                  </b>
                </summary>

                <div className="csv-portfolio-body">
                  <section className="csv-portfolio-section">
                    <div className="csv-section-heading">
                      <div>
                        <p className="eyebrow">Importar contactos</p>
                        <h3>Actualiza esta cartera</h3>
                        <p>Agrega un nuevo archivo CSV o Excel. Conservaremos las variables que incluyas en cada fila.</p>
                      </div>
                    </div>
                    <UploadCsvContactsForm portfolioId={portfolio.id} portfolioName={portfolio.name} />
                  </section>

                  {contacts.length > 0 && (
                    <section className="csv-portfolio-section">
                      <div className="csv-section-heading csv-preview-heading">
                        <div>
                          <p className="eyebrow">Vista previa</p>
                          <h3>{contacts.length.toLocaleString("es-MX")} contactos cargados</h3>
                        </div>
                        {usedVars.length > 0 && (
                          <span className="csv-variable-list" aria-label="Variables activas">
                            {usedVars.map((variable) => (
                              <span className="csv-variable-chip" key={variable}>{variable.replace("_", " ")}</span>
                            ))}
                          </span>
                        )}
                      </div>
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
                          <p className="csv-preview-note">
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
        </section>
      )}
    </main>
  );
}
