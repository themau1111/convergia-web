"use client";

import { MoonIcon, SunIcon } from "lucide-react";

export function ThemeToggle() {
  function toggleTheme() {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem("cadencia-theme", nextTheme);
  }

  return (
    <button aria-label="Cambiar tema claro u oscuro" className="theme-toggle" onClick={toggleTheme} title="Cambiar tema" type="button">
      <MoonIcon aria-hidden="true" className="theme-icon-moon" />
      <SunIcon aria-hidden="true" className="theme-icon-sun" />
    </button>
  );
}
