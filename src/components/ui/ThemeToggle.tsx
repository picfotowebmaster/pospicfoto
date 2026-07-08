"use client";

import { useTheme } from "@/components/ui/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="text-lg cursor-pointer leading-none select-none px-1"
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
    >
      {theme === "dark" ? (
        <i className="fas fa-sun" />
      ) : (
        <i className="fas fa-moon" />
      )}
    </button>
  );
}
