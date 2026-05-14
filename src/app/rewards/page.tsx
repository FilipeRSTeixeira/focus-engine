"use client";

import { useState, useEffect, type FormEvent } from "react";
import {
  Trash2,
  Gift,
  Lock,
  CheckCircle2,
  Pencil,
  X,
  Save,
  Plus,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const DURATIONS = [
  { value: "min5", label: "5 min" },
  { value: "min15", label: "15 min" },
  { value: "min30", label: "30 min" },
  { value: "hour1", label: "1 h" },
];

type Reward = {
  id: number;
  title: string;
  point_cost: number;
  type?: string | null;
  reward_duration?: string | null;
  expiresAt?: string | null;
  status: string;
  activatedAt?: string | null;
  createdAt: string;
};

type Message = { type: "success" | "error"; text: string };

function durationLabel(val: string): string {
  return DURATIONS.find((d) => d.value === val)?.label ?? val;
}

function formatDatePt(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
  });
}

/* -------------------------------------------------------------------------- */
/*                                  Page                                      */
/* -------------------------------------------------------------------------- */

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [earned, setEarned] = useState(0);
  const [spent, setSpent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [pulsingReward, setPulsingReward] = useState<number | null>(null);

  // Quick-add
  const [title, setTitle] = useState("");
  const [pointCost, setPointCost] = useState("");
  const [duration, setDuration] = useState("min15");
  const [daysUntilExpiry, setDaysUntilExpiry] = useState("7");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPointCost, setEditPointCost] = useState("");
  const [editDuration, setEditDuration] = useState("min15");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [rewardsRes, earnedRes, spentRes] = await Promise.all([
        fetch("/api/rewards"),
        fetch("/api/tasks/today-points"),
        fetch("/api/rewards/spent"),
      ]);
      if (!rewardsRes.ok || !earnedRes.ok || !spentRes.ok) {
        throw new Error("Failed to load rewards");
      }
      const [rewardsData, earnedData, spentData] = await Promise.all([
        rewardsRes.json(),
        earnedRes.json(),
        spentRes.json(),
      ]);
      setRewards(rewardsData);
      setEarned(earnedData.points);
      setSpent(spentData.spent);
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to load",
      });
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !pointCost) return;
    setLoading(true);
    try {
      const expiresAt = daysUntilExpiry
        ? new Date(Date.now() + Number(daysUntilExpiry) * 86_400_000)
        : undefined;
      await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          pointCost: Number(pointCost),
          rewardDuration: duration,
          expiresAt,
        }),
      });
      setTitle("");
      setPointCost("");
      setDaysUntilExpiry("7");
      setDuration("min15");
      setShowAdvanced(false);
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(id: number) {
    setPulsingReward(id);
    setTimeout(() => setPulsingReward(null), 800);
    const res = await fetch(`/api/rewards/${id}/activate`, { method: "POST" });
    const result = await res.json();
    if (result.error) {
      const msgs: Record<string, string> = {
        max_active: "Maximum of 2 active rewards per day reached.",
        not_available: "This reward is not available.",
        insufficient_points:
          "You don't have enough points to activate this reward.",
        weekly_limit_reached:
          "Weekly limit reached for this reward — try again next week.",
      };
      setMessage({ type: "error", text: msgs[result.error] || "Failed to activate." });
    } else {
      setMessage({ type: "success", text: "Reward activated." });
      await load();
    }
    setTimeout(() => setMessage(null), 3000);
  }

  function startEdit(reward: Reward) {
    setEditingId(reward.id);
    setEditTitle(reward.title);
    setEditPointCost(String(reward.point_cost));
    setEditDuration(reward.reward_duration ?? "min15");
    setEditExpiresAt(reward.expiresAt ? reward.expiresAt.slice(0, 10) : "");
  }
  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit() {
    if (!editingId || !editTitle.trim() || !editPointCost) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/rewards/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          pointCost: Number(editPointCost),
          rewardDuration: editDuration,
          expiresAt: editExpiresAt || null,
        }),
      });
      if (!res.ok) throw new Error(`Failed to save (${res.status})`);
      cancelEdit();
      await load();
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to save",
      });
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(id: number, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/rewards/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed to delete (${res.status})`);
      await load();
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to delete",
      });
    }
  }

  /* ------------------------------ Derived -------------------------------- */

  const availablePoints = earned - spent;
  const unlocked = rewards.filter(
    (r) => r.status === "available" && r.point_cost <= availablePoints
  );
  const locked = rewards.filter(
    (r) => r.status === "available" && r.point_cost > availablePoints
  );
  const active = rewards.filter((r) => r.status === "active");
  const expired = rewards.filter((r) => r.status === "expired");

  return (
    <div className="mx-auto max-w-3xl px-6 pt-20 pb-16 sm:px-10 sm:pt-14">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
          Rewards
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Star size={13} className="fill-current" style={{ color: "#FFC107" }} />
            <span className="font-medium text-foreground tabular-nums">
              {earned}
            </span>
            <span>earned</span>
          </span>
          <span aria-hidden className="text-border">·</span>
          <span>
            <span className="font-medium text-foreground tabular-nums">
              {spent}
            </span>{" "}
            spent
          </span>
          <span aria-hidden className="text-border">·</span>
          <span>
            <span
              className={`font-medium tabular-nums ${
                availablePoints < 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {availablePoints}
            </span>{" "}
            available
          </span>
        </div>
      </header>

      {message && (
        <div
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${
            message.type === "success"
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive"
          }`}
          style={
            message.type === "success" ? { color: "#34C759" } : undefined
          }
        >
          {message.text}
        </div>
      )}

      {/* Quick add */}
      <form
        onSubmit={handleCreate}
        className="mb-6 rounded-2xl bg-card p-4 shadow-card"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-hidden
            className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border"
          >
            <Plus size={12} className="text-muted-foreground" />
          </span>
          <input
            type="text"
            placeholder="New reward…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            required
          />
          <input
            type="number"
            placeholder="pts"
            value={pointCost}
            onChange={(e) => setPointCost(e.target.value)}
            min={1}
            className="w-20 rounded-md bg-muted px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            required
          />
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Options
          </button>
          <button
            type="submit"
            disabled={loading || !title.trim() || !pointCost}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Plus size={13} />
            Add
          </button>
        </div>

        {showAdvanced && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              title="Duration"
            >
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  Duration {d.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Days until expiry"
              value={daysUntilExpiry}
              onChange={(e) => setDaysUntilExpiry(e.target.value)}
              min={1}
              className="rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        )}
      </form>

      {/* Active */}
      {active.length > 0 && (
        <Section label="Active">
          <ul className="flex flex-col">
            {active.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5"
              >
                <CheckCircle2 size={16} style={{ color: "#3478F6" }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-foreground">
                    {r.title}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {durationLabel(r.reward_duration ?? "min15")} · Activated{" "}
                    {formatDatePt(r.activatedAt)}
                    {r.expiresAt && <> · Expires {formatDatePt(r.expiresAt)}</>}
                  </div>
                </div>
                <span
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: "#3478F6" }}
                >
                  active
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <Section label="Unlocked">
          <ul className="flex flex-col">
            {unlocked.map((r) => {
              const isEditing = editingId === r.id;
              const isPulsing = pulsingReward === r.id;
              return (
                <li
                  key={r.id}
                  className={`group/row flex flex-col rounded-lg px-2 transition-colors ${
                    isEditing
                      ? "bg-muted/40"
                      : isPulsing
                      ? "bg-success/15 ring-1 ring-success/30"
                      : "hover:bg-muted/40"
                  }`}
                  style={isPulsing ? { color: "#34C759" } : undefined}
                >
                  <div className="flex items-start gap-3 py-2.5">
                    <Gift size={18} style={{ color: "#AF52DE" }} className="mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] text-foreground">
                        {r.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {durationLabel(r.reward_duration ?? "min15")}
                        {r.expiresAt && (
                          <> · Expires {formatDatePt(r.expiresAt)}</>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className="text-xs font-medium tabular-nums"
                        style={{ color: "#FFC107" }}
                      >
                        {r.point_cost} pts
                      </span>
                      <button
                        type="button"
                        onClick={() => handleActivate(r.id)}
                        className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                        title="Activate reward"
                      >
                        <CheckCircle2 size={13} style={{ color: "#34C759" }} />
                        Activate
                      </button>
                      <div className="flex items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover/row:opacity-100">
                        <button
                          onClick={() =>
                            isEditing ? cancelEdit() : startEdit(r)
                          }
                          aria-label={isEditing ? "Cancel" : "Edit"}
                          title={isEditing ? "Cancel" : "Edit"}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          {isEditing ? <X size={13} /> : <Pencil size={13} />}
                        </button>
                        <button
                          onClick={() => handleDelete(r.id, r.title)}
                          aria-label="Delete"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {isEditing && (
                    <RewardEditor
                      title={editTitle}
                      setTitle={setEditTitle}
                      pointCost={editPointCost}
                      setPointCost={setEditPointCost}
                      duration={editDuration}
                      setDuration={setEditDuration}
                      expiresAt={editExpiresAt}
                      setExpiresAt={setEditExpiresAt}
                      onCancel={cancelEdit}
                      onSave={handleSaveEdit}
                      saving={savingEdit}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <Section label="Locked">
          <ul className="flex flex-col">
            {locked.map((r) => {
              const needed = r.point_cost - availablePoints;
              const progress = Math.min(
                100,
                Math.round((availablePoints / r.point_cost) * 100)
              );
              const isEditing = editingId === r.id;
              return (
                <li
                  key={r.id}
                  className={`group/row flex flex-col rounded-lg px-2 transition-colors ${
                    isEditing ? "bg-muted/40" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start gap-3 py-2.5">
                    <Lock
                      size={16}
                      className="mt-1 shrink-0 text-muted-foreground"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] text-foreground">
                        {r.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>
                          {durationLabel(r.reward_duration ?? "min15")} ·{" "}
                          {r.point_cost} pts
                        </span>
                        {r.expiresAt && (
                          <span>· Expires {formatDatePt(r.expiresAt)}</span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-[width] duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          need {needed}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover/row:opacity-100">
                      <button
                        onClick={() => (isEditing ? cancelEdit() : startEdit(r))}
                        aria-label={isEditing ? "Cancel" : "Edit"}
                        title={isEditing ? "Cancel" : "Edit"}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {isEditing ? <X size={13} /> : <Pencil size={13} />}
                      </button>
                      <button
                        onClick={() => handleDelete(r.id, r.title)}
                        aria-label="Delete"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {isEditing && (
                    <RewardEditor
                      title={editTitle}
                      setTitle={setEditTitle}
                      pointCost={editPointCost}
                      setPointCost={setEditPointCost}
                      duration={editDuration}
                      setDuration={setEditDuration}
                      expiresAt={editExpiresAt}
                      setExpiresAt={setEditExpiresAt}
                      onCancel={cancelEdit}
                      onSave={handleSaveEdit}
                      saving={savingEdit}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* Expired */}
      {expired.length > 0 && (
        <Section label="Expired">
          <ul className="flex flex-col opacity-60">
            {expired.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5"
              >
                <Lock size={16} className="text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-muted-foreground line-through">
                    {r.title}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {durationLabel(r.reward_duration ?? "min15")}
                  </div>
                </div>
                <span
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive"
                >
                  expired
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {rewards.length === 0 && (
        <div className="rounded-2xl bg-card px-5 py-10 text-center shadow-card">
          <p className="text-sm font-medium text-foreground">
            No rewards yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create your first reward above to start gamifying your focus
            sessions.
          </p>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Subcomponents                                 */
/* -------------------------------------------------------------------------- */

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </h2>
      {children}
    </section>
  );
}

function RewardEditor({
  title,
  setTitle,
  pointCost,
  setPointCost,
  duration,
  setDuration,
  expiresAt,
  setExpiresAt,
  onCancel,
  onSave,
  saving,
}: {
  title: string;
  setTitle: (v: string) => void;
  pointCost: string;
  setPointCost: (v: string) => void;
  duration: string;
  setDuration: (v: string) => void;
  expiresAt: string;
  setExpiresAt: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="mb-2 ml-7 mr-1 rounded-lg bg-background p-3 shadow-card">
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        required
      />
      <div className="mt-2 grid grid-cols-3 gap-2">
        <input
          type="number"
          placeholder="pts"
          value={pointCost}
          onChange={(e) => setPointCost(e.target.value)}
          min={1}
          className="rounded-md bg-muted/60 px-2 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          required
        />
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="rounded-md bg-muted/60 px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          {DURATIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          title="Expiry date"
          className="rounded-md bg-muted/60 px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X size={12} /> Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Save size={12} /> Save
        </button>
      </div>
    </div>
  );
}
