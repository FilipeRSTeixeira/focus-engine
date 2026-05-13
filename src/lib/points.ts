const PRIORITY_BASE: Record<string, number> = {
  high: 10,
  medium: 5,
  low: 3,
};

export function getPriorityBase(priority: string): number {
  return PRIORITY_BASE[priority] ?? 0;
}

export function calculatePoints(priority: string, daysPending: number): number {
  if (daysPending < 0) {
    throw new Error("daysPending cannot be negative");
  }
  return getPriorityBase(priority) + daysPending;
}

// ---------- Enhanced scoring (gamification multipliers) ----------

/**
 * "Local" morning cutoff used for the morning-productivity bonus.
 * A task counts as "morning" if completedAt is before this hour in the user's local zone.
 */
export const MORNING_CUTOFF_HOUR = 11;

/** Max number of morning-bonus-eligible tasks per day. */
export const MORNING_BONUS_DAILY_CAP = 3;

/** Max number of hard-flagged tasks that can earn the hard bonus per day. */
export const HARD_BONUS_DAILY_CAP = 2;

/**
 * Tiered procrastination bonus applied as a percentage of the priority base
 * (on top of the legacy +1/day additive bonus). This rewards finally clearing
 * tasks that have been sitting in the backlog.
 */
export function procrastinationTier(daysPending: number): number {
  if (daysPending > 7) return 1.0; // +100%
  if (daysPending > 3) return 0.5; // +50%
  return 0;
}

/**
 * Streak bonus: from day 7 onwards, +10% of base, growing +1% per extra day,
 * capped at +30% (reached at day 27+). Pre-day-7 streaks give no extra bonus
 * (the streak itself is its own visible reward on the dashboard).
 */
export function streakBonusPercent(streakDays: number): number {
  if (streakDays < 7) return 0;
  const extra = Math.min(streakDays - 7, 20); // grows 0..20
  return 0.1 + extra * 0.01; // 0.10 .. 0.30
}

export type EnhancedPointsContext = {
  priority: string;
  daysPending: number;
  /** Current streak length (in days) including today. Used to compute the streak bonus. */
  streakDays?: number;
  /** True when this completion happened before MORNING_CUTOFF_HOUR local time. */
  completedBeforeMorningCutoff?: boolean;
  /** How many morning-bonus tasks have already been awarded today (so we cap at MORNING_BONUS_DAILY_CAP). */
  morningTasksAlreadyToday?: number;
  /** True if the task is flagged as hard. */
  isHard?: boolean;
  /** How many hard-bonus tasks have already been awarded today (capped at HARD_BONUS_DAILY_CAP). */
  hardTasksAlreadyToday?: number;
};

export type PointsBreakdown = {
  base: number;
  daysPending: number;
  procrastinationBonus: number;
  streakBonus: number;
  morningBonus: number;
  hardBonus: number;
  total: number;
};

/**
 * Enhanced point calculation. Each bonus is computed against `base` (the
 * priority base only, NOT the daysPending additive), then rounded and added.
 * This keeps numbers small, predictable, and prevents compounding explosions.
 *
 * Backward compat: `calculatePoints(priority, daysPending)` continues to return
 * `base + daysPending`, which corresponds to the `base + daysPending` part of
 * the breakdown returned here.
 */
export function calculatePointsEnhanced(ctx: EnhancedPointsContext): PointsBreakdown {
  if (ctx.daysPending < 0) {
    throw new Error("daysPending cannot be negative");
  }

  const base = getPriorityBase(ctx.priority);
  const daysPending = ctx.daysPending;

  const procrastinationBonus = Math.round(base * procrastinationTier(daysPending));

  const streakBonus = ctx.streakDays
    ? Math.round(base * streakBonusPercent(ctx.streakDays))
    : 0;

  const morningEligible =
    !!ctx.completedBeforeMorningCutoff &&
    (ctx.morningTasksAlreadyToday ?? 0) < MORNING_BONUS_DAILY_CAP;
  const morningBonus = morningEligible ? Math.round(base * 0.2) : 0;

  const hardEligible =
    !!ctx.isHard && (ctx.hardTasksAlreadyToday ?? 0) < HARD_BONUS_DAILY_CAP;
  const hardBonus = hardEligible ? Math.round(base * 0.3) : 0;

  const total =
    base + daysPending + procrastinationBonus + streakBonus + morningBonus + hardBonus;

  return {
    base,
    daysPending,
    procrastinationBonus,
    streakBonus,
    morningBonus,
    hardBonus,
    total,
  };
}

/** Returns true if `date` (local time) is before the morning bonus cutoff hour. */
export function isMorningCompletion(date: Date = new Date()): boolean {
  return date.getHours() < MORNING_CUTOFF_HOUR;
}
