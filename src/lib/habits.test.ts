import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "./prisma";
import {
  computeWeekProgress,
  createHabit,
  updateHabit,
  deleteHabit,
  logHabit,
  getHabitsWithProgress,
  getHabitsWeekSummary,
} from "./habits";
import { startOfUtcDay, startOfIsoWeek, addDays } from "./date";

async function resetDb() {
  await prisma.dailySummary.deleteMany();
  await prisma.habitLog.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.setting.deleteMany();
}

describe("habits — pure progress logic", () => {
  // Anchor a Wednesday so we always have 3 prior days + today in the week.
  // Use UTC explicitly so the week boundary is deterministic regardless of
  // the host timezone.
  const wednesday = new Date(Date.UTC(2026, 4, 13, 0, 0, 0, 0)); // 2026-05-13 (Wed)
  const weekStart = startOfIsoWeek(wednesday); // 2026-05-11 (Mon)

  it("daily cadence: counts days where value met the daily target", () => {
    const habit = {
      cadence: "daily",
      daily_target: 20,
      weekly_days_target: 7,
      weekly_target: null,
    };
    const logs = [
      { date: addDays(weekStart, 0), value: 25 }, // Mon — hit
      { date: addDays(weekStart, 1), value: 10 }, // Tue — miss
      { date: addDays(weekStart, 2), value: 20 }, // Wed — hit (exact)
    ];
    const p = computeWeekProgress(habit, logs, startOfUtcDay(wednesday));
    expect(p.daysMet).toBe(2);
    expect(p.percent).toBe(Math.round((2 / 7) * 100));
    expect(p.todayValue).toBe(20);
    expect(p.todayDone).toBe(true);
    expect(p.weekHit).toBe(false);
  });

  it("daily cadence: percent caps at 100", () => {
    const habit = {
      cadence: "daily",
      daily_target: 1,
      weekly_days_target: 3,
      weekly_target: null,
    };
    const logs = [
      { date: addDays(weekStart, 0), value: 1 },
      { date: addDays(weekStart, 1), value: 1 },
      { date: addDays(weekStart, 2), value: 1 },
      { date: addDays(weekStart, 3), value: 1 },
    ];
    const p = computeWeekProgress(habit, logs, startOfUtcDay(wednesday));
    expect(p.daysMet).toBe(4);
    expect(p.percent).toBe(100);
    expect(p.weekHit).toBe(true);
  });

  it("weekly cadence: sums values against weekly_target", () => {
    const habit = {
      cadence: "weekly",
      daily_target: null,
      weekly_days_target: 7,
      weekly_target: 150,
    };
    const logs = [
      { date: addDays(weekStart, 0), value: 45 },
      { date: addDays(weekStart, 2), value: 60 },
    ];
    const p = computeWeekProgress(habit, logs, startOfUtcDay(wednesday));
    expect(p.weekTotal).toBe(105);
    expect(p.percent).toBe(70);
    expect(p.weekHit).toBe(false);
  });

  it("weekly cadence: hits 100 when sum >= target", () => {
    const habit = {
      cadence: "weekly",
      daily_target: null,
      weekly_days_target: 7,
      weekly_target: 100,
    };
    const logs = [{ date: addDays(weekStart, 0), value: 100 }];
    const p = computeWeekProgress(habit, logs, startOfUtcDay(wednesday));
    expect(p.percent).toBe(100);
    expect(p.weekHit).toBe(true);
  });

  it("empty week returns 0%", () => {
    const habit = {
      cadence: "daily",
      daily_target: 1,
      weekly_days_target: 7,
      weekly_target: null,
    };
    const p = computeWeekProgress(habit, [], startOfUtcDay(wednesday));
    expect(p.percent).toBe(0);
    expect(p.todayDone).toBe(false);
  });
});

