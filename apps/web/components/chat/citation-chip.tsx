"use client"

import { FileCode2 } from "lucide-react"
import type { Citation } from "@/lib/api/types"
import { formatRange } from "@/lib/citations"
import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/store/workspace-store"

// DESIGN.md "Citation Chips (RAG Sourced)": teal tint, mono 11px/600,
// file icon + line range, Level-2 shadow on hover.
export function CitationChip({ citation }: { citation: Citation }) {
  const selected = useWorkspaceStore((s) => s.selectedCitation)
  const selectCitation = useWorkspaceStore((s) => s.selectCitation)

  const active =
    selected?.file_path === citation.file_path &&
    selected.line_number === citation.line_number

  return (
    <button
      type="button"
      onClick={() => selectCitation(active ? null : citation)}
      aria-pressed={active}
      title={`${citation.file_path}:${citation.line_number}-${citation.end_line}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-1 align-baseline",
        "font-mono text-[11px] font-semibold leading-none",
        "border-secondary/25 bg-secondary-container text-on-secondary-container",
        "transition-[box-shadow,border-color] duration-150 hover:shadow-level-2",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary/30",
        active && "border-secondary shadow-node-glow",
      )}
    >
      <FileCode2 className="size-3 shrink-0" />
      {formatRange(citation)}
    </button>
  )
}
