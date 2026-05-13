import { describe, it, expect } from "vitest";
import {
  calculatePoints,
  calculatePointsEnhanced,
  getPriorityBase,
  procrastinationTier,
  streakBonusPercent,
  isMorningCompletion,
  MORNING_BONUS_DAILY_CAP,
  HARD_BONUS_DAILY_CAP,
} from "./points";

describe("getPriorityBase", () => {
  it("returns 10 for high", () => {
    expect(getPriorityBase("high")).toBe(10);
  });

  it("returns 5 for medium", () => {
    expect(getPriorityBase("medium")).toBe(5);
  });

  it("returns 3 for low", () => {
    expect(getPriorityBase("low")).toBe(3);
  });

  it("returns 0 for unknown priority", () => {
    expect(getPriorityBase("unknown")).toBe(0);
  });
});

describe("calculatePoints (legacy)", () => {
  it("matches roadmap example: high + 3 days = 13", () => {
    expect(calculatePoints("high", 3)).toBe(13);
  });

  it("calculates correctly for all priorities at 0 days", () => {
    expect(calculatePoints("high", 0)).toBe(10);
    expect(calculatePoints("medium", 0)).toBe(5);
    expect(calculatePoints("low", 0)).toBe(3);
  });

  it("calculates correctly for all priorities at 14 days", () => {
    expect(calculatePoints("high", 14)).toBe(24);
    expect(calculatePoints("medium", 14)).toBe(19);
    expect(calculatePoints("low", 14)).toBe(17);
  });

  it("calculates correctly for all priorities at 7 days", () => {
    expect(calculatePoints("high", 7)).toBe(17);
    expect(calculatePoints("medium", 7)).toBe(12);
    expect(calculatePoints("low", 7)).toBe(10);
  });

  it("throws on negative daysPending", () => {
    expect(() => calculatePoints("high", -1)).toThrow("daysPending cannot be negative");
  });

  it("handles large day counts", () => {
    expect(calculatePoints("high", 100)).toBe(110);
    expect(calculatePoints("low", 365)).toBe(368);
  });
});

describe("procrastinationTier", () => {
  it("returns 0 for fresh tasks", () => {
    expect(procrastinationTier(0)).toBe(0);
    expect(procrastinationTier(3)).toBe(0);
  });

  it("returns 0.5 for 4-7 days", () => {
    expect(procrastinationTier(4)).toBe(0.5);
    expect(procrastinationTier(7)).toBe(0.5);
  });

  it("returns 1.0 for 8+ days", () => {
    expect(procrastinationTier(8)).toBe(1.0);
    expect(procrastinationTier(30)).toBe(1.0);
  });
});

describe("streakBonusPercent", () => {
  it("returns 0 before day 7", () => {
    expect(streakBonusPercent(0)).toBe(0);
    expect(streakBonusPercent(6)).toBe(0);
  });

  it("returns 0.10 at day 7", () => {
    expect(streakBonusPercent(7)).toBeCloseTo(0.1);
  });

  it("grows +1% per day after day 7", () => {
    expect(streakBonusPercent(10)).toBeCloseTo(0.13);
    expect(streakBonusPercent(17)).toBeCloseTo(0.2);
  });

  it("caps at 0.30 from day 27 onward", () => {
    expect(streakBonusPercent(27)).toBeCloseTo(0.3);
    expect(streakBonusPercent(100)).toBeCloseTo(0.3);
  });
});

