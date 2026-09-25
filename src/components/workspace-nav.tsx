"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["01", "Pulso", "/", null],
  ["02", "Campañas", "/app/campaigns", null],
  ["03", "Encuestas", "/app/surveys", "survey"],
  ["04", "Agentes", "/app/agents", null],
  ["05", "Carteras", "/app/carteras", null],
  ["06", "Pruebas y carteras", "/app/settings/catalogs", null],
  ["07", "Resultados", "/app/results", null],
  ["08", "Calidad", "/app/quality", null],
  ["09", "Equipo", "/app/settings/members", null],
  ["10", "Actividad", "/app/settings/audit", null],
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
      {items
        .filter(([, , , requiredWorkspace]) => !requiredWorkspace || requiredWorkspace === workspace)
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
