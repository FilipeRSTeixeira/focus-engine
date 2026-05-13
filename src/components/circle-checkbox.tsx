"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

/**
 * Things-style circular checkbox.
 *
 * - Unchecked: empty circle with a 1.5px border.
 * - Hover: border tightens to the foreground colour.
 * - Checked: fills with `fillColor` (defaults to the brand primary) and
 *   draws a white check, with a brief spring-in animation.
 *
 * The button is fully accessible (role=checkbox, aria-checked, keyboard
 * activatable). `onChange` is invoked on click; the parent owns the state.
 *
 * Reusable across the dashboard, /tasks, and anywhere a "mark done" affordance
 * is needed.
 */
export function CircleCheckbox({
  checked,
  onChange,
  size = 20,
  fillColor,
  label,
  disabled = false,
  className = "",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Outer diameter in px. Default 20. */
  size?: number;
  /** Colour to fill when checked. Defaults to var(--primary). */
  fillColor?: string;
  /** Accessible label (read by screen readers). */
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [animate, setAnimate] = useState(false);

  // Pop the check in with a small spring whenever it transitions to checked.
  useEffect(() => {
    if (checked) {
      setAnimate(true);
      const t = setTimeout(() => setAnimate(false), 320);
      return () => clearTimeout(t);
    }
  }, [checked]);

  const fill = fillColor ?? "var(--primary)";

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`group/check relative inline-flex shrink-0 items-center justify-center rounded-full outline-none transition-[transform,border-color,background-color] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{
        width: size,
        height: size,
        border: checked ? `1.5px solid ${fill}` : "1.5px solid var(--border)",
        backgroundColor: checked ? fill : "transparent",
      }}
    >
      {/* Hover ring (only visible when unchecked) */}
      {!checked && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity group-hover/check:opacity-100"
          style={{
            border: "1.5px solid var(--foreground)",
            borderRadius: "9999px",
          }}
        />
      )}

      {/* Check mark */}
      <span
        aria-hidden
        className="pointer-events-none flex items-center justify-center transition-transform"
        style={{
          transform: checked
            ? animate
              ? "scale(1.15)"
              : "scale(1)"
            : "scale(0)",
          transition: "transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          color: "white",
        }}
      >
        <Check size={Math.round(size * 0.6)} strokeWidth={3} />
      </span>
    </button>
  );
}
