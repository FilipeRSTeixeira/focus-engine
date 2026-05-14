/**
 * Shared motion presets.
 *
 * Everything in this module honours `prefers-reduced-motion`: when the user
 * has reduced motion enabled, transitions collapse to a near-instant fade
 * (or skip entirely). Callers should pass `useReducedMotion()` into the
 * helpers below so that the runtime preference is taken into account.
 */

import type { Transition, Variants } from "framer-motion";

/* -------------------------------------------------------------------------- */
/*                                Transitions                                 */
/* -------------------------------------------------------------------------- */

/** A gentle Apple-style spring — for entrances, layout shifts. */
export const SPRING_GENTLE: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 30,
  mass: 0.8,
};

/** A snappier spring — for button taps, checkbox-style affirmations. */
export const SPRING_SNAPPY: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 28,
  mass: 0.6,
};

/** Instant transition used when the user prefers reduced motion. */
export const REDUCED: Transition = { duration: 0 };

export function pickTransition(
  reduced: boolean,
  full: Transition = SPRING_GENTLE
): Transition {
  return reduced ? REDUCED : full;
}

/* -------------------------------------------------------------------------- */
/*                                  Variants                                  */
/* -------------------------------------------------------------------------- */

/** Container that staggers children in on mount. */
export function listContainer(reduced: boolean): Variants {
  return {
    hidden: {},
    show: {
      transition: reduced
        ? { staggerChildren: 0 }
        : { staggerChildren: 0.04, delayChildren: 0.02 },
    },
  };
}

/** List row that fades + lifts in, exits to the right. */
export function listRow(reduced: boolean): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0 } },
      exit: { opacity: 0, transition: { duration: 0 } },
    };
  }
  return {
    hidden: { opacity: 0, y: 6 },
    show: {
      opacity: 1,
      y: 0,
      transition: SPRING_GENTLE,
    },
    exit: {
      opacity: 0,
      x: 24,
      transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] },
    },
  };
}

/** Toast / HUD that springs from below. */
export function hud(reduced: boolean): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0 } },
      exit: { opacity: 0, transition: { duration: 0 } },
    };
  }
  return {
    hidden: { opacity: 0, y: 12, scale: 0.96 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: SPRING_SNAPPY,
    },
    exit: {
      opacity: 0,
      y: 8,
      scale: 0.98,
      transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] },
    },
  };
}
