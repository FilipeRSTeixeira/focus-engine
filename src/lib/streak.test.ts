import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "./prisma";
import { calculateStreak } from "./streak";

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

describe("calculateStreak", () => {
  beforeEach(resetDb);

  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  function makeDate(daysAgo: number) {
    // UTC midnight, matching what startOfUtcDay() produces in production code.
    // Local midnight would mismatch the date keys calculateStreak() compares.
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo, 0, 0, 0, 0)
    );
  }

  it("returns 0 when no summaries exist", async () => {
    expect(await calculateStreak()).toBe(0);
  });

  it("single day streak (today)", async () => {
    await prisma.dailySummary.create({
      data: { date: makeDate(0), tasks_completed: 2, streak: 0 },
    });
    expect(await calculateStreak()).toBe(1);
  });

  it("multi-day streak (3 consecutive days ending today)", async () => {
    await prisma.dailySummary.createMany({
      data: [
        { date: makeDate(0), tasks_completed: 1, streak: 0 },
        { date: makeDate(1), tasks_completed: 3, streak: 0 },
        { date: makeDate(2), tasks_completed: 1, streak: 0 },
      ],
    });
    expect(await calculateStreak()).toBe(3);
  });

  it("multi-day streak ending yesterday (no completions today yet)", async () => {
    await prisma.dailySummary.createMany({
      data: [
        { date: makeDate(1), tasks_completed: 2, streak: 0 },
        { date: makeDate(2), tasks_completed: 1, streak: 0 },
        { date: makeDate(3), tasks_completed: 1, streak: 0 },
      ],
    });
    expect(await calculateStreak()).toBe(3);
  });

  it("broken streak (gap day)", async () => {
    await prisma.dailySummary.createMany({
      data: [
        { date: makeDate(0), tasks_completed: 1, streak: 0 },
        { date: makeDate(2), tasks_completed: 1, streak: 0 },
        { date: makeDate(3), tasks_completed: 1, streak: 0 },
      ],
    });
    // Day 1 is a gap, so streak resets to 1 (just today)
    expect(await calculateStreak()).toBe(1);
  });

  it("broken streak (last completion was 2+ days ago)", async () => {
    await prisma.dailySummary.create({
      data: { date: makeDate(3), tasks_completed: 1, streak: 0 },
    });
    expect(await calculateStreak()).toBe(0);
  });

  it("zero tasks_completed does not count as a streak day", async () => {
    await prisma.dailySummary.createMany({
      data: [
        { date: makeDate(0), tasks_completed: 1, streak: 0 },
        { date: makeDate(1), tasks_completed: 0, streak: 0 },
        { date: makeDate(2), tasks_completed: 1, streak: 0 },
      ],
    });
    expect(await calculateStreak()).toBe(1);
  });
});
