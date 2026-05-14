"use client";

import { useState, useEffect, type FormEvent } from "react";
import {
  Sparkles,
  Heart,
  BookOpen,
  Activity,
  Moon,
  Coffee,
  Utensils,
  Users,
  Sunrise,
  Brain,
  Dumbbell,
  Plus,
  Minus,
  Pencil,
  Trash2,
  X,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  TrendingUp,
  Star,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const ICON_OPTIONS = [
  { name: "sparkles", Icon: Sparkles },
  { name: "heart", Icon: Heart },
  { name: "book-open", Icon: BookOpen },
  { name: "activity", Icon: Activity },
  { name: "moon", Icon: Moon },
  { name: "coffee", Icon: Coffee },
  { name: "utensils", Icon: Utensils },
  { name: "users", Icon: Users },
  { name: "sunrise", Icon: Sunrise },
  { name: "brain", Icon: Brain },
  { name: "dumbbell", Icon: Dumbbell },
] as const;

const COLOR_OPTIONS = [
  "#10b981", // emerald
  "#3478F6", // blue
  "#34C759", // green
  "#FFC107", // amber
  "#FF9500", // orange
  "#FF3B30", // red
  "#AF52DE", // purple
  "#5856D6", // indigo
  "#FF2D55", // pink
  "#00C7BE", // teal
];

const CADENCES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly total" },
] as const;

const COMMON_UNITS = ["count", "min", "check", "sessions", "reps", "pages"] as const;

function getIconComponent(name: string) {
  return ICON_OPTIONS.find((i) => i.name === name)?.Icon ?? Sparkles;
}

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type Habit = {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  category: string | null;
  unit: string;
  cadence: "daily" | "weekly";
  daily_target: number | null;
  weekly_days_target: number;
  weekly_target: number | null;
  daily_points: number;
  weekly_bonus_points: number;
  active: boolean;
  order: number;
  weekProgress: {
    percent: number;
    daysMet: number;
    weekTotal: number;
    todayValue: number;
    todayDone: boolean;
    weekHit: boolean;
  };
};

type WeekSummary = {
  totalHabits: number;
  dailyHitsToday: number;
  averagePercent: number;
  pointsThisWeek: number;
};

type Message = { type: "success" | "error"; text: string };

type HabitTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  cadence: "daily" | "weekly";
  unit: string;
  dailyTarget?: number;
  weeklyDaysTarget?: number;
  weeklyTarget?: number;
  dailyPoints: number;
  weeklyBonusPoints?: number;
};

const TEMPLATES: HabitTemplate[] = [
  {
    id: "read",
    name: "Read",
    description: "Daily reading time",
    icon: "book-open",
    color: "#3478F6",
    cadence: "daily",
    unit: "min",
    dailyTarget: 20,
    weeklyDaysTarget: 7,
    dailyPoints: 2,
  },
  {
    id: "exercise",
    name: "Exercise",
    description: "Move your body",
    icon: "activity",
    color: "#FF3B30",
    cadence: "weekly",
    unit: "min",
    weeklyTarget: 150,
    dailyPoints: 3,
    weeklyBonusPoints: 10,
  },
  {
    id: "sleep",
    name: "Sleep on time",
    description: "Get to bed before your target",
    icon: "moon",
    color: "#AF52DE",
    cadence: "daily",
    unit: "check",
    dailyTarget: 1,
    weeklyDaysTarget: 6,
    dailyPoints: 3,
  },
];

