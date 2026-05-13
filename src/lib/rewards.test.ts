import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "./prisma";
import {
  createReward,
  activateReward,
  getTodayPoints,
  getTodaySpent,
  getActiveCountToday,
} from "./rewards";

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

describe("rewards", () => {
  beforeEach(resetDb);

  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  async function seedPoints(amount: number) {
    // UTC midnight — production rewards code reads DailySummary keyed by
    // startOfUtcDay(), so seeded local-midnight rows wouldn't be found.
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
    );
    await prisma.dailySummary.upsert({
      where: { date: today },
      create: { date: today, points_earned: amount, points_spent: 0 },
      update: { points_earned: amount, points_spent: 0 },
    });
  }

  it("creates a reward", async () => {
    const r = await createReward({ title: "Break", pointCost: 10, rewardDuration: "min15" });
    expect(r.title).toBe("Break");
    expect(r.point_cost).toBe(10);
    expect(r.status).toBe("available");
  });

  it("activates a reward when enough points", async () => {
    await seedPoints(20);
    const r = await createReward({ title: "Coffee", pointCost: 10 });

    const result = await activateReward(r.id);
    expect(result).not.toHaveProperty("error");
    expect((result as any).reward.status).toBe("active");
    expect((result as any).reward.activatedAt).toBeDefined();

    const spent = await getTodaySpent();
    expect(spent).toBe(10);
  });

  it("blocks activation when insufficient points", async () => {
    await seedPoints(5);
    const r = await createReward({ title: "Movie", pointCost: 10 });

    const result = await activateReward(r.id);
    expect(result).toHaveProperty("error", "insufficient_points");
  });

  it("blocks activation when max 2 active rewards reached", async () => {
    await seedPoints(100);
    const r1 = await createReward({ title: "Reward 1", pointCost: 10 });
    const r2 = await createReward({ title: "Reward 2", pointCost: 10 });
    const r3 = await createReward({ title: "Reward 3", pointCost: 10 });

    await activateReward(r1.id);
    await activateReward(r2.id);

    const result = await activateReward(r3.id);
    expect(result).toHaveProperty("error", "max_active");
  });

  it("points never go negative", async () => {
    await seedPoints(5);
    const r = await createReward({ title: "Expensive", pointCost: 10 });

    const result = await activateReward(r.id);
    expect(result).toHaveProperty("error", "insufficient_points");

    const earned = await getTodayPoints();
    const spent = await getTodaySpent();
    expect(earned - spent).toBe(5);
  });

  it("getActiveCountToday returns correct count", async () => {
    await seedPoints(100);
    const r1 = await createReward({ title: "A", pointCost: 5 });
    const r2 = await createReward({ title: "B", pointCost: 5 });
    await activateReward(r1.id);

    expect(await getActiveCountToday()).toBe(1);

    await activateReward(r2.id);
    expect(await getActiveCountToday()).toBe(2);
  });

  it("cannot activate already active reward", async () => {
    await seedPoints(100);
    const r = await createReward({ title: "Repeat", pointCost: 5 });
    await activateReward(r.id);

    const result = await activateReward(r.id);
    expect(result).toHaveProperty("error", "not_available");
  });
});
