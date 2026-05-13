"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Flame, Trophy } from "lucide-react";
import { CALENDAR_COLORS, PIE_COLORS } from "@/lib/colors";
import { Skeleton } from "@/components/skeleton";

type HistoryData = {
  weekly: { day: string; tasks: number }[];
  streak: number;
  personalBest: number;
  points: { earned: number; spent: number };
  projects: { name: string; color: string; count: number }[];
  calendar: { date: string; completed: number }[];
};

export default function HistoryPage() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div
        className="mx-auto max-w-3xl px-6 pt-20 pb-12 sm:px-10 sm:pt-14"
        aria-busy="true"
      >
        <Skeleton className="mb-2 h-9 w-40" />
        <Skeleton className="mb-8 h-4 w-56" />
        <div className="mb-6 grid grid-cols-2 gap-4">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="mb-6 h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const PIE_DATA = [
    { name: "Earned", value: data!.points.earned, fill: PIE_COLORS.earned },
    { name: "Spent", value: data!.points.spent, fill: PIE_COLORS.spent },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 pt-20 pb-12 sm:px-10 sm:pt-14">
      <header className="mb-8">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
          History
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your patterns over the last 90 days.
        </p>
      </header>

      {/* Stat headlines */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <Flame size={12} style={{ color: "#FFB020" }} />
            <span>Current streak</span>
          </div>
          <p className="mt-1 text-[28px] font-semibold tabular-nums leading-none">
            {data!.streak}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {data!.streak === 1 ? "day" : "days"}
            </span>
          </p>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <Trophy size={12} style={{ color: "#FFC107" }} />
            <span>Best day</span>
          </div>
          <p className="mt-1 text-[28px] font-semibold tabular-nums leading-none">
            {data!.personalBest}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              tasks
            </span>
          </p>
        </div>
      </div>

      {/* Weekly chart */}
      <section className="mb-6 rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Last 4 weeks
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data!.weekly}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              interval={3}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--popover)",
                border: "none",
                borderRadius: 10,
                boxShadow: "var(--shadow-popover)",
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              cursor={{ fill: "var(--muted)" }}
            />
            <Bar dataKey="tasks" fill="#3478F6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Points + Top projects */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <section className="rounded-2xl bg-card p-5 shadow-card">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Points
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={PIE_DATA}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
              >
                {PIE_DATA.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  border: "none",
                  borderRadius: 10,
                  boxShadow: "var(--shadow-popover)",
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: PIE_COLORS.earned }}
              />
              Earned ({data!.points.earned})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: PIE_COLORS.spent }}
              />
              Spent ({data!.points.spent})
            </span>
          </div>
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-card">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Top projects
          </h2>
          {data!.projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed tasks yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {data!.projects.map((p, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="truncate">{p.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {p.count}{" "}
                    {p.count === 1 ? "task" : "tasks"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Productivity calendar (heatmap) */}
      <section className="rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Productivity calendar · 90 days
        </h2>
        <div className="flex flex-wrap gap-1">
          {data!.calendar.map((day, i) => {
            const level =
              day.completed === 0
                ? 0
                : day.completed === 1
                ? 1
                : day.completed === 2
                ? 2
                : day.completed === 3
                ? 3
                : 4;
            return (
              <div
                key={i}
                className="h-3 w-3 rounded-[3px]"
                style={{ backgroundColor: CALENDAR_COLORS[level] }}
                title={`${day.date}: ${day.completed} ${
                  day.completed === 1 ? "task" : "tasks"
                }`}
              />
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
          <span>Less</span>
          {CALENDAR_COLORS.map((c, i) => (
            <div
              key={i}
              className="h-3 w-3 rounded-[3px]"
              style={{ backgroundColor: c }}
            />
          ))}
          <span>More</span>
        </div>
      </section>
    </div>
  );
}
