/**
 * Date helpers. All "day" boundaries are UTC midnight so that DailySummary
 * rows have stable, deterministic keys regardless of the host timezone.
 */

/** UTC midnight for the given date (or now). */
export function startOfUtcDay(date: Date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
  );
}

/** UTC end-of-day (23:59:59.999) for the given date. */
export function endOfUtcDay(date: Date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)
  );
}

/** Add `days` UTC days to `date`, returning a new Date. Negative values are fine. */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** "YYYY-MM-DD" key in UTC. Stable across timezones. */
export function toUtcDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * UTC midnight of the Monday that anchors the ISO-week containing `date`.
 * Monday-Sunday weeks; getUTCDay() returns 0 for Sunday, so we treat Sunday
 * as day 7 to keep "days since Monday" non-negative.
 */
export function startOfIsoWeek(date: Date = new Date()): Date {
  const day = date.getUTCDay() || 7; // 1..7, Monday=1, Sunday=7
  const monday = startOfUtcDay(date);
  monday.setUTCDate(monday.getUTCDate() - (day - 1));
  return monday;
}

/** UTC end-of-day (Sunday 23:59:59.999) for the ISO-week containing `date`. */
export function endOfIsoWeek(date: Date = new Date()): Date {
  const monday = startOfIsoWeek(date);
  const sunday = addDays(monday, 6);
  return endOfUtcDay(sunday);
}

/**
 * "YYYY-Www" key for the ISO-week containing `date` (e.g. "2026-W20").
 * Useful for idempotency keys on weekly bonuses and once-per-week reward limits.
 */
export function toIsoWeekKey(date: Date = new Date()): string {
  const monday = startOfIsoWeek(date);
  const thursday = addDays(monday, 3);
  const isoYear = thursday.getUTCFullYear();
  const yearStart = startOfIsoWeek(
    new Date(Date.UTC(isoYear, 0, 4))
  );
  const diffDays = Math.round(
    (monday.getTime() - yearStart.getTime()) / 86_400_000
  );
  const week = Math.floor(diffDays / 7) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}
