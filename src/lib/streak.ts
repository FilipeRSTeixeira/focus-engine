import { prisma } from "./prisma";
import { startOfUtcDay, addDays, toUtcDateKey } from "./date";

/**
 * Counts a streak of consecutive days with tasks_completed > 0,
 * anchored at `asOf` (default = today UTC). The streak counts as continuing
 * if the most recent entry is `asOf` or the day before.
 */
export async function calculateStreak(asOf: Date = new Date()): Promise<number> {
  const summaries = await prisma.dailySummary.findMany({
    where: {
      tasks_completed: { gt: 0 },
    },
    orderBy: { date: "desc" },
  });

  if (summaries.length === 0) return 0;

  const today = startOfUtcDay(asOf);
  const yesterday = addDays(today, -1);

  const todayKey = toUtcDateKey(today);
  const yesterdayKey = toUtcDateKey(yesterday);

  const firstKey = toUtcDateKey(summaries[0].date);

  // Streak must end today or yesterday
  if (firstKey !== todayKey && firstKey !== yesterdayKey) return 0;

  // Start counting from the right anchor day
  let current = firstKey === todayKey ? new Date(today) : new Date(yesterday);
  let streak = 0;
  let summaryIndex = 0;

  while (summaryIndex < summaries.length) {
    const key = toUtcDateKey(summaries[summaryIndex].date);
    const expected = toUtcDateKey(current);

    if (key === expected) {
      streak++;
      current = addDays(current, -1);
      summaryIndex++;
    } else if (key < expected) {
      break;
    } else {
      // key > expected means we skipped a day — gap in streak
      break;
    }
  }

  return streak;
}

export async function updateStreakForToday(): Promise<void> {
  const streak = await calculateStreak();
  const today = startOfUtcDay();
  await prisma.dailySummary.upsert({
    where: { date: today },
    create: { date: today, streak },
    update: { streak },
  });
}
