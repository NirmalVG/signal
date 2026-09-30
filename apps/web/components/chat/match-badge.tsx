import { cn } from "@/lib/utils"

// DESIGN.md: teal is reserved for confidence above 90%.
export const VERIFIED_THRESHOLD = 0.9

export function MatchBadge({
  value,
  title = "Similarity of the best-matching code chunk",
  className,
}: {
  value: number
  title?: string
  className?: string
}) {
  const verified = value >= VERIFIED_THRESHOLD
  return (
    <span
      title={title}
      className={cn(
        "rounded-sm border px-1.5 py-0.5 font-mono text-[11px] font-semibold",
        verified
          ? "border-secondary/25 bg-secondary-container text-on-secondary-container"
          : "border-border bg-background text-text-muted",
        className,
      )}
    >
      {Math.round(value * 100)}% match
    </span>
  )
}
