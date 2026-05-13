"use client";

export function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-400">
      <span>🔥</span>
      {streak}
    </span>
  );
}
