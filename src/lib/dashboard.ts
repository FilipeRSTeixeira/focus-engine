import { prisma } from "./prisma";
import { startOfUtcDay, addDays } from "./date";

export async function getYesterdayCompletedTasks() {
  const yesterday = addDays(startOfUtcDay(), -1);
  const tomorrow = addDays(yesterday, 1);

  return await prisma.task.findMany({
    where: {
      status: "completed",
      completedAt: { gte: yesterday, lt: tomorrow },
    },
    include: { Project: { select: { name: true, color: true } } },
    orderBy: { completedAt: "desc" },
  });
}

export async function getTodayPointsAndStreak() {
  const today = startOfUtcDay();

  const summary = await prisma.dailySummary.findUnique({ where: { date: today } });
  const points = summary?.points_earned ?? 0;
  const streak = summary?.streak ?? 0;

  return { points, streak };
}

export async function getUnlockedRewards(limit = 3) {
  const today = startOfUtcDay();

  const summary = await prisma.dailySummary.findUnique({ where: { date: today } });
  const availablePoints = (summary?.points_earned ?? 0) - (summary?.points_spent ?? 0);

  return await prisma.reward.findMany({
    where: {
      status: "available",
      point_cost: { lte: availablePoints },
    },
    take: limit,
    orderBy: { point_cost: "asc" },
  });
}
