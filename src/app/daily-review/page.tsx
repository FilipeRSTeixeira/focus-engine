"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Check, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { Skeleton } from "@/components/skeleton";

const DISTRACTION_OPTIONS = [
  { value: "phone", label: "Phone" },
  { value: "curiosity", label: "Curiosity" },
  { value: "other-people", label: "People" },
  { value: "environment", label: "Environment" },
  { value: "fatigue", label: "Fatigue" },
  { value: "other", label: "Other" },
];

type Review = {
  date: string;
  reflection_note: string | null;
  distractions: string | null;
  energy_level: number | null;
  tasks_completed: number;
};

export default function DailyReviewPage() {
  const [hasCompletedToday, setHasCompletedToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [wentWell, setWentWell] = useState("");
  const [distractions, setDistractions] = useState<string[]>([]);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    checkToday();
    loadReviews();
  }, []);

  async function checkToday() {
    try {
      const todayKey = new Date().toISOString().split("T")[0];
      const summaryRes = await fetch("/api/summary/" + todayKey);
      if (!summaryRes.ok) {
        setHasCompletedToday(false);
        setLoading(false);
        return;
      }
      const summary = await summaryRes.json();
      setHasCompletedToday(summary?.tasks_completed > 0);
      if (summary?.reflection_note) setWentWell(summary.reflection_note);
      if (typeof summary?.energy_level === "number") {
        setEnergyLevel(summary.energy_level);
      }
      if (summary?.distractions) {
        setDistractions(
          String(summary.distractions)
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        );
      }
    } catch {
      setHasCompletedToday(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadReviews() {
    try {
      const res = await fetch("/api/daily-review");
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch {
      setReviews([]);
    }
  }

  function toggleDistraction(value: string) {
    setDistractions((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/daily-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wentWell, distractions, energyLevel }),
    });
    setSubmitted(true);
    setSubmitting(false);
    loadReviews();
  }

  /* ------------------------------ Loading -------------------------------- */

  if (loading) {
    return (
      <div
        className="mx-auto max-w-2xl px-6 pt-20 pb-12 sm:px-10 sm:pt-14"
        aria-busy="true"
      >
        <Skeleton className="mb-2 h-9 w-48" />
        <Skeleton className="mb-8 h-4 w-64" />
        <Skeleton className="mb-3 h-24 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (!hasCompletedToday) {
    return (
      <div className="mx-auto max-w-2xl px-6 pt-20 pb-12 text-center sm:px-10 sm:pt-14">
        <header className="mb-6 text-left">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
            Daily Review
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reflect on your day.
          </p>
        </header>
        <div className="rounded-2xl bg-card px-5 py-10 text-left shadow-card">
          <p className="text-sm text-muted-foreground">
            Complete at least one task today to unlock the daily review.
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------------- Render -------------------------------- */

  return (
    <div className="mx-auto max-w-2xl px-6 pt-20 pb-12 sm:px-10 sm:pt-14">
      <header className="mb-6">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
          Daily Review
        </h1>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </header>

      {/* Energy */}
      <section className="mb-4 rounded-2xl bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Zap size={14} style={{ color: "#FFC107" }} />
              Energy
            </span>
          </label>
          <span className="text-sm font-medium tabular-nums">
            {energyLevel}/5
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          value={energyLevel}
          onChange={(e) => setEnergyLevel(Number(e.target.value))}
          className="w-full accent-[color:var(--primary)]"
        />
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>Low</span>
          <span>High</span>
        </div>
      </section>

      {/* Reflection */}
      <form
        onSubmit={handleSubmit}
        className="mb-4 rounded-2xl bg-card p-5 shadow-card"
      >
        <label className="mb-2 block text-sm font-medium text-foreground">
          What went well today?
        </label>
        <textarea
          value={wentWell}
          onChange={(e) => setWentWell(e.target.value)}
          placeholder="Reflect on your wins…"
          rows={4}
          className="mb-4 w-full rounded-md bg-muted/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          required
        />

        <label className="mb-2 block text-sm font-medium text-foreground">
          Distractions
        </label>
        <div className="mb-4 flex flex-wrap gap-2">
          {DISTRACTION_OPTIONS.map((option) => {
            const active = distractions.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleDistraction(option.value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {active && <Check size={12} />}
                {option.label}
              </button>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={submitting || !wentWell.trim()}
          className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-5"
        >
          {submitted
            ? "Saved ✓"
            : submitting
            ? "Saving…"
            : "Save review"}
        </button>
      </form>

      {/* Previous reviews */}
      {reviews.length > 0 && (
        <section>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="mb-3 inline-flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
          >
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Previous reviews ({reviews.length})
          </button>

          {showHistory && (
            <ul className="flex flex-col gap-3">
              {reviews.map((review, idx) => (
                <li
                  key={idx}
                  className="rounded-2xl bg-card p-4 shadow-card"
                >
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {new Date(review.date).toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {review.tasks_completed}{" "}
                      {review.tasks_completed === 1 ? "task" : "tasks"}
                    </span>
                    {review.energy_level && (
                      <span className="inline-flex items-center gap-1">
                        <Zap size={11} style={{ color: "#FFC107" }} />
                        {review.energy_level}/5
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground">
                    {review.reflection_note}
                  </p>
                  {review.distractions && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {review.distractions.split(",").map((d) => (
                        <span
                          key={d}
                          className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {d.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
