import { prisma } from "./prisma";
import { startOfUtcDay, endOfUtcDay } from "./date";
import { getLevelFromXp } from "./levels";

/**
 * Aggregated counters used by every achievement check. We compute these once
 * per unlock pass and then evaluate all catalog entries against the same
 * snapshot — cheaper than running a query per achievement.
 */
export type AchievementStats = {
  totalTasksCompleted: number;
  hardTasksCompleted: number;
  totalPointsEarned: number;
  currentLevel: number;
  longestStreak: number;
  rewardsActivated: number;
  focusSessionsCompleted: number;
  projectsCount: number;
  /** Number of tasks completed today before MORNING_CUTOFF_HOUR. */
  morningTasksToday: number;
  /** Largest createdAt→completedAt span across all completed tasks, in days. */
  longestPendingTaskDays: number;
  /** True if at least one task was completed between 23:00 and 02:00 (local). */
  hasNightOwlTask: boolean;
};

export type AchievementDef = {
  key: string;
  title: string;
  description: string;
  /** lucide-react icon name. */
  icon: string;
  check: (s: AchievementStats) => boolean;
};

/**
 * Catalog of all achievements. Order matters only for display — locking is
 * driven by `check()` against current Stats.
 */
export const ACHIEVEMENT_CATALOG: AchievementDef[] = [
  // ---- Task counts ----
  {
    key: "first_task",
    title: "First Step",
    description: "Complete your very first task",
    icon: "footprints",
    check: (s) => s.totalTasksCompleted >= 1,
  },
  {
    key: "ten_tasks",
    title: "Getting Going",
    description: "Complete 10 tasks",
    icon: "list-checks",
    check: (s) => s.totalTasksCompleted >= 10,
  },
  {
    key: "fifty_tasks",
    title: "Half a Hundred",
    description: "Complete 50 tasks",
    icon: "trophy",
    check: (s) => s.totalTasksCompleted >= 50,
  },
  {
    key: "hundred_tasks",
    title: "Centurion",
    description: "Complete 100 tasks",
    icon: "medal",
    check: (s) => s.totalTasksCompleted >= 100,
  },

  // ---- Streaks ----
  {
    key: "streak_3",
    title: "Three in a Row",
    description: "Reach a 3-day streak",
    icon: "flame",
    check: (s) => s.longestStreak >= 3,
  },
  {
    key: "streak_7",
    title: "Week Warrior",
    description: "Reach a 7-day streak",
    icon: "flame",
    check: (s) => s.longestStreak >= 7,
  },
  {
    key: "streak_14",
    title: "Fortnight Fighter",
    description: "Reach a 14-day streak",
    icon: "flame",
    check: (s) => s.longestStreak >= 14,
  },
  {
    key: "streak_30",
    title: "Monthly Marathoner",
    description: "Reach a 30-day streak",
    icon: "crown",
    check: (s) => s.longestStreak >= 30,
  },

  // ---- Points / XP ----
  {
    key: "points_100",
    title: "Triple Digits",
    description: "Earn 100 lifetime points",
    icon: "star",
    check: (s) => s.totalPointsEarned >= 100,
  },
  {
    key: "points_500",
    title: "On a Roll",
    description: "Earn 500 lifetime points",
    icon: "star",
    check: (s) => s.totalPointsEarned >= 500,
  },
  {
    key: "points_1000",
    title: "Grand",
    description: "Earn 1000 lifetime points",
    icon: "sparkles",
    check: (s) => s.totalPointsEarned >= 1000,
  },
  {
    key: "points_5000",
    title: "Five Grand",
    description: "Earn 5000 lifetime points",
    icon: "sparkles",
    check: (s) => s.totalPointsEarned >= 5000,
  },

  // ---- Levels ----
  {
    key: "level_5",
    title: "Apprentice",
    description: "Reach level 5",
    icon: "chevrons-up",
    check: (s) => s.currentLevel >= 5,
  },
  {
    key: "level_10",
    title: "Expert",
    description: "Reach level 10",
    icon: "chevrons-up",
    check: (s) => s.currentLevel >= 10,
  },
  {
    key: "level_20",
    title: "Grandmaster",
    description: "Reach level 20",
    icon: "crown",
    check: (s) => s.currentLevel >= 20,
  },

  // ---- Hard tasks ----
  {
    key: "first_hard_task",
    title: "Tough Customer",
    description: "Complete your first hard-flagged task",
    icon: "swords",
    check: (s) => s.hardTasksCompleted >= 1,
  },
  {
    key: "hard_worker",
    title: "Hard Worker",
    description: "Complete 5 hard-flagged tasks",
    icon: "swords",
    check: (s) => s.hardTasksCompleted >= 5,
  },
  {
    key: "hard_dedicated",
    title: "Iron Will",
    description: "Complete 25 hard-flagged tasks",
    icon: "shield",
    check: (s) => s.hardTasksCompleted >= 25,
  },

  // ---- Time-of-day ----
  {
    key: "early_bird",
    title: "Early Bird",
    description: "Complete 3 tasks before 11:00 in one day",
    icon: "sunrise",
    check: (s) => s.morningTasksToday >= 3,
  },
  {
    key: "night_owl",
    title: "Night Owl",
    description: "Complete a task between 23:00 and 02:00",
    icon: "moon",
    check: (s) => s.hasNightOwlTask,
  },

  // ---- Procrastination ----
  {
    key: "procrastination_winner",
    title: "Finally Done",
    description: "Complete a task that waited 14+ days",
    icon: "hourglass",
    check: (s) => s.longestPendingTaskDays >= 14,
  },

  // ---- Rewards ----
  {
    key: "first_reward",
    title: "Treat Yourself",
    description: "Activate your first reward",
    icon: "gift",
    check: (s) => s.rewardsActivated >= 1,
  },
  {
    key: "ten_rewards",
    title: "Self Care",
    description: "Activate 10 rewards",
    icon: "gift",
    check: (s) => s.rewardsActivated >= 10,
  },

  // ---- Focus / Pomodoro ----
  {
    key: "focus_master",
    title: "Deep Focus",
    description: "Complete 25 focus sessions",
    icon: "timer",
    check: (s) => s.focusSessionsCompleted >= 25,
  },

  // ---- Projects ----
  {
    key: "project_creator",
    title: "Multi-tasker",
    description: "Have 5+ active projects",
    icon: "folder-plus",
    check: (s) => s.projectsCount >= 5,
  },
];

