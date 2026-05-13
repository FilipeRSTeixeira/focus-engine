import { prisma } from "./prisma";

/**
 * Level / XP progression.
 *
 * "XP" here is just the cumulative `points_earned` across the user's
 * DailySummary history. We never store the level itself — it's always derived
 * from total XP so that any past adjustments stay coherent.
 *
 * Progression formula: cumulative XP required to *reach* level N is
 *   xpForLevel(N) = 25 * N * (N - 1)
 *
 * Examples:
 *   L1 → 0 XP
 *   L2 → 50 XP
 *   L3 → 150 XP
 *   L4 → 300 XP
 *   L5 → 500 XP
 *   L10 → 2250 XP
 *   L20 → 9500 XP
 *   L30 → 21750 XP
 *
 * Picked so that an active user earning ~100 FP/day reaches L5 in about a
 * week and L10 in about three weeks — enough drama early on, but L20+
 * actually feels earned.
 */

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 25 * level * (level - 1);
}

export type LevelInfo = {
  level: number;
  /** Tier name (Newcomer / Apprentice / ... / Legend). */
  tier: string;
  /** Hex color associated with the tier — used by the UI progress bar. */
  color: string;
  /** Total XP the user currently has. */
  totalXp: number;
  /** XP accumulated within the current level (totalXp - xpForLevel(level)). */
  xpInLevel: number;
  /** XP required to span the entire current level (xpForLevel(level+1) - xpForLevel(level)). */
  xpForCurrentLevel: number;
  /** XP still needed to reach the next level (or 0 at max level — unbounded here). */
  xpToNext: number;
  /** Fractional progress within the current level, 0..1. */
  progress: number;
};

const TIERS: { minLevel: number; tier: string; color: string }[] = [
  { minLevel: 30, tier: "Legend", color: "#ef4444" },
  { minLevel: 20, tier: "Grandmaster", color: "#f59e0b" },
  { minLevel: 15, tier: "Master", color: "#a855f7" },
  { minLevel: 10, tier: "Expert", color: "#6366f1" },
  { minLevel: 6, tier: "Adept", color: "#3b82f6" },
  { minLevel: 3, tier: "Apprentice", color: "#22c55e" },
  { minLevel: 1, tier: "Newcomer", color: "#71717a" },
];

function tierFor(level: number): { tier: string; color: string } {
  for (const t of TIERS) {
    if (level >= t.minLevel) return { tier: t.tier, color: t.color };
  }
  return { tier: TIERS[TIERS.length - 1].tier, color: TIERS[TIERS.length - 1].color };
}

/** Returns the level reached with `totalXp` XP. Inverse of xpForLevel. */
export function getLevelFromXp(totalXp: number): number {
  if (totalXp < 50) return 1;
  // Solve xp = 25 * L * (L - 1)  →  L = (1 + sqrt(1 + 4*xp/25)) / 2
  const n = (1 + Math.sqrt(1 + (4 * totalXp) / 25)) / 2;
  return Math.max(1, Math.floor(n));
}

/** Computes full level info from a raw XP value. Pure function (no IO). */
export function getLevelInfo(totalXp: number): LevelInfo {
  const safe = Math.max(0, Math.floor(totalXp));
  const level = getLevelFromXp(safe);
  const baseXp = xpForLevel(level);
  const nextXp = xpForLevel(level + 1);
  const xpForCurrentLevel = nextXp - baseXp;
  const xpInLevel = safe - baseXp;
  const xpToNext = nextXp - safe;
  const progress = xpForCurrentLevel === 0 ? 0 : xpInLevel / xpForCurrentLevel;
  const { tier, color } = tierFor(level);

  return {
    level,
    tier,
    color,
    totalXp: safe,
    xpInLevel,
    xpForCurrentLevel,
    xpToNext,
    progress: Math.min(1, Math.max(0, progress)),
  };
}

/**
 * Sums `points_earned` across all DailySummary rows. This is the "lifetime"
 * XP figure used to derive level. We deliberately do NOT subtract
 * `points_spent` — spending pts on rewards shouldn't make you level down,
 * the spent amount only affects the "available" balance shown elsewhere.
 */
export async function getTotalEarnedPoints(): Promise<number> {
  const agg = await prisma.dailySummary.aggregate({
    _sum: { points_earned: true },
  });
  return agg._sum.points_earned ?? 0;
}

export async function getCurrentLevelInfo(): Promise<LevelInfo> {
  const xp = await getTotalEarnedPoints();
  return getLevelInfo(xp);
}