describe("calculatePointsEnhanced", () => {
  it("matches legacy formula when no bonuses fire", () => {
    const r = calculatePointsEnhanced({ priority: "high", daysPending: 3 });
    expect(r.total).toBe(13); // 10 base + 3 days, same as calculatePoints("high", 3)
    expect(r.base).toBe(10);
    expect(r.daysPending).toBe(3);
    expect(r.procrastinationBonus).toBe(0);
    expect(r.streakBonus).toBe(0);
    expect(r.morningBonus).toBe(0);
    expect(r.hardBonus).toBe(0);
  });

  it("adds procrastination bonus once daysPending crosses 3", () => {
    const r = calculatePointsEnhanced({ priority: "high", daysPending: 5 });
    // base=10, days=5, procrastination = round(10 * 0.5) = 5 → 20
    expect(r.procrastinationBonus).toBe(5);
    expect(r.total).toBe(20);
  });

  it("doubles procrastination bonus past 7 days", () => {
    const r = calculatePointsEnhanced({ priority: "high", daysPending: 10 });
    // base=10, days=10, procrastination = round(10 * 1.0) = 10 → 30
    expect(r.procrastinationBonus).toBe(10);
    expect(r.total).toBe(30);
  });

  it("adds streak bonus from day 7", () => {
    const r = calculatePointsEnhanced({ priority: "medium", daysPending: 0, streakDays: 7 });
    // base=5, streak = round(5 * 0.10) = 1 → 6
    expect(r.streakBonus).toBe(1);
    expect(r.total).toBe(6);
  });

  it("caps streak bonus at +30%", () => {
    const r = calculatePointsEnhanced({ priority: "high", daysPending: 0, streakDays: 100 });
    // base=10, streak = round(10 * 0.30) = 3 → 13
    expect(r.streakBonus).toBe(3);
    expect(r.total).toBe(13);
  });

  it("adds morning bonus only when eligible and under daily cap", () => {
    const r1 = calculatePointsEnhanced({
      priority: "high",
      daysPending: 0,
      completedBeforeMorningCutoff: true,
      morningTasksAlreadyToday: 0,
    });
    // base=10, morning = round(10 * 0.2) = 2 → 12
    expect(r1.morningBonus).toBe(2);

    const r2 = calculatePointsEnhanced({
      priority: "high",
      daysPending: 0,
      completedBeforeMorningCutoff: true,
      morningTasksAlreadyToday: MORNING_BONUS_DAILY_CAP, // cap reached
    });
    expect(r2.morningBonus).toBe(0);

    const r3 = calculatePointsEnhanced({
      priority: "high",
      daysPending: 0,
      completedBeforeMorningCutoff: false,
      morningTasksAlreadyToday: 0,
    });
    expect(r3.morningBonus).toBe(0);
  });

  it("adds hard bonus only when isHard and under daily cap", () => {
    const r1 = calculatePointsEnhanced({
      priority: "high",
      daysPending: 0,
      isHard: true,
      hardTasksAlreadyToday: 0,
    });
    // base=10, hard = round(10 * 0.3) = 3 → 13
    expect(r1.hardBonus).toBe(3);

    const r2 = calculatePointsEnhanced({
      priority: "high",
      daysPending: 0,
      isHard: true,
      hardTasksAlreadyToday: HARD_BONUS_DAILY_CAP,
    });
    expect(r2.hardBonus).toBe(0);

    const r3 = calculatePointsEnhanced({
      priority: "high",
      daysPending: 0,
      isHard: false,
      hardTasksAlreadyToday: 0,
    });
    expect(r3.hardBonus).toBe(0);
  });

  it("stacks all bonuses additively (no compounding)", () => {
    const r = calculatePointsEnhanced({
      priority: "high",
      daysPending: 10,
      streakDays: 15,
      completedBeforeMorningCutoff: true,
      morningTasksAlreadyToday: 0,
      isHard: true,
      hardTasksAlreadyToday: 0,
    });
    // base=10, days=10
    // procrastination = round(10 * 1.0) = 10
    // streak = round(10 * (0.1 + 8*0.01)) = round(10 * 0.18) = 2
    // morning = round(10 * 0.2) = 2
    // hard = round(10 * 0.3) = 3
    // total = 10 + 10 + 10 + 2 + 2 + 3 = 37
    expect(r.procrastinationBonus).toBe(10);
    expect(r.streakBonus).toBe(2);
    expect(r.morningBonus).toBe(2);
    expect(r.hardBonus).toBe(3);
    expect(r.total).toBe(37);
  });

  it("throws on negative daysPending", () => {
    expect(() =>
      calculatePointsEnhanced({ priority: "high", daysPending: -1 })
    ).toThrow("daysPending cannot be negative");
  });

  it("returns 0 base for unknown priority but still adds days", () => {
    const r = calculatePointsEnhanced({ priority: "wat", daysPending: 4 });
    expect(r.base).toBe(0);
    expect(r.daysPending).toBe(4);
    // procrastination bonus = round(0 * 0.5) = 0
    expect(r.procrastinationBonus).toBe(0);
    expect(r.total).toBe(4);
  });
});

describe("isMorningCompletion", () => {
  it("returns true for hours before cutoff", () => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    expect(isMorningCompletion(d)).toBe(true);
    d.setHours(10, 59, 59, 999);
    expect(isMorningCompletion(d)).toBe(true);
  });

  it("returns false at and after cutoff", () => {
    const d = new Date();
    d.setHours(11, 0, 0, 0);
    expect(isMorningCompletion(d)).toBe(false);
    d.setHours(18, 0, 0, 0);
    expect(isMorningCompletion(d)).toBe(false);
  });
});