/** Lookup map from key → definition. Useful when rendering unlocked rows. */
export const ACHIEVEMENT_BY_KEY: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENT_CATALOG.map((a) => [a.key, a])
);

/**
 * Decide which achievements should be unlocked. Pure function over Stats —
 * decoupled from DB so it can be unit-tested without Prisma.
 *
 * @returns the set of catalog keys whose `check` returns true.
 */
export function evaluateAchievements(stats: AchievementStats): string[] {
  return ACHIEVEMENT_CATALOG.filter((a) => a.check(stats)).map((a) => a.key);
}

/**
 * Gather all stats needed to evaluate the catalog. Runs the underlying queries
 * in parallel. Designed to be called once per "completion event" or at request
 * time on /api/achievements.
 */
export async function computeStats(): Promise<AchievementStats> {
  const todayStart = startOfUtcDay();
  const todayEnd = endOfUtcDay();

  const [
    totalTasksCompleted,
    hardTasksCompleted,
    pointsAgg,
    longestStreakRow,
    rewardsActivated,
    focusSessionsCompleted,
    projectsCount,
    completedToday,
    longestPendingRow,
    nightOwlCount,
  ] = await Promise.all([
    prisma.task.count({ where: { status: "completed" } }),
    prisma.task.count({ where: { status: "completed", is_hard: true } }),
    prisma.dailySummary.aggregate({ _sum: { points_earned: true } }),
    prisma.dailySummary.aggregate({ _max: { streak: true } }),
    prisma.reward.count({ where: { status: "active" } }).catch(() => 0),
    prisma.focusSession.count({ where: { completed: true } }),
    prisma.project.count(),
    prisma.task.findMany({
      where: { status: "completed", completedAt: { gte: todayStart, lte: todayEnd } },
      select: { completedAt: true },
    }),
    prisma.task.findMany({
      where: { status: "completed", completedAt: { not: null } },
      select: { createdAt: true, completedAt: true },
    }),
    prisma.task.count({
      where: {
        status: "completed",
        completedAt: { not: null },
      },
    }),
  ]);

  // Morning tasks: completed before 11h local
  const morningTasksToday = completedToday.filter(
    (t) => t.completedAt && t.completedAt.getHours() < 11
  ).length;

  // Longest createdAt→completedAt span, in days
  let longestPendingDays = 0;
  for (const t of longestPendingRow) {
    if (!t.completedAt) continue;
    const d = Math.floor((t.completedAt.getTime() - t.createdAt.getTime()) / 86400000);
    if (d > longestPendingDays) longestPendingDays = d;
  }

  // Night-owl: requires a per-row hour check, can't do it in a SQLite count.
  // Reuse longestPendingRow's data (it already includes completedAt).
  const hasNightOwlTask = longestPendingRow.some((t) => {
    if (!t.completedAt) return false;
    const h = t.completedAt.getHours();
    return h >= 23 || h < 2;
  });

  // Suppress unused-var lint for nightOwlCount (kept for future detail panels).
  void nightOwlCount;

  return {
    totalTasksCompleted,
    hardTasksCompleted,
    totalPointsEarned: pointsAgg._sum.points_earned ?? 0,
    currentLevel: getLevelFromXp(pointsAgg._sum.points_earned ?? 0),
    longestStreak: longestStreakRow._max.streak ?? 0,
    rewardsActivated,
    focusSessionsCompleted,
    projectsCount,
    morningTasksToday,
    longestPendingTaskDays: longestPendingDays,
    hasNightOwlTask,
  };
}

