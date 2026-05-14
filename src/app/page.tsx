"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Gift,
  ArrowRight,
  Timer,
  ListTodo,
  NotebookPen,
  Award,
  Sparkles,
  Star,
  Flame,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Skeleton } from "@/components/skeleton";
import { CircleCheckbox } from "@/components/circle-checkbox";
import { AnimatedNumber } from "@/components/animated-number";
import { listContainer, listRow, hud } from "@/lib/motion";
import { playTink } from "@/lib/sound";

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

type LevelInfo = {
  level: number;
  tier: string;
  color: string;
  totalXp: number;
  xpInLevel: number;
  xpForCurrentLevel: number;
  xpToNext: number;
  progress: number;
};

type Achievement = {
  id: number;
  key: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
};

type PendingTask = {
  id: number;
  title: string;
  priority: string;
  dueDate: string | null;
  project: { id: number; name: string; color: string } | null;
};

type HabitsWeek = {
  totalHabits: number;
  dailyHitsToday: number;
  averagePercent: number;
  pointsThisWeek: number;
};

type DashboardData = {
  points: number;
  streak: number;
  yesterdayCompleted: number;
  yesterdayTasks: {
    title: string;
    project?: { name: string; color: string } | null;
  }[];
  unlockedRewards: {
    id: number;
    title: string;
    point_cost: number;
    reward_duration: string;
  }[];
  pendingTasks: number;
  topPendingTasks: PendingTask[];
  level: LevelInfo;
  recentAchievements: Achievement[];
  habitsWeek: HabitsWeek | null;
};

const DEFAULT_LEVEL: LevelInfo = {
  level: 1,
  tier: "Newcomer",
  color: "#8E8E93",
  totalXp: 0,
  xpInLevel: 0,
  xpForCurrentLevel: 50,
  xpToNext: 50,
  progress: 0,
};

const PRIORITY_DOT: Record<string, string> = {
  high: "#FF3B30",
  medium: "#FF9500",
  low: "#8E8E93",
};

