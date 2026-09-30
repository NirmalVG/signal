import type { RepoStatus } from "@/lib/api/types"

// Color carries meaning (DESIGN.md): teal = verified/ready, amber = in
// progress, red = failed. Pulse = "something is happening right now".
const STYLES: Record<RepoStatus, string> = {
  indexed: "bg-secondary shadow-[0_0_8px_rgb(13_148_136_/_0.35)]",
  processing: "bg-tertiary animate-pulse",
  extracted: "bg-tertiary animate-pulse",
  indexing: "bg-tertiary animate-pulse",
  failed: "bg-error",
}

export function StatusDot({ status }: { status: RepoStatus }) {
  // aria-hidden: the dot is decoration. The status is always also written
  // as text next to it, so color is never the only signal.
  return (
    <span
      aria-hidden="true"
      className={`size-2 shrink-0 rounded-full ${STYLES[status]}`}
    />
  )
}
