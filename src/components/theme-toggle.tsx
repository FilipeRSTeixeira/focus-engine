"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemePreference } from "./theme-provider";

const LABELS: Record<ThemePreference, string> = {
  light: "Light theme",
  dark: "Dark theme",
  system: "System theme",
};

export function ThemeToggle({
  collapsed = false,
  className = "",
}: {
  collapsed?: boolean;
  className?: string;
}) {
  const { preference, cyclePreference } = useTheme();

  const Icon =
    preference === "light" ? Sun : preference === "dark" ? Moon : Monitor;

  const next: ThemePreference =
    preference === "light"
      ? "dark"
      : preference === "dark"
      ? "system"
      : "light";

  return (
    <button
      type="button"
      onClick={cyclePreference}
      title={`${LABELS[preference]} — click for ${LABELS[next].toLowerCase()}`}
      aria-label={LABELS[preference]}
      className={`flex items-center gap-2 rounded-md px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
        collapsed ? "justify-center w-full" : "w-full"
      } ${className}`}
    >
      <Icon size={16} className="shrink-0" />
      {!collapsed && <span className="capitalize">{LABELS[preference]}</span>}
    </button>
  );
}
