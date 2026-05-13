import { prisma } from "./prisma";
import { startOfUtcDay, addDays } from "./date";

export async function getRewards() {
  return await prisma.reward.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createReward(data: {
  title: string;
  pointCost: number;
  type?: string;
  rewardDuration?: string;
  expiresAt?: Date;
}) {
  return await prisma.reward.create({
    data: {
      title: data.title,
      point_cost: data.pointCost,
      type: data.type ?? "points",
      reward_duration: data.rewardDuration ?? "min15",
      expiresAt: data.expiresAt,
    },
  });
}

export async function updateReward(
  id: number,
  data: {
    title?: string;
    pointCost?: number;
    type?: string;
    rewardDuration?: string;
    expiresAt?: Date | null;
  }
) {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.pointCost !== undefined) updateData.point_cost = data.pointCost;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.rewardDuration !== undefined) updateData.reward_duration = data.rewardDuration;
  if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;
  return await prisma.reward.update({
    where: { id },
    data: updateData,
  });
}

export async function deleteReward(id: number) {
  return await prisma.reward.delete({ where: { id } });
}

export async function getTodayPoints() {
  const today = startOfUtcDay();
  const summary = await prisma.dailySummary.findUnique({ where: { date: today } });
  return summary?.points_earned ?? 0;
}

export async function getTodaySpent() {
  const today = startOfUtcDay();
  const summary = await prisma.dailySummary.findUnique({ where: { date: today } });
  return summary?.points_spent ?? 0;
}

export async function getActiveCountToday() {
  const today = startOfUtcDay();
  const tomorrow = addDays(today, 1);
  return await prisma.reward.count({
    where: {
      status: "active",
      activatedAt: { gte: today, lt: tomorrow },
    },
  });
}

export async function activateReward(id: number) {
  // Run all reads + writes in a single transaction so the activation check
  // (active count, current status, available points) and the subsequent
  // mutations are consistent — without this, on platforms with looser SQLite
  // snapshot semantics the just-created reward can be missed by findUnique
  // and we wrongly return { error: "not_available" }.
  return await prisma.$transaction(async (tx) => {
    const today = startOfUtcDay();

    const activeCount = await tx.reward.count({
      where: {
        status: "active",
        activatedAt: { gte: today },
      },
    });
    if (activeCount >= 2) {
      return { error: "max_active" as const };
    }

    const reward = await tx.reward.findUnique({ where: { id } });
    if (!reward || reward.status !== "available") {
      return { error: "not_available" as const };
    }

    const todaySummary = await tx.dailySummary.findUnique({ where: { date: today } });
    const earned = todaySummary?.points_earned ?? 0;
    const spent = todaySummary?.points_spent ?? 0;
    const available = earned - spent;

    if (available < reward.point_cost) {
      return { error: "insufficient_points" as const };
    }

    const updated = await tx.reward.update({
      where: { id },
      data: {
        status: "active",
        activatedAt: new Date(),
        expiresAt: reward.expiresAt ?? new Date(Date.now() + 7 * 86400000),
      },
    });

    await tx.dailySummary.upsert({
      where: { date: today },
      create: { date: today, points_spent: reward.point_cost },
      update: { points_spent: { increment: reward.point_cost } },
    });

    return { reward: updated };
  });
}

export async function expireRewards() {
  const now = new Date();
  // Small buffer to handle microsecond timing differences
  const cutoff = new Date(now.getTime() - 100);
  const expired = await prisma.reward.updateMany({
    where: {
      status: "active",
      expiresAt: { lt: cutoff },
    },
    data: { status: "expired" },
  });
  return expired.count;
}
