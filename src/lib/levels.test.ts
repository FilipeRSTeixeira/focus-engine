import { describe, it, expect } from "vitest";
import { xpForLevel, getLevelFromXp, getLevelInfo } from "./levels";

describe("xpForLevel", () => {
  it("returns 0 at level 1", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(0)).toBe(0);
    expect(xpForLevel(-5)).toBe(0);
  });

  it("matches expected progression", () => {
    expect(xpForLevel(2)).toBe(50);
    expect(xpForLevel(3)).toBe(150);
    expect(xpForLevel(4)).toBe(300);
    expect(xpForLevel(5)).toBe(500);
    expect(xpForLevel(10)).toBe(2250);
    expect(xpForLevel(20)).toBe(9500);
    expect(xpForLevel(30)).toBe(21750);
  });

  it("xpForLevel(N+1) is strictly greater than xpForLevel(N)", () => {
    for (let n = 1; n < 50; n++) {
      expect(xpForLevel(n + 1)).toBeGreaterThan(xpForLevel(n));
    }
  });
});

describe("getLevelFromXp", () => {
  it("returns 1 for low XP", () => {
    expect(getLevelFromXp(0)).toBe(1);
    expect(getLevelFromXp(49)).toBe(1);
  });

  it("returns the right level at exact thresholds", () => {
    expect(getLevelFromXp(50)).toBe(2);
    expect(getLevelFromXp(150)).toBe(3);
    expect(getLevelFromXp(300)).toBe(4);
    expect(getLevelFromXp(500)).toBe(5);
  });

  it("returns the lower level just before the threshold", () => {
    expect(getLevelFromXp(149)).toBe(2);
    expect(getLevelFromXp(299)).toBe(3);
    expect(getLevelFromXp(499)).toBe(4);
  });

  it("is the inverse of xpForLevel for whole levels", () => {
    for (let n = 1; n <= 50; n++) {
      expect(getLevelFromXp(xpForLevel(n))).toBe(n);
    }
  });
});

describe("getLevelInfo", () => {
  it("reports newcomer tier for low XP", () => {
    const info = getLevelInfo(0);
    expect(info.level).toBe(1);
    expect(info.tier).toBe("Newcomer");
    expect(info.totalXp).toBe(0);
    expect(info.xpInLevel).toBe(0);
    expect(info.xpForCurrentLevel).toBe(50);
    expect(info.xpToNext).toBe(50);
    expect(info.progress).toBe(0);
  });

  it("computes mid-level progress correctly", () => {
    // 100 XP: level 2 (base 50), level-3 threshold = 150
    const info = getLevelInfo(100);
    expect(info.level).toBe(2);
    expect(info.xpInLevel).toBe(50);
    expect(info.xpForCurrentLevel).toBe(100); // 150 - 50
    expect(info.xpToNext).toBe(50);
    expect(info.progress).toBeCloseTo(0.5);
  });

  it("rounds progress within 0..1", () => {
    expect(getLevelInfo(50).progress).toBe(0);
    expect(getLevelInfo(149).progress).toBeCloseTo(0.99);
  });

  it("walks through all tiers", () => {
    expect(getLevelInfo(0).tier).toBe("Newcomer");
    expect(getLevelInfo(xpForLevel(3)).tier).toBe("Apprentice");
    expect(getLevelInfo(xpForLevel(6)).tier).toBe("Adept");
    expect(getLevelInfo(xpForLevel(10)).tier).toBe("Expert");
    expect(getLevelInfo(xpForLevel(15)).tier).toBe("Master");
    expect(getLevelInfo(xpForLevel(20)).tier).toBe("Grandmaster");
    expect(getLevelInfo(xpForLevel(30)).tier).toBe("Legend");
  });

  it("clamps negative XP to 0", () => {
    const info = getLevelInfo(-100);
    expect(info.totalXp).toBe(0);
    expect(info.level).toBe(1);
  });

  it("floors fractional XP", () => {
    const info = getLevelInfo(150.7);
    expect(info.totalXp).toBe(150);
    expect(info.level).toBe(3);
  });
});
