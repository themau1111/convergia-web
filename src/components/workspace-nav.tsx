"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["01", "Pulso", "/"],
  ["02", "Campañas", "/app/campaigns"],
  ["03", "Datos y agentes", "/app/settings/catalogs"],
  ["04", "Resultados", "/app/results"],
  ["05", "Calidad", "/app/quality"],
  ["06", "Equipo", "/app/settings/members"],
  ["07", "Actividad", "/app/settings/audit"],
] as const;

export function WorkspaceNav({ campaignCount }: { campaignCount?: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegación principal">
      {items.map(([index, label, href]) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link className={`nav-item${active ? " active" : ""}`} href={href} key={href}>
            <i>{index}</i> {label}
            {href === "/app/campaigns" && campaignCount !== undefined && <span>{campaignCount}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
