"use client";

import { useEffect } from "react";
import {
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  motion,
} from "framer-motion";

/**
 * A number that smoothly tweens between values using a spring.
 *
 * Honours `prefers-reduced-motion` by snapping to the new value when the user
 * has reduced-motion enabled.
 *
 *   <AnimatedNumber value={points} />
 *
 * Tabular-nums is applied automatically so widths don't jitter mid-animation.
 */
export function AnimatedNumber({
  value,
  className = "",
  duration = 700,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  const mv = useMotionValue(value);
  const spring = useSpring(mv, {
    stiffness: 120,
    damping: 18,
    mass: 0.6,
  });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    if (reduced) {
      // Snap immediately so the spring never wobbles.
      mv.jump(value);
      return;
    }
    mv.set(value);
  }, [value, reduced, mv]);

  // `duration` retained for API back-compat; the spring is calibrated for ~700ms feel.
  void duration;

  return (
    <motion.span className={`tabular-nums ${className}`}>{display}</motion.span>
  );
}