/* -------------------------------------------------------------------------- */
/*                                    Page                                    */
/* -------------------------------------------------------------------------- */

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<Partial<HabitTemplate> & { name: string }>(
    blankForm()
  );
  const [saving, setSaving] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<HabitTemplate> & { name: string }>(
    blankForm()
  );

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const [habitsRes, weekRes] = await Promise.all([
        fetch("/api/habits"),
        fetch("/api/habits/week"),
      ]);
      if (!habitsRes.ok || !weekRes.ok) throw new Error("Failed to load");
      const habitsData: Habit[] = await habitsRes.json();
      const weekData: WeekSummary = await weekRes.json();
      setHabits(habitsData);
      setSummary(weekData);
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to load",
      });
    } finally {
      setLoading(false);
    }
  }

  function showMsg(m: Message) {
    setMessage(m);
    setTimeout(() => setMessage(null), 3000);
  }

  async function postHabit(body: Record<string, unknown>) {
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `Failed (${res.status})`);
    }
    return res.json();
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      await postHabit({
        name: form.name.trim(),
        description: form.description ?? null,
        icon: form.icon ?? "sparkles",
        color: form.color ?? "#10b981",
        unit: form.unit ?? "count",
        cadence: form.cadence ?? "daily",
        dailyTarget: form.dailyTarget ?? null,
        weeklyDaysTarget: form.weeklyDaysTarget ?? 7,
        weeklyTarget: form.weeklyTarget ?? null,
        dailyPoints: form.dailyPoints ?? 2,
        weeklyBonusPoints: form.weeklyBonusPoints ?? 0,
      });
      setShowAddForm(false);
      setForm(blankForm());
      await load();
      showMsg({ type: "success", text: "Habit created." });
    } catch (e) {
      showMsg({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to create habit",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTemplate(t: HabitTemplate) {
    try {
      await postHabit({
        name: t.name,
        description: t.description,
        icon: t.icon,
        color: t.color,
        unit: t.unit,
        cadence: t.cadence,
        dailyTarget: t.dailyTarget ?? null,
        weeklyDaysTarget: t.weeklyDaysTarget ?? 7,
        weeklyTarget: t.weeklyTarget ?? null,
        dailyPoints: t.dailyPoints,
        weeklyBonusPoints: t.weeklyBonusPoints ?? 0,
      });
      await load();
      showMsg({ type: "success", text: `"${t.name}" added.` });
    } catch (e) {
      showMsg({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to add template",
      });
    }
  }

  async function handleLog(habit: Habit, newValue: number) {
    try {
      const res = await fetch(`/api/habits/${habit.id}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: Math.max(0, newValue) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Failed (${res.status})`);
      }
      const result = await res.json();
      await load();
      if (result.weeklyBonusAwarded > 0) {
        showMsg({
          type: "success",
          text: `Weekly target hit — +${result.weeklyBonusAwarded} bonus points!`,
        });
      } else if (result.pointsAwardedToday > 0) {
        showMsg({
          type: "success",
          text: `Logged — +${result.pointsAwardedToday} points.`,
        });
      }
    } catch (e) {
      showMsg({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to log",
      });
    }
  }

  function startEdit(h: Habit) {
    setEditingId(h.id);
    setEditForm({
      name: h.name,
      description: h.description ?? "",
      icon: h.icon,
      color: h.color,
      unit: h.unit,
      cadence: h.cadence,
      dailyTarget: h.daily_target ?? undefined,
      weeklyDaysTarget: h.weekly_days_target,
      weeklyTarget: h.weekly_target ?? undefined,
      dailyPoints: h.daily_points,
      weeklyBonusPoints: h.weekly_bonus_points,
    });
  }

  async function handleSaveEdit() {
    if (!editingId || !editForm.name?.trim()) return;
    try {
      const res = await fetch(`/api/habits/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description ?? null,
          icon: editForm.icon,
          color: editForm.color,
          unit: editForm.unit,
          cadence: editForm.cadence,
          dailyTarget: editForm.dailyTarget ?? null,
          weeklyDaysTarget: editForm.weeklyDaysTarget ?? 7,
          weeklyTarget: editForm.weeklyTarget ?? null,
          dailyPoints: editForm.dailyPoints ?? 2,
          weeklyBonusPoints: editForm.weeklyBonusPoints ?? 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Failed (${res.status})`);
      }
      setEditingId(null);
      await load();
      showMsg({ type: "success", text: "Habit updated." });
    } catch (e) {
      showMsg({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to update",
      });
    }
  }

  async function handleDelete(h: Habit) {
    if (!confirm(`Delete "${h.name}" and all its logs?`)) return;
    try {
      const res = await fetch(`/api/habits/${h.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      await load();
      showMsg({ type: "success", text: "Habit deleted." });
    } catch (e) {
      showMsg({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to delete",
      });
    }
  }

  /* ------------------------------ Render --------------------------------- */

  return (
    <div className="mx-auto max-w-3xl px-6 pt-20 pb-16 sm:px-10 sm:pt-14">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
          Habits
        </h1>
        {summary && summary.totalHabits > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              <CheckCircle2 size={13} className="mr-1 inline" style={{ color: "#34C759" }} />
              <span className="font-medium text-foreground tabular-nums">
                {summary.dailyHitsToday}
              </span>{" "}
              / {summary.totalHabits} hit today
            </span>
            <span aria-hidden className="text-border">·</span>
            <span>
              <TrendingUp size={13} className="mr-1 inline" style={{ color: "#3478F6" }} />
              <span className="font-medium text-foreground tabular-nums">
                {summary.averagePercent}%
              </span>{" "}
              week avg
            </span>
            <span aria-hidden className="text-border">·</span>
            <span>
              <Star size={13} className="mr-1 inline fill-current" style={{ color: "#FFC107" }} />
              <span className="font-medium text-foreground tabular-nums">
                {summary.pointsThisWeek}
              </span>{" "}
              pts this week
            </span>
          </div>
        )}
      </header>

      {message && (
        <div
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${
            message.type === "success"
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive"
          }`}
          style={message.type === "success" ? { color: "#34C759" } : undefined}
        >
          {message.text}
        </div>
      )}

      {/* Add button + form */}
      <div className="mb-6">
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground shadow-card transition-colors hover:bg-accent"
          >
            <Plus size={14} />
            New habit
          </button>
        ) : (
          <form
            onSubmit={handleCreate}
            className="rounded-2xl bg-card p-4 shadow-card"
          >
            <HabitForm form={form} setForm={setForm} />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setForm(blankForm());
                }}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={12} /> Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !form.name?.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Save size={12} /> Save
              </button>
            </div>
          </form>
        )}
      </div>

      {/* List or empty state */}
      {loading ? (
        <div className="rounded-2xl bg-card px-5 py-10 text-center shadow-card">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      ) : habits.length === 0 ? (
        <EmptyState onAddTemplate={handleAddTemplate} />
      ) : (
        <ul className="flex flex-col gap-2">
          {habits.map((h) => {
            const Icon = getIconComponent(h.icon);
            const isEditing = editingId === h.id;
            return (
              <li
                key={h.id}
                className={`rounded-2xl bg-card p-4 shadow-card transition-colors ${
                  h.weekProgress.weekHit ? "ring-1 ring-success/30" : ""
                }`}
              >
                {!isEditing ? (
                  <>
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${h.color}1f` }}
                      >
                        <Icon size={18} style={{ color: h.color }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="truncate text-[15px] font-medium text-foreground">
                            {h.name}
                          </span>
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            {h.cadence}
                          </span>
                          {h.weekProgress.weekHit && (
                            <span
                              className="rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-medium"
                              style={{ color: "#34C759" }}
                            >
                              100% this week
                            </span>
                          )}
                        </div>
                        {h.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {h.description}
                          </p>
                        )}

                        {/* Progress bar */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full transition-[width] duration-500"
                              style={{
                                width: `${h.weekProgress.percent}%`,
                                backgroundColor: h.color,
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium tabular-nums text-muted-foreground">
                            {h.weekProgress.percent}%
                          </span>
                        </div>

                        {/* Target details */}
                        <div className="mt-1.5 text-[11px] text-muted-foreground">
                          {h.cadence === "daily" ? (
                            <>
                              Target: {formatTarget(h.daily_target, h.unit)} /
                              day · {h.weekProgress.daysMet} /{" "}
                              {h.weekly_days_target} days this week ·{" "}
                              {h.daily_points} pts/day
                            </>
                          ) : (
                            <>
                              Target: {formatTarget(h.weekly_target, h.unit)} /
                              week · {Math.round(h.weekProgress.weekTotal * 10) / 10}{" "}
                              {h.unit} so far ·{" "}
                              {h.daily_points} pts/day
                              {h.weekly_bonus_points > 0 && (
                                <> · +{h.weekly_bonus_points} weekly bonus</>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => startEdit(h)}
                          aria-label="Edit"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(h)}
                          aria-label="Delete"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Quick log row */}
                    <div className="mt-3 flex items-center gap-2 pl-12">
                      <span className="text-xs text-muted-foreground">Today:</span>
                      {isCheckUnit(h) ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleLog(h, h.weekProgress.todayDone ? 0 : 1)
                          }
                          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            h.weekProgress.todayDone
                              ? "bg-success/15 text-success"
                              : "bg-muted text-foreground hover:bg-accent"
                          }`}
                          style={
                            h.weekProgress.todayDone
                              ? { color: "#34C759" }
                              : undefined
                          }
                        >
                          {h.weekProgress.todayDone ? (
                            <Check size={13} />
                          ) : (
                            <Plus size={13} />
                          )}
                          {h.weekProgress.todayDone ? "Done" : "Mark done"}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleLog(
                                h,
                                Math.max(0, h.weekProgress.todayValue - logStep(h))
                              )
                            }
                            disabled={h.weekProgress.todayValue <= 0}
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground transition-colors hover:bg-accent disabled:opacity-40"
                            aria-label="Decrease"
                          >
                            <Minus size={13} />
                          </button>
                          <input
                            type="number"
                            min={0}
                            step={logStep(h)}
                            value={h.weekProgress.todayValue}
                            onChange={(e) =>
                              handleLog(h, Number(e.target.value))
                            }
                            className="w-16 rounded-md bg-muted px-2 py-1 text-center text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/40"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleLog(h, h.weekProgress.todayValue + logStep(h))
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground transition-colors hover:bg-accent"
                            aria-label="Increase"
                          >
                            <Plus size={13} />
                          </button>
                          <span className="text-[11px] text-muted-foreground">
                            {h.unit}
                          </span>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <HabitForm form={editForm} setForm={setEditForm} />
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <X size={12} /> Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        <Save size={12} /> Save
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Subcomponents                                 */
/* -------------------------------------------------------------------------- */

function EmptyState({
  onAddTemplate,
}: {
  onAddTemplate: (t: HabitTemplate) => void;
}) {
  const [showTemplates, setShowTemplates] = useState(true);
  return (
    <div className="rounded-2xl bg-card px-5 py-10 text-center shadow-card">
      <Sparkles size={28} className="mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">No habits yet.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Track recurring behaviors and earn points each day you hit them.
      </p>

      <button
        type="button"
        onClick={() => setShowTemplates((v) => !v)}
        className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {showTemplates ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {showTemplates ? "Hide" : "Show"} starter templates
      </button>

      {showTemplates && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TEMPLATES.map((t) => {
            const Icon = getIconComponent(t.icon);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onAddTemplate(t)}
                className="flex items-start gap-2 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-foreground/30 hover:bg-muted/30"
              >
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${t.color}1f` }}
                >
                  <Icon size={16} style={{ color: t.color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground">
                    {t.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {t.cadence === "daily"
                      ? `${t.dailyTarget} ${t.unit} / day`
                      : `${t.weeklyTarget} ${t.unit} / week`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HabitForm({
  form,
  setForm,
}: {
  form: Partial<HabitTemplate> & { name: string };
  setForm: (f: Partial<HabitTemplate> & { name: string }) => void;
}) {
  const cadence = form.cadence ?? "daily";
  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Habit name"
        value={form.name ?? ""}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="w-full rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={form.description ?? ""}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full rounded-md bg-muted/60 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
      />

      {/* Icon picker */}
      <div className="flex flex-wrap gap-1.5">
        {ICON_OPTIONS.map(({ name, Icon }) => (
          <button
            key={name}
            type="button"
            onClick={() => setForm({ ...form, icon: name })}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              (form.icon ?? "sparkles") === name
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            aria-label={name}
            title={name}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>

      {/* Color picker */}
      <div className="flex flex-wrap gap-1.5">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setForm({ ...form, color: c })}
            className={`h-6 w-6 rounded-full ring-offset-2 transition-all ${
              (form.color ?? "#10b981") === c ? "ring-2 ring-foreground" : ""
            }`}
            style={{ backgroundColor: c }}
            aria-label={c}
          />
        ))}
      </div>

      {/* Cadence + unit */}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={cadence}
          onChange={(e) =>
            setForm({ ...form, cadence: e.target.value as "daily" | "weekly" })
          }
          className="rounded-md bg-muted/60 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          {CADENCES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={form.unit ?? "count"}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
          className="rounded-md bg-muted/60 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          {COMMON_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {/* Target fields per cadence */}
      {cadence === "daily" ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            Daily target
            <input
              type="number"
              min={0}
              value={form.dailyTarget ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  dailyTarget: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              className="rounded-md bg-muted/60 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            Days / week (1-7)
            <input
              type="number"
              min={1}
              max={7}
              value={form.weeklyDaysTarget ?? 7}
              onChange={(e) =>
                setForm({ ...form, weeklyDaysTarget: Number(e.target.value) })
              }
              className="rounded-md bg-muted/60 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
        </div>
      ) : (
        <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          Weekly target (total)
          <input
            type="number"
            min={0}
            value={form.weeklyTarget ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                weeklyTarget: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            className="rounded-md bg-muted/60 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
      )}

      {/* Points */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          Points / day
          <input
            type="number"
            min={0}
            value={form.dailyPoints ?? 2}
            onChange={(e) =>
              setForm({ ...form, dailyPoints: Number(e.target.value) })
            }
            className="rounded-md bg-muted/60 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          Weekly bonus (100%)
          <input
            type="number"
            min={0}
            value={form.weeklyBonusPoints ?? 0}
            onChange={(e) =>
              setForm({ ...form, weeklyBonusPoints: Number(e.target.value) })
            }
            className="rounded-md bg-muted/60 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function blankForm(): Partial<HabitTemplate> & { name: string } {
  return {
    name: "",
    description: "",
    icon: "sparkles",
    color: "#10b981",
    cadence: "daily",
    unit: "count",
    dailyTarget: undefined,
    weeklyDaysTarget: 7,
    weeklyTarget: undefined,
    dailyPoints: 2,
    weeklyBonusPoints: 0,
  };
}

function isCheckUnit(h: Habit): boolean {
  return (
    h.unit === "check" ||
    (h.cadence === "daily" && (h.daily_target ?? 0) === 1 && h.unit === "count")
  );
}

function logStep(h: Habit): number {
  if (h.unit === "min") return 5;
  if (h.unit === "sessions" || h.unit === "reps" || h.unit === "pages") return 1;
  return 1;
}

function formatTarget(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined) return `— ${unit}`;
  return `${value} ${unit}`;
}
