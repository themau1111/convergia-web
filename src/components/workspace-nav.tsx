"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const collectionsItems = [
  ["01", "Pulso", "/"], ["02", "Campañas", "/app/campaigns"],
  ["03", "Agentes", "/app/agents"], ["04", "Carteras", "/app/carteras"],
  ["05", "Pruebas y carteras", "/app/settings/catalogs"], ["06", "Resultados", "/app/results"],
  ["07", "Calidad", "/app/quality"], ["08", "Equipo", "/app/settings/members"],
  ["09", "Actividad", "/app/settings/audit"],
] as const;

const surveyItems = [
  ["01", "Encuestas", "/app/surveys"], ["02", "Cuestionarios", "/app/surveys/questionnaires"],
  ["03", "Entrevistadores", "/app/surveys/interviewers"], ["04", "Muestra de contactos", "/app/carteras"],
  ["05", "Pruebas manuales", "/app/surveys/test-call"], ["06", "Calidad", "/app/surveys/quality"],
  ["07", "Equipo", "/app/settings/members"], ["08", "Actividad", "/app/settings/audit"],
] as const;

export function WorkspaceNav({
  campaignCount,
  workspace,
  onNavigate,
}: {
  campaignCount?: number;
  workspace?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegación principal">
      {(workspace === "survey" ? surveyItems : collectionsItems)
        .map(([index, label, href]) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link className={`nav-item${active ? " active" : ""}`} href={href} key={href} onClick={onNavigate}>
              <i>{index}</i> {label}
              {href === "/app/campaigns" && campaignCount !== undefined && <span>{campaignCount}</span>}
            </Link>
          );
        })}
    </nav>
  );
}
