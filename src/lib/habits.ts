import { prisma } from "./prisma";
import {
  startOfUtcDay,
  endOfUtcDay,
  startOfIsoWeek,
  endOfIsoWeek,
  toIsoWeekKey,
  addDays,
} from "./date";

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

export type HabitCadence = "daily" | "weekly";

export type HabitInput = {
  name: string;
  description?: string | null;
  icon?: string;
  color?: string;
  category?: string | null;
  unit?: string;
  cadence?: HabitCadence;
  dailyTarget?: number | null;
  weeklyDaysTarget?: number;
  weeklyTarget?: number | null;
  dailyPoints?: number;
  weeklyBonusPoints?: number;
  active?: boolean;
  order?: number;
};

export type HabitWeekProgress = {
  /** 0..100 (capped). */
  percent: number;
  /** Days in the current week where the daily_target was met. */
  daysMet: number;
  /** Total of logged values across the current week (for weekly cadence). */
  weekTotal: number;
  /** Value logged for today (daily cadence) or null. */
  todayValue: number;
  /** True when the user already hit today's daily target. */
  todayDone: boolean;
  /** True when the weekly bar reached 100% for the current week. */
  weekHit: boolean;
};

/* -------------------------------------------------------------------------- */
/*                                Pure logic                                  */
/* -------------------------------------------------------------------------- */

/**
 * Compute weekly progress for a habit given its raw logs in the current week.
 *
 * - Daily cadence: percent = clamp(daysMet / weekly_days_target * 100, 0, 100)
 *   where daysMet counts logs whose value >= daily_target.
 * - Weekly cadence: percent = clamp(sum(values) / weekly_target * 100, 0, 100).
 *
 * The function is intentionally pure — tests can pass synthetic logs without
 * touching the database.
 */
