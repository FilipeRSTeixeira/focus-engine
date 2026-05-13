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
} from "lucide-react";
import { Skeleton } from "@/components/skeleton";
import { CircleCheckbox } from "@/components/circle-checkbox";

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

/* -------------------------------------------------------------------------- */
/*                                Utilities                                   */
/* -------------------------------------------------------------------------- */

function greeting(hour: number): string {
  if (hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 19) return "Boa tarde";
  return "Boa noite";
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/* -------------------------------------------------------------------------- */
/*                                 Page                                       */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
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
        if (result?.pointsEarned) {
          setRecentPoints(result.pointsEarned);
          setTimeout(() => setRecentPoints(null), 2500);
        }
        // Optimistic: remove the task locally, then refresh in background.
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
        // Re-fetch to refresh points/streak/level.
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

  /* ---------------------------- Loading state ----------------------------- */

  if (loading) {
    return (
      <div
        className="mx-auto max-w-3xl px-6 pt-20 pb-16 sm:px-10 sm:pt-14"
        aria-busy="true"
        aria-label="A carregar dashboard"
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
      {/* ----------------------- Greeting + date ----------------------- */}
      <header className="mb-10">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
          {greeting(now.getHours())}
        </h1>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {formatDate(now)}
        </p>
      </header>

      {/* ------------------------- Level / XP -------------------------- */}
      <section aria-label="Progresso de nível" className="mb-6">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span
              className="text-[13px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: level.color }}
            >
              Nível {level.level}
            </span>
            <span className="text-[13px] text-muted-foreground">
              {level.tier}
            </span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {level.xpToNext} XP para nível {level.level + 1}
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(level.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${Math.max(2, Math.round(level.progress * 100))}%`,
              backgroundColor: level.color,
            }}
          />
        </div>
      </section>

      {/* ------------------------- Stats strip ------------------------- */}
      <section className="mb-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Star size={14} className="fill-current" style={{ color: "#FFC107" }} />
          <span className="font-medium text-foreground tabular-nums">
            {d.points}
          </span>
          <span>pontos hoje</span>
        </span>
        <span className="text-border" aria-hidden>
          ·
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Flame
            size={14}
            style={{ color: d.streak > 0 ? "#FFB020" : undefined }}
            className={d.streak === 0 ? "text-muted-foreground/50" : ""}
          />
          <span className="font-medium text-foreground tabular-nums">
            {d.streak}
          </span>
          <span>{d.streak === 1 ? "dia seguido" : "dias seguidos"}</span>
        </span>
        <span className="text-border" aria-hidden>
          ·
        </span>
        <span>
          <span className="font-medium text-foreground tabular-nums">
            {d.pendingTasks}
          </span>{" "}
          {d.pendingTasks === 1 ? "tarefa pendente" : "tarefas pendentes"}
        </span>
      </section>

      {/* ------------------------ Hoje (tasks) ------------------------- */}
      <section className="mb-10" aria-label="Tarefas para hoje">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Hoje
          </h2>
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver todas <ArrowRight size={11} />
          </Link>
        </div>

        {topTasks.length === 0 ? (
          <EmptyToday />
        ) : (
          <ul className="flex flex-col">
            {topTasks.map((t) => (
              <li
                key={t.id}
                className="group/row flex items-center gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-muted/40"
              >
                <CircleCheckbox
                  checked={false}
                  onChange={() => handleComplete(t.id)}
                  size={20}
                  fillColor={t.project?.color}
                  label={`Concluir ${t.title}`}
                  disabled={completing.has(t.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {t.priority === "high" && (
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: PRIORITY_DOT.high }}
                        title="Prioridade alta"
                      />
                    )}
                    <span className="truncate text-sm text-foreground">
                      {t.title}
                    </span>
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
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* --------------------- Recent achievements --------------------- */}
      {recentAchievements.length > 0 && (
        <section className="mb-10" aria-label="Conquistas recentes">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <Sparkles size={11} style={{ color: "#FFC107" }} />
              Conquistas Recentes
            </h2>
            <Link
              href="/achievements"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Ver todas <ArrowRight size={11} />
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

      {/* ----------------------- Yesterday recap ----------------------- */}
      {d.yesterdayTasks.length > 0 && (
        <section className="mb-10" aria-label="Resumo de ontem">
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Ontem
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

      {/* -------------------- Unlocked rewards ------------------------- */}
      {d.unlockedRewards.length > 0 && (
        <section className="mb-10" aria-label="Recompensas desbloqueadas">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Recompensas Desbloqueadas
            </h2>
            <Link
              href="/rewards"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Ver todas <ArrowRight size={11} />
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

      {/* ------------------------ Quick actions ------------------------ */}
      <section
        aria-label="Ações rápidas"
        className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6 text-sm"
      >
        <Link
          href="/focus"
          className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Timer size={14} style={{ color: "#FF3B30" }} />
          Iniciar Focus
        </Link>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ListTodo size={14} style={{ color: "#FFC107" }} />
          Ver Tarefas
        </Link>
        <Link
          href="/daily-review"
          className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <NotebookPen size={14} style={{ color: "#34C759" }} />
          Revisão Diária
        </Link>
      </section>

      {/* ---------------------- Points-earned toast ------------------- */}
      {recentPoints !== null && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-popover animate-in fade-in slide-in-from-bottom-2"
        >
          <span className="inline-flex items-center gap-1.5">
            <Star
              size={14}
              className="fill-current"
              style={{ color: "#FFC107" }}
            />
            +{recentPoints} pts
          </span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Empty state                                   */
/* -------------------------------------------------------------------------- */

function EmptyToday() {
  return (
    <div className="rounded-xl bg-card px-5 py-8 text-center shadow-card">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Sparkles size={18} style={{ color: "#FFC107" }} />
      </div>
      <p className="text-sm font-medium text-foreground">
        Tudo feito por hoje.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Adiciona uma nova tarefa ou descansa.{" "}
        <Link
          href="/tasks"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Ir para Tarefas
        </Link>
      </p>
    </div>
  );
}
