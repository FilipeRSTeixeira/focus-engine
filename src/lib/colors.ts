/**
 * App-wide colour tokens.
 *
 * Aligned with the Things-inspired palette defined in globals.css.
 * Keep the same export names and shapes so existing call sites work.
 */

/** Priority dots / accents — used in task rows and lists. */
export const PRIORITY_COLORS: Record<string, string> = {
  high: "#FF3B30",   // iOS red
  medium: "#FF9500", // iOS orange
  low: "#8E8E93",    // iOS secondary label gray
};

/**
 * Background + text + border Tailwind classes for priority badges.
 * Kept for legacy badge rendering — new UI prefers dots, but some pages
 * still display these as pills.
 */
export const PRIORITY_BG: Record<string, string> = {
  high: "bg-red-500/10 text-red-500 border-red-500/20 dark:text-red-400",
  medium: "bg-orange-500/10 text-orange-500 border-orange-500/20 dark:text-orange-400",
  low: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20 dark:text-zinc-400",
};

/** Status indicator dots. */
export const STATUS_COLORS: Record<string, string> = {
  pending: "#8E8E93", // muted
  active: "#3478F6",  // Things blue
  completed: "#34C759", // iOS green
};

/** Calendar heatmap shades — light to saturated (used on /history). */
export const CALENDAR_COLORS = [
  "#EFEFEA", // empty / very low (light surface)
  "#A7D9A7",
  "#6EBE6E",
  "#34C759",
  "#1E9E3E",
] as const;

/** Earned vs spent pie slices. */
export const PIE_COLORS = {
  earned: "#34C759",
  spent: "#FF3B30",
};

/** Pomodoro timer ring colours. */
export const TIMER_COLORS = {
  work: "#FF3B30",
  break: "#34C759",
};