export function computeWeekProgress(
  habit: {
    cadence: string;
    daily_target: number | null;
    weekly_days_target: number;
    weekly_target: number | null;
  },
  weekLogs: { date: Date; value: number }[],
  todayStart: Date,
): HabitWeekProgress {
  const todayTime = todayStart.getTime();
  const todayLog = weekLogs.find((l) => startOfUtcDay(l.date).getTime() === todayTime);
  const todayValue = todayLog?.value ?? 0;

  if (habit.cadence === "weekly") {
    const weekTotal = weekLogs.reduce((s, l) => s + (l.value ?? 0), 0);
    const target = habit.weekly_target ?? 0;
    const percent = target > 0
      ? Math.min(100, Math.round((weekTotal / target) * 100))
      : 0;
    return {
      percent,
      daysMet: weekLogs.filter((l) => (l.value ?? 0) > 0).length,
      weekTotal,
      todayValue,
      todayDone: (habit.daily_target ?? 0) > 0
        ? todayValue >= (habit.daily_target ?? Infinity)
        : todayValue > 0,
      weekHit: percent >= 100,
    };
  }

  // daily cadence
  const target = habit.daily_target ?? 0;
  const daysMet = target > 0
    ? weekLogs.filter((l) => l.value >= target).length
    : weekLogs.filter((l) => l.value > 0).length;
  const days = Math.max(1, habit.weekly_days_target || 7);
  const percent = Math.min(100, Math.round((daysMet / days) * 100));
  const weekTotal = weekLogs.reduce((s, l) => s + (l.value ?? 0), 0);

  return {
    percent,
    daysMet,
    weekTotal,
    todayValue,
    todayDone: target > 0 ? todayValue >= target : todayValue > 0,
    weekHit: percent >= 100,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  CRUD                                      */
/* -------------------------------------------------------------------------- */

export async function getHabits() {
  return prisma.habit.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

export async function getHabit(id: number) {
  return prisma.habit.findUnique({ where: { id } });
}

export async function createHabit(input: HabitInput) {
  if (!input.name?.trim()) {
    throw new Error("Habit name is required");
  }
  const cadence: HabitCadence = input.cadence ?? "daily";
  return prisma.habit.create({
    data: {
      name: input.name.trim(),
      description: input.description ?? null,
      icon: input.icon ?? "sparkles",
      color: input.color ?? "#10b981",
      category: input.category ?? null,
      unit: input.unit ?? "count",
      cadence,
      daily_target: input.dailyTarget ?? null,
      weekly_days_target: input.weeklyDaysTarget ?? 7,
      weekly_target: input.weeklyTarget ?? null,
      daily_points: input.dailyPoints ?? 2,
      weekly_bonus_points: input.weeklyBonusPoints ?? 0,
      active: input.active ?? true,
      order: input.order ?? 0,
    },
  });
}

export async function updateHabit(id: number, input: HabitInput) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name.trim();
  if (input.description !== undefined) data.description = input.description;
  if (input.icon !== undefined) data.icon = input.icon;
  if (input.color !== undefined) data.color = input.color;
  if (input.category !== undefined) data.category = input.category;
  if (input.unit !== undefined) data.unit = input.unit;
  if (input.cadence !== undefined) data.cadence = input.cadence;
  if (input.dailyTarget !== undefined) data.daily_target = input.dailyTarget;
  if (input.weeklyDaysTarget !== undefined) data.weekly_days_target = input.weeklyDaysTarget;
  if (input.weeklyTarget !== undefined) data.weekly_target = input.weeklyTarget;
  if (input.dailyPoints !== undefined) data.daily_points = input.dailyPoints;
  if (input.weeklyBonusPoints !== undefined) data.weekly_bonus_points = input.weeklyBonusPoints;
  if (input.active !== undefined) data.active = input.active;
  if (input.order !== undefined) data.order = input.order;
  return prisma.habit.update({ where: { id }, data });
}

export async function deleteHabit(id: number) {
  return prisma.habit.delete({ where: { id } });
}

/* -------------------------------------------------------------------------- */
/*                                Logging                                     */
/* -------------------------------------------------------------------------- */

export type LogResult = {
  habitId: number;
  date: Date;
  value: number;
  pointsAwardedToday: number;
  weeklyBonusAwarded: number;
  progress: HabitWeekProgress;
};

/**
 * Upsert a HabitLog and credit points where appropriate.
 *
 * Points policy:
 * - Daily cadence: when the log transitions from "below target" to "at/above
 *   target" for the day, credit `habit.daily_points` into that day's
 *   DailySummary.points_earned. Subsequent edits don't re-credit.
 * - Weekly cadence: when this is the first log of the day with value > 0,
 *   credit `habit.daily_points`. Subsequent edits don't re-credit.
 * - Weekly bonus: when the week crosses 100% for the first time, credit
 *   `habit.weekly_bonus_points` to today's DailySummary. Idempotency is
 *   tracked via a `Setting` key so it only fires once per habit per ISO-week.
 */
export async function logHabit(
  habitId: number,
  value: number,
  dateInput?: Date,
): Promise<LogResult> {
  const date = startOfUtcDay(dateInput ?? new Date());
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit) throw new Error(`Habit ${habitId} not found`);
  if (!habit.active) throw new Error(`Habit ${habitId} is archived`);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.habitLog.findUnique({
      where: { habitId_date: { habitId, date } },
    });

    const prevValue = existing?.value ?? 0;
    const newValue = Math.max(0, value);

    const log = await tx.habitLog.upsert({
      where: { habitId_date: { habitId, date } },
      create: { habitId, date, value: newValue },
      update: { value: newValue },
    });

    // Daily points credit decision
    let pointsAwardedToday = 0;

    if (habit.cadence === "daily") {
      const tgt = habit.daily_target ?? 0;
      const wasHit = tgt > 0 ? prevValue >= tgt : prevValue > 0;
      const nowHit = tgt > 0 ? newValue >= tgt : newValue > 0;
      if (!wasHit && nowHit) {
        pointsAwardedToday = habit.daily_points;
      }
    } else {
      // weekly cadence — credit on first non-zero log for the day
      const wasLogged = prevValue > 0;
      const nowLogged = newValue > 0;
      if (!wasLogged && nowLogged) {
        pointsAwardedToday = habit.daily_points;
      }
    }

    // Recompute week progress to evaluate weekly bonus eligibility
    const weekStart = startOfIsoWeek(date);
    const weekEnd = endOfIsoWeek(date);
    const weekLogs = await tx.habitLog.findMany({
      where: { habitId, date: { gte: weekStart, lte: weekEnd } },
      select: { date: true, value: true },
    });

    const progress = computeWeekProgress(habit, weekLogs, date);

    let weeklyBonusAwarded = 0;
    if (progress.weekHit && habit.weekly_bonus_points > 0) {
      const key = `habit_${habitId}_week_${toIsoWeekKey(date)}`;
      const already = await tx.setting.findUnique({ where: { key } });
      if (!already) {
        await tx.setting.create({ data: { key, value: "1" } });
        weeklyBonusAwarded = habit.weekly_bonus_points;
      }
    }

    const totalCredit = pointsAwardedToday + weeklyBonusAwarded;
    if (totalCredit > 0) {
      await tx.dailySummary.upsert({
        where: { date },
        create: { date, points_earned: totalCredit },
        update: { points_earned: { increment: totalCredit } },
      });
    }

    return {
      habitId,
      date: log.date,
      value: log.value,
      pointsAwardedToday,
      weeklyBonusAwarded,
      progress,
    };
  });
}

