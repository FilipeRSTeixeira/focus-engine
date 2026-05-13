"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";

/**
 * Things-style points indicator.
 *
 * Was previously a filled primary pill; now a subtle star + tabular number,
 * with the number animating to the new value over ~800ms.
 */
export function PointsBadge({ points }: { points: number }) {
  const [display, setDisplay] = useState(points);

  useEffect(() => {
    if (display === points) return;
    const start = display;
    const diff = points - start;
    const duration = 800;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }, [points, display]);

  return (
    <span
      className="inline-flex items-center gap-1 text-sm font-medium text-foreground"
      title={`${display} pontos hoje`}
    >
      <Star size={14} className="fill-current" style={{ color: "#FFC107" }} />
      <span className="tabular-nums">{display}</span>
    </span>
  );
}
