"use client";

import { useEffect, useState, type ReactNode } from "react";

import { WorkspaceNav } from "@/components/workspace-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export function WorkspaceSidebarFrame({
  campaignCount,
  footer,
}: {
  campaignCount?: number;
  footer: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <>
      <header className="mobile-workspace-bar">
        <div className="brand"><span className="brand-mark">C</span><span>cadencia</span></div>
        <button
          aria-controls="workspace-menu"
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          className="menu-toggle"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span /><span /><span />
        </button>
      </header>
      {open && <button aria-label="Cerrar menú" className="sidebar-scrim" onClick={() => setOpen(false)} type="button" />}
      <aside className={`sidebar${open ? " mobile-open" : ""}`} id="workspace-menu">
        <div className="sidebar-brand-row">
          <div className="brand"><span className="brand-mark">C</span><span>cadencia</span></div>
          <ThemeToggle />
          <button aria-label="Cerrar menú" className="drawer-close" onClick={() => setOpen(false)} type="button">×</button>
        </div>
        <WorkspaceNav campaignCount={campaignCount} onNavigate={() => setOpen(false)} />
        {footer}
      </aside>
    </>
  );
}
