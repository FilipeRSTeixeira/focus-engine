"use client";

import { usePathname } from "next/navigation";

/**
 * Subtle fade-in on every route change.
 *
 * We deliberately use a *CSS* animation (via tw-animate-css's `animate-in`
 * utilities) rather than framer-motion. CSS animations always settle at the
 * final keyframe even if JavaScript fails to kick in — which means the page
 * can never get stuck at `opacity: 0` and disappear, as it did on iPadOS
 * Safari with the previous framer-motion implementation.
 *
 * `motion-safe:` gates the animation on `prefers-reduced-motion: no-preference`,
 * so users who asked for less movement see content render instantly.
 *
 * Keying on `pathname` re-mounts the wrapper on each route change so the
 * animation runs anew.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      key={pathname}
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200"
    >
      {children}
    </div>
  );
}
