import { prisma } from "./prisma";
import { startOfUtcDay, endOfUtcDay } from "./date";
import { calculateStreak } from "./streak";

export async function generateDailySummary(date: Date) {
  const start = startOfUtcDay(date);
  const end = endOfUtcDay(date);

  const tasksCompleted = await prisma.task.count({
    where: {
      status: "completed",
      completedAt: { gte: start, lte: end },
    },
  });

  const tasks = await prisma.task.findMany({
    where: {
      status: "completed",
      completedAt: { gte: start, lte: end },
    },
    select: { points_earned: true },
  });
  const pointsEarned = tasks.reduce((sum, t) => sum + (t.points_earned ?? 0), 0);

  const dailySummary = await prisma.dailySummary.findUnique({
    where: { date: start },
  });
  const pointsSpent = dailySummary?.points_spent ?? 0;

  const focusSessions = await prisma.focusSession.count({
    where: {
      completed: true,
      createdAt: { gte: start, lte: end },
    },
  });

  const streak = await calculateStreak(start);

  return {
    date: start,
    tasks_completed: tasksCompleted,
    points_earned: pointsEarned,
    points_spent: pointsSpent,
    focus_sessions: focusSessions,
    reflection_note: dailySummary?.reflection_note ?? null,
    streak,
  };
}

export async function upsertDailySummary(date: Date, data: {
  tasks_completed: number;
  points_earned: number;
  points_spent: number;
  focus_sessions: number;
  reflection_note?: string | null;
  streak: number;
}) {
  const start = startOfUtcDay(date);

  return await prisma.dailySummary.upsert({
    where: { date: start },
    create: {
      date: start,
      ...data,
    },
    update: data,
  });
}
