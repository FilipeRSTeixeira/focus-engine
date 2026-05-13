"use client";

import { useEffect, useState } from "react";
import {
  Award,
  Footprints,
  ListChecks,
  Trophy,
  Medal,
  Flame,
  Crown,
  Star,
  Sparkles,
  ChevronsUp,
  Swords,
  Shield,
  Sunrise,
  Moon,
  Hourglass,
  Gift,
  Timer,
  FolderPlus,
  Lock,
} from "lucide-react";
import { Skeleton } from "@/components/skeleton";
import type { LucideIcon } from "lucide-react";

// Map catalog icon names → lucide components. Keep this in sync with the
// `icon` strings used in src/lib/achievements.ts.
const ICONS: Record<string, LucideIcon> = {
  footprints: Footprints,
  "list-checks": ListChecks,
  trophy: Trophy,
  medal: Medal,
  flame: Flame,
  crown: Crown,
  star: Star,
  sparkles: Sparkles,
  "chevrons-up": ChevronsUp,
  swords: Swords,
  shield: Shield,
  sunrise: Sunrise,
  moon: Moon,
  hourglass: Hourglass,
  gift: Gift,
  timer: Timer,
  "folder-plus": FolderPlus,
};

type AchievementItem = {
  key: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
};

type Payload = {
  items: AchievementItem[];
  unlockedCount: number;
  totalCount: number;
};

export default function AchievementsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/achievements")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setData({ items: [], unlockedCount: 0, totalCount: 0 });
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
        <Skeleton className="mb-6 h-4 w-32" />
        <Skeleton className="mb-8 h-1.5 w-full rounded-full" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const items = data!.items;
  const progress =
    data!.totalCount === 0 ? 0 : data!.unlockedCount / data!.totalCount;

  return (
    <div className="mx-auto max-w-3xl px-6 pt-20 pb-12 sm:px-10 sm:pt-14">
      <header className="mb-6">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
          Achievements
        </h1>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {data!.unlockedCount} of {data!.totalCount} unlocked
        </p>
      </header>

      {/* Progress bar */}
      <div
        className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${Math.max(2, Math.round(progress * 100))}%`,
            backgroundColor: "#FFC107",
          }}
        />
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-card px-5 py-10 text-center shadow-card">
          <p className="text-sm text-muted-foreground">
            No achievements defined yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {items.map((a) => {
            const Icon = ICONS[a.icon] ?? Award;
            const LockIcon = Lock;
            return (
              <div
                key={a.key}
                className={`flex items-start gap-3 rounded-2xl p-4 transition-colors ${
                  a.unlocked
                    ? "bg-card shadow-card"
                    : "bg-card/40"
                }`}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={
                    a.unlocked
                      ? {
                          backgroundColor: "rgba(255,193,7,0.18)",
                          color: "#FFC107",
                        }
                      : {
                          backgroundColor: "var(--muted)",
                          color: "var(--muted-foreground)",
                        }
                  }
                >
                  {a.unlocked ? <Icon size={18} /> : <LockIcon size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-medium ${
                        a.unlocked ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {a.title}
                    </span>
                    {a.unlocked && a.unlockedAt && (
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {new Date(a.unlockedAt).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
