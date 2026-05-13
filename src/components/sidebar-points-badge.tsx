"use client";

import { useEffect, useState } from "react";
import { Star, Flame } from "lucide-react";

type Stats = {
  points: number;
  streak: number;
};

const POLL_MS = 15_000;

export function SidebarPointsBadge({ collapsed }: { collapsed: boolean }) {
  const [stats, setStats] = useState<Stats>({ points: 0, streak: 0 });

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/tasks/today-points");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setStats({
          points: typeof data.points === "number" ? data.points : 0,
          streak: typeof data.streak === "number" ? data.streak : 0,
        });
      } catch {
        /* silent */
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center gap-1 py-1 text-[11px] text-muted-foreground"
        title={`${stats.points} points today · ${stats.streak}-day streak`}
      >
        <div className="flex items-center gap-1">
          <Star size={11} className="fill-current" style={{ color: "#FFC107" }} />
          <span className="font-medium text-foreground">{stats.points}</span>
        </div>
        {stats.streak > 0 && (
          <div className="flex items-center gap-1">
            <Flame size={11} style={{ color: "#FFB020" }} />
            <span className="font-medium text-foreground">{stats.streak}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between gap-2 px-1 py-1.5 text-xs"
      title="Points earned today · active streak"
    >
      <span className="text-muted-foreground">Today</span>
      <div className="flex items-center gap-3 font-medium">
        <span className="inline-flex items-center gap-1">
          <Star size={12} className="fill-current" style={{ color: "#FFC107" }} />
          <span className="text-foreground tabular-nums">{stats.points}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Flame
            size={12}
            style={{ color: stats.streak > 0 ? "#FFB020" : undefined }}
            className={stats.streak === 0 ? "text-muted-foreground/50" : ""}
          />
          <span
            className={
              stats.streak > 0
                ? "text-foreground tabular-nums"
                : "text-muted-foreground/60 tabular-nums"
            }
          >
            {stats.streak}
          </span>
        </span>
      </div>
    </div>
  );
}
