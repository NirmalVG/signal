// The Signal logo mark: three rising bars = "signal strength".
// Uses the design token so it re-colors automatically if the theme changes.
export function SignalMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--color-primary)" />
      <rect
        x="8"
        y="17"
        width="3.5"
        height="7"
        rx="1.75"
        fill="#fff"
        opacity=".55"
      />
      <rect
        x="14.25"
        y="12"
        width="3.5"
        height="12"
        rx="1.75"
        fill="#fff"
        opacity=".8"
      />
      <rect x="20.5" y="7" width="3.5" height="17" rx="1.75" fill="#fff" />
    </svg>
  )
}
