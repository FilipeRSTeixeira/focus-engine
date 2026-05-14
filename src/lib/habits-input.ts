import type { HabitCadence, HabitInput } from "./habits";

const ALLOWED_CADENCE = new Set<HabitCadence>(["daily", "weekly"]);

/**
 * Validate and normalize an incoming JSON body into HabitInput.
 *
 * `requireName` is true for POST and false for PATCH — PATCH allows partial
 * updates where `name` is optional.
 */
export function parseHabitBody(
  body: unknown,
  requireName: boolean,
): HabitInput | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid body" };
  const b = body as Record<string, unknown>;

  const out: HabitInput = { name: "" };

  if (b.name !== undefined) {
    if (typeof b.name !== "string" || !b.name.trim()) {
      return { error: "Invalid name" };
    }
    out.name = b.name.trim();
  } else if (requireName) {
    return { error: "Missing name" };
  } else {
    // PATCH without name — strip name from output
    delete (out as Partial<HabitInput>).name;
  }

  if (b.description !== undefined) {
    if (b.description === null) out.description = null;
    else if (typeof b.description === "string") out.description = b.description;
    else return { error: "Invalid description" };
  }
  if (b.icon !== undefined) {
    if (typeof b.icon !== "string") return { error: "Invalid icon" };
    out.icon = b.icon;
  }
  if (b.color !== undefined) {
    if (typeof b.color !== "string") return { error: "Invalid color" };
    out.color = b.color;
  }
  if (b.category !== undefined) {
    if (b.category === null || b.category === "") out.category = null;
    else if (typeof b.category === "string") out.category = b.category;
    else return { error: "Invalid category" };
  }
  if (b.unit !== undefined) {
    if (typeof b.unit !== "string") return { error: "Invalid unit" };
    out.unit = b.unit;
  }
  if (b.cadence !== undefined) {
    if (typeof b.cadence !== "string" || !ALLOWED_CADENCE.has(b.cadence as HabitCadence)) {
      return { error: "cadence must be 'daily' or 'weekly'" };
    }
    out.cadence = b.cadence as HabitCadence;
  }
  if (b.dailyTarget !== undefined) {
    if (b.dailyTarget === null) out.dailyTarget = null;
    else {
      const n = Number(b.dailyTarget);
      if (!Number.isFinite(n) || n < 0) {
        return { error: "dailyTarget must be a non-negative number or null" };
      }
      out.dailyTarget = n;
    }
  }
  if (b.weeklyDaysTarget !== undefined) {
    const n = Number(b.weeklyDaysTarget);
    if (!Number.isInteger(n) || n < 1 || n > 7) {
      return { error: "weeklyDaysTarget must be an integer 1..7" };
    }
    out.weeklyDaysTarget = n;
  }
  if (b.weeklyTarget !== undefined) {
    if (b.weeklyTarget === null) out.weeklyTarget = null;
    else {
      const n = Number(b.weeklyTarget);
      if (!Number.isFinite(n) || n < 0) {
        return { error: "weeklyTarget must be a non-negative number or null" };
      }
      out.weeklyTarget = n;
    }
  }
  if (b.dailyPoints !== undefined) {
    const n = Number(b.dailyPoints);
    if (!Number.isInteger(n) || n < 0) {
      return { error: "dailyPoints must be a non-negative integer" };
    }
    out.dailyPoints = n;
  }
  if (b.weeklyBonusPoints !== undefined) {
    const n = Number(b.weeklyBonusPoints);
    if (!Number.isInteger(n) || n < 0) {
      return { error: "weeklyBonusPoints must be a non-negative integer" };
    }
    out.weeklyBonusPoints = n;
  }
  if (b.active !== undefined) {
    if (typeof b.active !== "boolean") return { error: "active must be boolean" };
    out.active = b.active;
  }
  if (b.order !== undefined) {
    const n = Number(b.order);
    if (!Number.isInteger(n)) return { error: "order must be integer" };
    out.order = n;
  }
  return out;
}
