import { prisma } from "./prisma";
import {
  calculatePoints,
  calculatePointsEnhanced,
  isMorningCompletion,
  MORNING_CUTOFF_HOUR,
  type PointsBreakdown,
} from "./points";
import { calculateStreak, updateStreakForToday } from "./streak";
import { startOfUtcDay, endOfUtcDay } from "./date";
import { checkAndUnlockAchievements } from "./achievements";

export async function getTasks(filters?: {
  projectId?: number;
  status?: string;
  priority?: string;
  energy?: string;
}) {
  return await prisma.task.findMany({
    where: {
      ...(filters?.projectId && { projectId: filters.projectId }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.priority && { priority: filters.priority }),
      ...(filters?.energy && { expected_energy: filters.energy }),
    },
    include: { Project: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTask(data: {
  projectId: number;
  title: string;
  description?: string;
  priority?: string;
  expected_energy?: string;
  estimated_time_minutes?: number;
  is_hard?: boolean;
  dueDate?: string;
}) {
  return await prisma.task.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      priority: data.priority ?? "medium",
      expected_energy: data.expected_energy ?? "medium",
      estimated_time_minutes: data.estimated_time_minutes,
      is_hard: data.is_hard ?? false,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
    include: { Project: true },
  });
}

export async function updateTaskStatus(
  id: number,
  status: "pending" | "active" | "completed"
) {
  return await prisma.task.update({
    where: { id },
    data: {
      status,
      completedAt: status === "completed" ? new Date() : null,
    },
    include: { Project: true },
  });
}

export async function updateTask(
  id: number,
  data: {
    projectId?: number;
    title?: string;
    description?: string | null;
    priority?: string;
    expected_energy?: string;
    estimated_time_minutes?: number | null;
    is_hard?: boolean;
    dueDate?: string | null;
    status?: "pending" | "active" | "completed";
  }
) {
  const updateData: Record<string, unknown> = {};
  if (data.projectId !== undefined) updateData.projectId = data.projectId;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.expected_energy !== undefined) updateData.expected_energy = data.expected_energy;
  if (data.estimated_time_minutes !== undefined) updateData.estimated_time_minutes = data.estimated_time_minutes;
  if (data.is_hard !== undefined) updateData.is_hard = data.is_hard;
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }
  if (data.status !== undefined) {
    updateData.status = data.status;
    updateData.completedAt = data.status === "completed" ? new Date() : null;
  }
  return await prisma.task.update({
    where: { id },
    data: updateData,
    include: { Project: true },
  });
}

export async function deleteTask(id: number) {
  return await prisma.task.delete({ where: { id } });
}

/** Save the Google Calendar event id alongside a task (best-effort sync). */
export async function setTaskGoogleEventId(
  id: number,
  googleEventId: string | null
) {
  return await prisma.task.update({
    where: { id },
    data: { google_event_id: googleEventId },
  });
}

export async function getProjectsForDropdown() {
  return await prisma.project.findMany({ orderBy: { name: "asc" } });
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export async function getPriorityTasks(projectId?: number, limit = 3) {
  const tasks = await prisma.task.findMany({
    where: {
      ...(projectId && { projectId }),
      status: "pending",
    },
    include: { Project: true },
    orderBy: { createdAt: "asc" },
  });

  return tasks
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99))
    .slice(0, limit);
}

/**
 * Counts how many tasks completed earlier today are themselves morning-bonus
 * eligible (completedAt before MORNING_CUTOFF_HOUR local time). Used to enforce
 * the daily cap on the morning-productivity bonus.
 */
async function countMorningTasksToday(): Promise<number> {
  const start = startOfUtcDay();
  const end = endOfUtcDay();
  const rows = await prisma.task.findMany({
    where: {
      status: "completed",
      completedAt: { gte: start, lte: end },
    },
    select: { completedAt: true },
  });
  return rows.filter((r) => r.completedAt && r.completedAt.getHours() < MORNING_CUTOFF_HOUR)
    .length;
}

/** Counts how many is_hard tasks have been completed today. */
async function countHardTasksToday(): Promise<number> {
  const start = startOfUtcDay();
  const end = endOfUtcDay();
  return await prisma.task.count({
    where: {
      status: "completed",
      is_hard: true,
      completedAt: { gte: start, lte: end },
    },
  });
}

export async function completeTask(id: number) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.status === "completed") return null;

  const now = new Date();
  const daysPending = Math.max(
    0,
    Math.floor((now.getTime() - task.createdAt.getTime()) / 86400000)
  );
  const today = startOfUtcDay();

  // Collect gamification context. Each value is computed from current DB state
  // *before* this task is marked completed, so the bonuses reflect "what existed
  // up to this completion" rather than counting the in-flight task itself.
  const [streakDays, morningTasksAlreadyToday, hardTasksAlreadyToday] = await Promise.all([
    calculateStreak(now),
    countMorningTasksToday(),
    countHardTasksToday(),
  ]);

  const breakdown: PointsBreakdown = calculatePointsEnhanced({
    priority: task.priority,
    daysPending,
    streakDays,
    completedBeforeMorningCutoff: isMorningCompletion(now),
    morningTasksAlreadyToday,
    isHard: task.is_hard,
    hardTasksAlreadyToday,
  });

  // Task update + DailySummary upsert must succeed or fail together,
  // otherwise points get desynced from completed-task counts.
  const [updated] = await prisma.$transaction([
    prisma.task.update({
      where: { id },
      data: {
        status: "completed",
        completedAt: now,
        points_earned: breakdown.total,
        bonus_breakdown: JSON.stringify(breakdown),
      },
      include: { Project: true },
    }),
    prisma.dailySummary.upsert({
      where: { date: today },
      create: { date: today, tasks_completed: 1, points_earned: breakdown.total },
      update: {
        tasks_completed: { increment: 1 },
        points_earned: { increment: breakdown.total },
      },
    }),
  ]);

  // Refresh today's streak so the dashboard reflects the new completion.
  // Done outside the transaction because it reads the row we just wrote.
  await updateStreakForToday();

  // Check for newly-unlocked achievements. Failure here must NOT roll back the
  // completion — achievement unlocks are a bonus signal, not a critical path.
  let newlyUnlocked: Awaited<ReturnType<typeof checkAndUnlockAchievements>> = [];
  try {
    newlyUnlocked = await checkAndUnlockAchievements();
  } catch (err) {
    console.error("[completeTask] achievement check failed:", err);
  }

  return { task: updated, pointsEarned: breakdown.total, breakdown, newlyUnlocked };
}

export async function getTodayPoints() {
  const today = startOfUtcDay();
  const summary = await prisma.dailySummary.findUnique({ where: { date: today } });
  return summary?.points_earned ?? 0;
}

// Re-exported for any caller that wants the simple legacy formula
export { calculatePoints };
