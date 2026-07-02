"use client";

import { useLocalStorageValue } from "@/components/useLocalStorageValue";

const THEMES = ["light", "paper", "dark"] as const;
type Theme = (typeof THEMES)[number];

const THEME_LABEL: Record<Theme, string> = {
  light: "Light",
  paper: "Paper",
  dark: "Dark",
};

export function ThemeToggle() {
  const [saved, setSaved] = useLocalStorageValue("bs-theme");
  const theme: Theme =
    saved && (THEMES as readonly string[]).includes(saved) ? (saved as Theme) : "light";

  function apply(next: Theme) {
    setSaved(next);
    const html = document.documentElement;
    html.classList.remove("dark");
    html.removeAttribute("data-theme");
    if (next === "dark") html.setAttribute("data-theme", "dark");
    else if (next === "paper") html.setAttribute("data-theme", "paper");
    // light = no attribute (the :root default)
  }

  if (saved === undefined) {
    // Avoid hydration mismatch — inert placeholder until the stored theme is known.
    return <div className="h-7 w-[150px] rounded-md border border-border" aria-hidden />;
  }

  return (
    <div className="inline-flex items-center gap-0.5 border border-border rounded-md p-0.5 text-xs bg-card">
      {THEMES.map((t) => {
        const active = theme === t;
        return (
          <button
            key={t}
            onClick={() => apply(t)}
            type="button"
            aria-pressed={active}
            className={`px-2 py-1 rounded-sm transition-colors ${
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {THEME_LABEL[t]}
          </button>
        );
      })}
    </div>
  );
}