/**
 * Persists any newly-unlocked achievements and returns them. Existing rows in
 * the Achievement table are left alone — uniqueness is enforced by the
 * `key` unique index, and we never re-grant or "downgrade" an unlock.
 */
export async function checkAndUnlockAchievements(): Promise<
  { key: string; title: string; description: string; icon: string; unlockedAt: Date }[]
> {
  const stats = await computeStats();
  const desiredKeys = evaluateAchievements(stats);

  if (desiredKeys.length === 0) return [];

  // What's already unlocked?
  const existing = await prisma.achievement.findMany({
    where: { key: { in: desiredKeys } },
    select: { key: true },
  });
  const existingKeys = new Set(existing.map((r) => r.key));

  const newlyUnlockedKeys = desiredKeys.filter((k) => !existingKeys.has(k));
  if (newlyUnlockedKeys.length === 0) return [];

  const now = new Date();
  const rows = newlyUnlockedKeys.map((k) => {
    const def = ACHIEVEMENT_BY_KEY[k];
    return {
      key: def.key,
      title: def.title,
      description: def.description,
      icon: def.icon,
      unlockedAt: now,
    };
  });

  // createMany is fine on SQLite as of Prisma 5+; we ignore conflicts in case of races.
  await prisma.achievement.createMany({ data: rows });

  return rows;
}

export async function listAchievements() {
  const unlocked = await prisma.achievement.findMany({
    orderBy: { unlockedAt: "desc" },
  });
  const unlockedKeys = new Map(unlocked.map((u) => [u.key, u]));
  return ACHIEVEMENT_CATALOG.map((def) => {
    const u = unlockedKeys.get(def.key);
    return {
      key: def.key,
      title: def.title,
      description: def.description,
      icon: def.icon,
      unlocked: !!u,
      unlockedAt: u?.unlockedAt ?? null,
    };
  });
}
