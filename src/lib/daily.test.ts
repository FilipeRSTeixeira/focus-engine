import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "./prisma";
import { generateDailySummary, upsertDailySummary } from "./daily";

async function resetDb() {
  // Delete in foreign-key-dependency order so SQLite's ON DELETE RESTRICT
  // never trips. Using Prisma's typed deleteMany avoids subtle issues we hit
  // earlier with raw "PRAGMA foreign_keys = OFF" not propagating across the
  // pool's connections.
  await prisma.dailySummary.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.focusSession.deleteMany();
  await prisma.task.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.project.deleteMany();
}

describe("daily summary", () => {
  beforeEach(resetDb);

  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  function makeDate(daysAgo: number) {
    // UTC midnight, matching what startOfUtcDay() produces in production code.
    // Using local midnight here would mismatch findUnique({date}) lookups in
    // any non-UTC timezone.
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo, 0, 0, 0, 0)
    );
  }

  function utcToday() {
    return makeDate(0);
  }

  it("returns zeros when no data exists", async () => {
    const project = await prisma.project.create({
      data: { name: "Test", color: "#6366f1", icon: "folder" },
    });
    await prisma.task.create({
      data: { projectId: project.id, title: "Task", priority: "high", status: "pending" },
    });

    const summary = await generateDailySummary(new Date());
    expect(summary.tasks_completed).toBe(0);
    expect(summary.points_earned).toBe(0);
    expect(summary.points_spent).toBe(0);
    expect(summary.focus_sessions).toBe(0);
    expect(summary.streak).toBe(0);
  });

  it("counts completed tasks for the given date", async () => {
    const project = await prisma.project.create({
      data: { name: "Test", color: "#6366f1", icon: "folder" },
    });

    // Task completed today
    await prisma.task.create({
      data: {
        projectId: project.id,
        title: "Today task",
        priority: "high",
        status: "completed",
        completedAt: new Date(),
        points_earned: 10,
      },
    });

    // Task completed yesterday
    await prisma.task.create({
      data: {
        projectId: project.id,
        title: "Yesterday task",
        priority: "medium",
        status: "completed",
        completedAt: makeDate(1),
        points_earned: 5,
      },
    });

    const todaySummary = await generateDailySummary(new Date());
    expect(todaySummary.tasks_completed).toBe(1);
    expect(todaySummary.points_earned).toBe(10);

    const yesterdaySummary = await generateDailySummary(makeDate(1));
    expect(yesterdaySummary.tasks_completed).toBe(1);
    expect(yesterdaySummary.points_earned).toBe(5);
  });

  it("counts focus sessions", async () => {
    const project = await prisma.project.create({
      data: { name: "Test", color: "#6366f1", icon: "folder" },
    });
    const task = await prisma.task.create({
      data: { projectId: project.id, title: "Task", priority: "high", status: "pending" },
    });

    await prisma.focusSession.create({
      data: { taskId: task.id, duration_minutes: 25, type: "work", completed: true, createdAt: new Date() },
    });
    await prisma.focusSession.create({
      data: { taskId: task.id, duration_minutes: 5, type: "break", completed: true, createdAt: new Date() },
    });

    const summary = await generateDailySummary(new Date());
    expect(summary.focus_sessions).toBe(2);
  });

  it("uses existing points_spent from DailySummary", async () => {
    const today = utcToday();
    await prisma.dailySummary.create({
      data: { date: today, points_spent: 15, tasks_completed: 0 },
    });

    const summary = await generateDailySummary(today);
    expect(summary.points_spent).toBe(15);
  });

  it("returns null reflection_note when not set", async () => {
    const project = await prisma.project.create({
      data: { name: "Test", color: "#6366f1", icon: "folder" },
    });
    await prisma.task.create({
      data: { projectId: project.id, title: "Task", priority: "high", status: "pending" },
    });

    const summary = await generateDailySummary(new Date());
    expect(summary.reflection_note).toBeNull();
  });

  it("upsertDailySummary creates a new record", async () => {
    const today = utcToday();

    const result = await upsertDailySummary(today, {
      tasks_completed: 3,
      points_earned: 20,
      points_spent: 5,
      focus_sessions: 2,
      streak: 3,
    });

    expect(result.tasks_completed).toBe(3);
    expect(result.points_earned).toBe(20);
    expect(result.streak).toBe(3);
  });

  it("upsertDailySummary updates an existing record", async () => {
    const today = utcToday();
    await prisma.dailySummary.create({
      data: { date: today, tasks_completed: 1, points_earned: 5, streak: 1 },
    });

    const result = await upsertDailySummary(today, {
      tasks_completed: 5,
      points_earned: 25,
      points_spent: 0,
      focus_sessions: 3,
      streak: 5,
    });

    expect(result.tasks_completed).toBe(5);
    expect(result.streak).toBe(5);
  });

  it("calculates streak from existing DailySummary records", async () => {
    const today = utcToday();

    await prisma.dailySummary.createMany({
      data: [
        { date: today, tasks_completed: 1 },
        { date: new Date(today.getTime() - 86400000), tasks_completed: 2 },
        { date: new Date(today.getTime() - 86400000 * 2), tasks_completed: 1 },
      ],
    });

    const summary = await generateDailySummary(today);
    expect(summary.streak).toBe(3);
  });
});