/* -------------------------------------------------------------------------- */
/*                            Aggregations / queries                          */
/* -------------------------------------------------------------------------- */

export type HabitWithProgress = Awaited<ReturnType<typeof getHabits>>[number] & {
  weekProgress: HabitWeekProgress;
};

/** Returns all habits with their current ISO-week progress. */
export async function getHabitsWithProgress(today: Date = new Date()): Promise<HabitWithProgress[]> {
  const habits = await getHabits();
  const weekStart = startOfIsoWeek(today);
  const weekEnd = endOfIsoWeek(today);
  const todayStart = startOfUtcDay(today);

  if (habits.length === 0) return [];

  const ids = habits.map((h) => h.id);
  const logs = await prisma.habitLog.findMany({
    where: {
      habitId: { in: ids },
      date: { gte: weekStart, lte: weekEnd },
    },
    select: { habitId: true, date: true, value: true },
  });

  const byHabit = new Map<number, { date: Date; value: number }[]>();
  for (const l of logs) {
    const arr = byHabit.get(l.habitId) ?? [];
    arr.push({ date: l.date, value: l.value });
    byHabit.set(l.habitId, arr);
  }

  return habits.map((h) => ({
    ...h,
    weekProgress: computeWeekProgress(h, byHabit.get(h.id) ?? [], todayStart),
  }));
}

/** Aggregate stats for the dashboard card. */
export async function getHabitsWeekSummary(today: Date = new Date()) {
  const items = await getHabitsWithProgress(today);
  const active = items.filter((h) => h.active);
  const dailyHits = active.filter((h) => h.weekProgress.todayDone).length;

  const weekStart = startOfIsoWeek(today);
  const weekEnd = endOfIsoWeek(today);

  // Points earned from habits this week — derived from DailySummary deltas is
  // tricky; instead we sum daily-target hits over the week per habit. This is
  // an estimate consistent with the awarding rules above (one credit per
  // transition per day).
  let pointsThisWeek = 0;
  for (const h of active) {
    if (h.cadence === "daily") {
      pointsThisWeek += h.weekProgress.daysMet * h.daily_points;
    } else {
      pointsThisWeek += h.weekProgress.daysMet * h.daily_points;
    }
    if (h.weekProgress.weekHit && h.weekly_bonus_points > 0) {
      pointsThisWeek += h.weekly_bonus_points;
    }
  }

  return {
    weekStart,
    weekEnd,
    totalHabits: active.length,
    dailyHitsToday: dailyHits,
    averagePercent:
      active.length === 0
        ? 0
        : Math.round(
            active.reduce((s, h) => s + h.weekProgress.percent, 0) / active.length,
          ),
    pointsThisWeek,
  };
}

/** Logs across a date range for one habit (history view). */
export async function getHabitLogs(habitId: number, from: Date, to: Date) {
  return prisma.habitLog.findMany({
    where: { habitId, date: { gte: startOfUtcDay(from), lte: endOfUtcDay(to) } },
    orderBy: { date: "asc" },
  });
}

/* -------------------------------------------------------------------------- */
/*                          Suggested neutral templates                       */
/* -------------------------------------------------------------------------- */

/**
 * Generic, opinion-free starter templates shown in the /habits empty state.
 * Anyone who installs the app can use these or ignore them. No personal data.
 */
export const HABIT_TEMPLATES: ReadonlyArray<HabitInput & { id: string }> = [
  {
    id: "read",
    name: "Read",
    description: "Daily reading time",
    icon: "book-open",
    color: "#3478F6",
    category: "learning",
    unit: "min",
    cadence: "daily",
    dailyTarget: 20,
    weeklyDaysTarget: 7,
    dailyPoints: 2,
  },
  {
    id: "exercise",
    name: "Exercise",
    description: "Move your body",
    icon: "activity",
    color: "#FF3B30",
    category: "health",
    unit: "min",
    cadence: "weekly",
    weeklyTarget: 150,
    dailyPoints: 3,
    weeklyBonusPoints: 10,
  },
  {
    id: "sleep",
    name: "Sleep on time",
    description: "Get to bed before your target",
    icon: "moon",
    color: "#AF52DE",
    category: "rest",
    unit: "check",
    cadence: "daily",
    dailyTarget: 1,
    weeklyDaysTarget: 6,
    dailyPoints: 3,
  },
];