function greeting(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 19) return "Good afternoon";
  return "Good evening";
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function DashboardPage() {
  const reduced = useReducedMotion() ?? false;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<Set<number>>(new Set());
  const [recentPoints, setRecentPoints] = useState<number | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/dashboard");
      const d = await res.json();
      setData(d);
    } catch {
      setData({
        points: 0,
        streak: 0,
        yesterdayCompleted: 0,
        yesterdayTasks: [],
        unlockedRewards: [],
        pendingTasks: 0,
        topPendingTasks: [],
        level: DEFAULT_LEVEL,
        recentAchievements: [],
        habitsWeek: null,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleComplete(taskId: number) {
    if (completing.has(taskId)) return;
    setCompleting((s) => new Set(s).add(taskId));
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        const result = await res.json();
        playTink();
        if (result?.pointsEarned) {
          setRecentPoints(result.pointsEarned);
          setTimeout(() => setRecentPoints(null), 2500);
        }
        setData((d) =>
          d
            ? {
                ...d,
                topPendingTasks: d.topPendingTasks.filter(
                  (t) => t.id !== taskId
                ),
                pendingTasks: Math.max(0, d.pendingTasks - 1),
              }
            : d
        );
        load();
      }
    } catch {
      /* ignore */
    } finally {
      setCompleting((s) => {
        const next = new Set(s);
        next.delete(taskId);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div
        className="mx-auto max-w-3xl px-6 pt-20 pb-16 sm:px-10 sm:pt-14"
        aria-busy="true"
        aria-label="Loading dashboard"
      >
        <Skeleton className="mb-2 h-9 w-64" />
        <Skeleton className="mb-10 h-4 w-48" />
        <Skeleton className="mb-8 h-2 w-full rounded-full" />
        <Skeleton className="mb-2 h-3 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const d = data!;
  const level = d.level ?? DEFAULT_LEVEL;
  const recentAchievements = d.recentAchievements ?? [];
  const topTasks = d.topPendingTasks ?? [];
  const now = new Date();

  return (
    <div className="mx-auto max-w-3xl px-6 pt-20 pb-16 sm:px-10 sm:pt-14">
      <header className="mb-10">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
          {greeting(now.getHours())}
        </h1>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {formatDate(now)}
        </p>
      </header>

      <section aria-label="Level progress" className="mb-6">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span
              className="text-[13px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: level.color }}
            >
              Level {level.level}
            </span>
            <span className="text-[13px] text-muted-foreground">
              {level.tier}
            </span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {level.xpToNext} XP to level {level.level + 1}
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(level.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="h-full rounded-full"
            initial={false}
            animate={{
              width: `${Math.max(2, Math.round(level.progress * 100))}%`,
            }}
            transition={
              reduced
                ? { duration: 0 }
                : { type: "spring", stiffness: 120, damping: 20, mass: 0.7 }
            }
            style={{ backgroundColor: level.color }}
          />
        </div>
      </section>

      <section className="mb-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Star size={14} className="fill-current" style={{ color: "#FFC107" }} />
          <AnimatedNumber value={d.points} className="font-medium text-foreground" />
          <span>points today</span>
        </span>
        <span className="text-border" aria-hidden>·</span>
        <span className="inline-flex items-center gap-1.5">
          <Flame
            size={14}
            style={{ color: d.streak > 0 ? "#FFB020" : undefined }}
            className={d.streak === 0 ? "text-muted-foreground/50" : ""}
          />
          <AnimatedNumber value={d.streak} className="font-medium text-foreground" />
          <span>{d.streak === 1 ? "day streak" : "days streak"}</span>
        </span>
        <span className="text-border" aria-hidden>·</span>
        <span>
          <AnimatedNumber value={d.pendingTasks} className="font-medium text-foreground" />{" "}
          {d.pendingTasks === 1 ? "pending task" : "pending tasks"}
        </span>
      </section>

      <section className="mb-10" aria-label="Tasks for today">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Today
          </h2>
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View all <ArrowRight size={11} />
          </Link>
        </div>

        {topTasks.length === 0 ? (
          <EmptyToday />
        ) : (
          <motion.ul
            className="flex flex-col"
            variants={listContainer(reduced)}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence initial={false}>
              {topTasks.map((t) => (
                <motion.li
                  key={t.id}
                  layout={!reduced}
                  variants={listRow(reduced)}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="group/row flex items-center gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-muted/40"
                >
                  <CircleCheckbox
                    checked={false}
                    onChange={() => handleComplete(t.id)}
                    size={20}
                    fillColor={t.project?.color}
                    label={`Complete ${t.title}`}
                    disabled={completing.has(t.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {t.priority === "high" && (
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: PRIORITY_DOT.high }}
                          title="High priority"
                        />
                      )}
                      <span className="truncate text-sm text-foreground">{t.title}</span>
                    </div>
                  </div>
                  {t.project && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        aria-hidden
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: t.project.color }}
                      />
                      <span className="hidden sm:inline">{t.project.name}</span>
                    </span>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </section>

      {d.habitsWeek && d.habitsWeek.totalHabits > 0 && (
        <section className="mb-10" aria-label="Habits this week">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Habits
            </h2>
            <Link
              href="/habits"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <Link
            href="/habits"
            className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 shadow-card transition-colors hover:bg-muted/40"
          >
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10"
            >
              <Activity size={18} style={{ color: "#34C759" }} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-foreground tabular-nums">
                  {d.habitsWeek.dailyHitsToday} / {d.habitsWeek.totalHabits}
                </span>
                <span className="text-xs text-muted-foreground">
                  daily targets met today
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${d.habitsWeek.averagePercent}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {d.habitsWeek.averagePercent}% week avg
                </span>
              </div>
            </div>
            <span className="text-xs font-medium tabular-nums" style={{ color: "#FFC107" }}>
              +{d.habitsWeek.pointsThisWeek}
            </span>
          </Link>
        </section>
      )}

      {recentAchievements.length > 0 && (
        <section className="mb-10" aria-label="Recent achievements">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <Sparkles size={11} style={{ color: "#FFC107" }} />
              Recent Achievements
            </h2>
            <Link
              href="/achievements"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentAchievements.map((a) => (
              <div
                key={a.id}
                title={a.description}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-foreground"
              >
                <Award size={12} style={{ color: "#FFC107" }} />
                <span className="font-medium">{a.title}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {d.yesterdayTasks.length > 0 && (
        <section className="mb-10" aria-label="Yesterday recap">
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Yesterday
          </h2>
          <ul className="flex flex-col">
            {d.yesterdayTasks.map((task, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-lg px-1 py-1.5 text-sm"
              >
                <CircleCheckbox
                  checked
                  onChange={() => {}}
                  size={18}
                  fillColor={task.project?.color ?? "#34C759"}
                  disabled
                  label={task.title}
                />
                <span className="flex-1 truncate text-muted-foreground line-through decoration-muted-foreground/40">
                  {task.title}
                </span>
                {task.project && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: task.project.color }}
                    />
                    <span className="hidden sm:inline">{task.project.name}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.unlockedRewards.length > 0 && (
        <section className="mb-10" aria-label="Unlocked rewards">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Unlocked Rewards
            </h2>
            <Link
              href="/rewards"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <ul className="flex flex-col">
            {d.unlockedRewards.map((reward) => (
              <li
                key={reward.id}
                className="flex items-center gap-3 rounded-lg px-1 py-2 text-sm transition-colors hover:bg-muted/40"
              >
                <Gift size={16} style={{ color: "#AF52DE" }} />
                <span className="flex-1 truncate">{reward.title}</span>
                <span
                  className="text-xs font-medium tabular-nums"
                  style={{ color: "#FFC107" }}
                >
                  {reward.point_cost} pts
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        aria-label="Quick actions"
        className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6 text-sm"
      >
        <Link
          href="/focus"
          className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Timer size={14} style={{ color: "#FF3B30" }} />
          Start Focus
        </Link>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ListTodo size={14} style={{ color: "#FFC107" }} />
          View Tasks
        </Link>
        <Link
          href="/daily-review"
          className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <NotebookPen size={14} style={{ color: "#34C759" }} />
          Daily Review
        </Link>
      </section>

      <AnimatePresence>
        {recentPoints !== null && (
          <motion.div
            key="points-hud"
            aria-live="polite"
            variants={hud(reduced)}
            initial="hidden"
            animate="show"
            exit="exit"
            className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-foreground/95 px-4 py-2 text-sm font-medium text-background shadow-popover backdrop-blur-md"
          >
            <span className="inline-flex items-center gap-1.5">
              <Star size={14} className="fill-current" style={{ color: "#FFC107" }} />
              +{recentPoints} pts
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyToday() {
  return (
    <div className="rounded-xl bg-card px-5 py-8 text-center shadow-card">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Sparkles size={18} style={{ color: "#FFC107" }} />
      </div>
      <p className="text-sm font-medium text-foreground">All done for today.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Add a new task or take a break.{" "}
        <Link href="/tasks" className="text-foreground underline-offset-4 hover:underline">
          Go to Tasks
        </Link>
      </p>
    </div>
  );
}
