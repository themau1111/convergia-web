"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["01", "Pulso", "/"],
  ["02", "Campañas", "/app/campaigns"],
  ["03", "Agentes", "/app/agents"],
  ["04", "Pruebas y carteras", "/app/settings/catalogs"],
  ["05", "Resultados", "/app/results"],
  ["06", "Calidad", "/app/quality"],
  ["07", "Equipo", "/app/settings/members"],
  ["08", "Actividad", "/app/settings/audit"],
] as const;

export function WorkspaceNav({ campaignCount, onNavigate }: { campaignCount?: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegación principal">
      {items.map(([index, label, href]) => {
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
