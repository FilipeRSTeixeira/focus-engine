import { describe, it, expect } from "vitest";
import {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_BY_KEY,
  evaluateAchievements,
  type AchievementStats,
} from "./achievements";

const baseStats = (): AchievementStats => ({
  totalTasksCompleted: 0,
  hardTasksCompleted: 0,
  totalPointsEarned: 0,
  currentLevel: 1,
  longestStreak: 0,
  rewardsActivated: 0,
  focusSessionsCompleted: 0,
  projectsCount: 0,
  morningTasksToday: 0,
  longestPendingTaskDays: 0,
  hasNightOwlTask: false,
});

describe("ACHIEVEMENT_CATALOG", () => {
  it("has unique keys", () => {
    const keys = ACHIEVEMENT_CATALOG.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has non-empty titles and descriptions", () => {
    for (const a of ACHIEVEMENT_CATALOG) {
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(0);
      expect(a.icon.length).toBeGreaterThan(0);
    }
  });

  it("ACHIEVEMENT_BY_KEY maps every entry", () => {
    expect(Object.keys(ACHIEVEMENT_BY_KEY).length).toBe(ACHIEVEMENT_CATALOG.length);
    for (const a of ACHIEVEMENT_CATALOG) {
      expect(ACHIEVEMENT_BY_KEY[a.key]).toBe(a);
    }
  });
});

describe("evaluateAchievements", () => {
  it("returns no unlocks at base stats", () => {
    expect(evaluateAchievements(baseStats())).toEqual([]);
  });

  it("unlocks first_task at 1 completed task", () => {
    const s = baseStats();
    s.totalTasksCompleted = 1;
    expect(evaluateAchievements(s)).toContain("first_task");
  });

  it("unlocks streak tiers cumulatively", () => {
    const s = baseStats();
    s.longestStreak = 14;
    const keys = evaluateAchievements(s);
    expect(keys).toContain("streak_3");
    expect(keys).toContain("streak_7");
    expect(keys).toContain("streak_14");
    expect(keys).not.toContain("streak_30");
  });

  it("unlocks point milestones cumulatively", () => {
    const s = baseStats();
    s.totalPointsEarned = 1500;
    const keys = evaluateAchievements(s);
    expect(keys).toContain("points_100");
    expect(keys).toContain("points_500");
    expect(keys).toContain("points_1000");
    expect(keys).not.toContain("points_5000");
  });

  it("unlocks level tiers cumulatively", () => {
    const s = baseStats();
    s.currentLevel = 15;
    const keys = evaluateAchievements(s);
    expect(keys).toContain("level_5");
    expect(keys).toContain("level_10");
    expect(keys).not.toContain("level_20");
  });

  it("unlocks early_bird at 3 morning tasks", () => {
    const s = baseStats();
    s.morningTasksToday = 3;
    expect(evaluateAchievements(s)).toContain("early_bird");
    s.morningTasksToday = 2;
    expect(evaluateAchievements(s)).not.toContain("early_bird");
  });

  it("unlocks night_owl with flag", () => {
    const s = baseStats();
    s.hasNightOwlTask = true;
    expect(evaluateAchievements(s)).toContain("night_owl");
  });

  it("unlocks procrastination_winner at 14+ days pending", () => {
    const s = baseStats();
    s.longestPendingTaskDays = 14;
    expect(evaluateAchievements(s)).toContain("procrastination_winner");
    s.longestPendingTaskDays = 13;
    expect(evaluateAchievements(s)).not.toContain("procrastination_winner");
  });

  it("unlocks the full hard-task ladder", () => {
    const s = baseStats();
    s.hardTasksCompleted = 25;
    const keys = evaluateAchievements(s);
    expect(keys).toContain("first_hard_task");
    expect(keys).toContain("hard_worker");
    expect(keys).toContain("hard_dedicated");
  });

  it("unlocks rewards tier from activations", () => {
    const s = baseStats();
    s.rewardsActivated = 10;
    const keys = evaluateAchievements(s);
    expect(keys).toContain("first_reward");
    expect(keys).toContain("ten_rewards");
  });

  it("unlocks focus_master and project_creator at thresholds", () => {
    const s = baseStats();
    s.focusSessionsCompleted = 25;
    s.projectsCount = 5;
    const keys = evaluateAchievements(s);
    expect(keys).toContain("focus_master");
    expect(keys).toContain("project_creator");
  });

  it("a maxed-out stat block unlocks every achievement", () => {
    const s: AchievementStats = {
      totalTasksCompleted: 1000,
      hardTasksCompleted: 1000,
      totalPointsEarned: 100000,
      currentLevel: 50,
      longestStreak: 365,
      rewardsActivated: 100,
      focusSessionsCompleted: 1000,
      projectsCount: 50,
      morningTasksToday: 10,
      longestPendingTaskDays: 100,
      hasNightOwlTask: true,
    };
    const keys = evaluateAchievements(s);
    expect(keys.length).toBe(ACHIEVEMENT_CATALOG.length);
  });
});
