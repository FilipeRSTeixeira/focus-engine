/**
 * Lightweight skeleton placeholder used in loading states.
 *
 * Uses semantic tokens so it adapts cleanly to light/dark theme.
 * No borders — the new Things-inspired design separates surfaces by
 * background colour and spacing rather than strokes.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-muted/70 ${className}`}
    />
  );
}

/**
 * A typical "card with a few lines" placeholder.
 * Now uses the `shadow-card` utility instead of a hard border.
 */
export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-card">
      <Skeleton className="mb-3 h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`mb-2 h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

/** Stack of skeleton cards — common case for list pages. */
export function SkeletonList({
  count = 3,
  lines = 2,
}: {
  count?: number;
  lines?: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  );
}

/** Row-shaped skeleton — for list items in the Things-style dashboard. */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-1 py-2.5">
      <Skeleton className="h-5 w-5 rounded-full" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-3 w-12" />
    </div>
  );
}
