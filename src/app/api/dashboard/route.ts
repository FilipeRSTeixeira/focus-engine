import { NextResponse } from "next/server";
import {
  getYesterdayCompletedTasks,
  getTodayPointsAndStreak,
  getUnlockedRewards,
} from "@/lib/dashboard";
import { getTasks } from "@/lib/tasks";
import { getCurrentLevelInfo } from "@/lib/levels";
import { getHabitsWeekSummary } from "@/lib/habits";
import { prisma } from "@/lib/prisma";

const PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export async function GET() {
  try {
    const [
      pointsAndStreak,
      yesterdayTasks,
      unlockedRewards,
      pendingTasks,
      level,
      recentAchievements,
      habitsWeek,
    ] = await Promise.all([
      getTodayPointsAndStreak(),
      getYesterdayCompletedTasks(),
      getUnlockedRewards(3),
      getTasks({ status: "pending" }),
      getCurrentLevelInfo(),
      prisma.achievement.findMany({ orderBy: { unlockedAt: "desc" }, take: 3 }),
      getHabitsWeekSummary(),
    ]);

    const sorted = [...pendingTasks].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;

      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (da !== db) return da - db;

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const topPendingTasks = sorted.slice(0, 5).map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate,
      project: t.Project
        ? { id: t.Project.id, name: t.Project.name, color: t.Project.color }
        : null,
    }));

    return NextResponse.json({
      points: pointsAndStreak.points,
      streak: pointsAndStreak.streak,
      yesterdayCompleted: yesterdayTasks.length,
      yesterdayTasks: yesterdayTasks.map((t) => ({
        title: t.title,
        project: t.Project ?? null,
      })),
      unlockedRewards,
      pendingTasks: pendingTasks.length,
      topPendingTasks,
      level,
      recentAchievements,
      habitsWeek,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({
      points: 0,
      streak: 0,
      yesterdayCompleted: 0,
      yesterdayTasks: [],
      unlockedRewards: [],
      pendingTasks: 0,
      topPendingTasks: [],
      level: {
        level: 1,
        tier: "Newcomer",
        color: "#71717a",
        totalXp: 0,
        xpInLevel: 0,
        xpForCurrentLevel: 50,
        xpToNext: 50,
        progress: 0,
      },
      recentAchievements: [],
      habitsWeek: null,
    });
  }
}