describe("habits — CRUD + logging (DB)", () => {
  beforeEach(resetDb);

  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  it("creates, updates and deletes a habit", async () => {
    const h = await createHabit({
      name: "Sample habit A",
      cadence: "daily",
      dailyTarget: 10,
      unit: "min",
      dailyPoints: 4,
    });
    expect(h.name).toBe("Sample habit A");
    expect(h.cadence).toBe("daily");
    expect(h.daily_target).toBe(10);

    const upd = await updateHabit(h.id, { name: "Sample habit A renamed", dailyTarget: 15 });
    expect(upd.name).toBe("Sample habit A renamed");
    expect(upd.daily_target).toBe(15);

    await deleteHabit(h.id);
    const after = await prisma.habit.findUnique({ where: { id: h.id } });
    expect(after).toBeNull();
  });

  it("rejects empty name", async () => {
    await expect(createHabit({ name: "   " })).rejects.toThrow();
  });

  it("daily cadence: credits daily_points only on the transition to 'hit'", async () => {
    const h = await createHabit({
      name: "Sample daily",
      cadence: "daily",
      dailyTarget: 20,
      dailyPoints: 5,
    });

    // First log below target — no points
    const r1 = await logHabit(h.id, 10);
    expect(r1.pointsAwardedToday).toBe(0);

    // Cross the threshold — credit 5
    const r2 = await logHabit(h.id, 25);
    expect(r2.pointsAwardedToday).toBe(5);

    // Increase further — no extra credit
    const r3 = await logHabit(h.id, 40);
    expect(r3.pointsAwardedToday).toBe(0);

    // Verify DailySummary saw a single 5-point credit
    const today = startOfUtcDay();
    const summary = await prisma.dailySummary.findUnique({ where: { date: today } });
    expect(summary?.points_earned).toBe(5);
  });

  it("weekly cadence: credits daily_points only on first non-zero log of the day", async () => {
    const h = await createHabit({
      name: "Sample weekly",
      cadence: "weekly",
      weeklyTarget: 100,
      dailyPoints: 3,
    });

    const r1 = await logHabit(h.id, 10);
    expect(r1.pointsAwardedToday).toBe(3);

    const r2 = await logHabit(h.id, 25);
    expect(r2.pointsAwardedToday).toBe(0);

    const today = startOfUtcDay();
    const summary = await prisma.dailySummary.findUnique({ where: { date: today } });
    expect(summary?.points_earned).toBe(3);
  });

  it("awards weekly bonus exactly once when the week first hits 100%", async () => {
    const h = await createHabit({
      name: "Sample weekly bonus",
      cadence: "weekly",
      weeklyTarget: 50,
      dailyPoints: 2,
      weeklyBonusPoints: 10,
    });

    // First non-zero log: 2 daily points.
    const r1 = await logHabit(h.id, 20);
    expect(r1.weeklyBonusAwarded).toBe(0);
    expect(r1.pointsAwardedToday).toBe(2);

    // Cross 50 — should award the 10 bonus.
    const r2 = await logHabit(h.id, 60);
    expect(r2.weeklyBonusAwarded).toBe(10);

    // Further updates within the same week never re-award.
    const r3 = await logHabit(h.id, 80);
    expect(r3.weeklyBonusAwarded).toBe(0);

    const today = startOfUtcDay();
    const summary = await prisma.dailySummary.findUnique({ where: { date: today } });
    // 2 (daily) + 10 (bonus) = 12
    expect(summary?.points_earned).toBe(12);
  });

  it("getHabitsWithProgress reflects the week so far", async () => {
    const h = await createHabit({
      name: "Sample tracker",
      cadence: "daily",
      dailyTarget: 1,
      dailyPoints: 1,
    });
    await logHabit(h.id, 1);

    const list = await getHabitsWithProgress();
    const target = list.find((x) => x.id === h.id);
    expect(target).toBeDefined();
    expect(target!.weekProgress.todayDone).toBe(true);
    expect(target!.weekProgress.daysMet).toBe(1);
  });

  it("getHabitsWeekSummary aggregates active habits", async () => {
    const a = await createHabit({
      name: "Sample A",
      cadence: "daily",
      dailyTarget: 1,
      dailyPoints: 2,
    });
    const b = await createHabit({
      name: "Sample B",
      cadence: "daily",
      dailyTarget: 1,
      dailyPoints: 2,
    });
    await logHabit(a.id, 1);
    await logHabit(b.id, 0); // not a hit

    const sum = await getHabitsWeekSummary();
    expect(sum.totalHabits).toBe(2);
    expect(sum.dailyHitsToday).toBe(1);
  });
});
