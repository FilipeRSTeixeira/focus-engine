import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, startOfUtcDay, toUtcDateKey } from "@/lib/date";
import { calculateStreak } from "@/lib/streak";

export async function GET() {
  const now = new Date();
  // The calendar shows 90 days; fetch enough tasks to cover both views.
  const ninetyDaysAgo = addDays(startOfUtcDay(now), -90);

  const completedTasks = await prisma.task.findMany({
    where: {
      status: "completed",
      completedAt: { gte: ninetyDaysAgo },
    },
    select: { completedAt: true },
  });

  const weeklyData: { day: string; tasks: number }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = addDays(startOfUtcDay(now), -i);
    const next = addDays(d, 1);
    const count = completedTasks.filter(
      (t) => t.completedAt && t.completedAt >= d && t.completedAt < next
    ).length;
    weeklyData.push({
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      tasks: count,
    });
  }

  const streak = await calculateStreak();

  // Personal best
  const bestSummary = await prisma.dailySummary.findFirst({
    orderBy: { tasks_completed: "desc" },
    select: { tasks_completed: true },
  });
  const personalBest = bestSummary?.tasks_completed ?? 0;

  // Points pie
  const totalEarned = await prisma.dailySummary.aggregate({
    _sum: { points_earned: true },
  });
  const totalSpent = await prisma.dailySummary.aggregate({
    _sum: { points_spent: true },
  });

  // Projects ranking
  const projects = await prisma.task.groupBy({
    by: ["projectId"],
    _count: { id: true },
    where: { status: "completed" },
  });

  const projectDetails = await prisma.project.findMany({
    where: { id: { in: projects.map((p) => p.projectId) } },
    select: { id: true, name: true, color: true },
  });

  const projectRanking = projects
    .map((p) => {
      const detail = projectDetails.find((d) => d.id === p.projectId);
      return { name: detail?.name ?? "Unknown", color: detail?.color ?? "#6366f1", count: p._count.id };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Productivity calendar (last 90 days)
  const calendarData: { date: string; completed: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = addDays(startOfUtcDay(now), -i);
    const next = addDays(d, 1);
    const count = completedTasks.filter(
      (t) => t.completedAt && t.completedAt >= d && t.completedAt < next
    ).length;
    calendarData.push({ date: toUtcDateKey(d), completed: count });
  }

  return NextResponse.json({
    weekly: weeklyData,
    streak,
    personalBest,
    points: {
      earned: totalEarned._sum.points_earned ?? 0,
      spent: totalSpent._sum.points_spent ?? 0,
    },
    projects: projectRanking,
    calendar: calendarData,
  });
}
