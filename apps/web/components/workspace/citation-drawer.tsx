"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/store/workspace-store"

export function CitationDrawer() {
  const citation = useWorkspaceStore((s) => s.selectedCitation)
  const selectCitation = useWorkspaceStore((s) => s.selectCitation)
  const open = citation !== null

  // Remember the last citation so its content stays on screen while the
  // panel slides OUT. Without this, closing sets the store value to null and
  // the content vanishes instantly, leaving an empty panel sliding away.
  // (Updating state during render like this is React's documented pattern
  // for "derive state from a changed prop".)
  const [shown, setShown] = useState(citation)
  if (citation && citation !== shown) setShown(citation)

  return (
    <aside
      aria-label="Source citation"
      className={cn(
        "overflow-hidden border-l border-border-strong bg-surface",
        // < xl: a sheet sliding in from the right, over the canvas.
        "fixed inset-y-0 right-0 z-50 w-full max-w-[520px] shadow-level-3",
        "transition-[transform,visibility] duration-300 ease-out",
        open ? "visible translate-x-0" : "invisible translate-x-full",
        // >= xl: a real grid column (width = --drawer-w on the shell).
        "xl:static xl:z-auto xl:w-auto xl:max-w-none xl:translate-x-0 xl:shadow-none",
      )}
    >
      {/* Fixed 40vw inner width at xl so content doesn't reflow mid-animation */}
      <div className="flex h-full w-full flex-col xl:w-[40vw]">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4">
          <span className="truncate font-mono text-xs text-text-muted">
            {shown?.file_path}
            <span className="text-text-faint">
              :{shown?.line_number}-{shown?.end_line}
            </span>
          </span>
          <div className="flex shrink-0 items-center gap-2">
            {shown && (
              <span className="rounded-sm border border-secondary/25 bg-secondary-container px-1.5 py-0.5 font-mono text-[11px] font-semibold text-on-secondary-container">
                {Math.round(shown.similarity * 100)}%
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close citation"
              onClick={() => selectCitation(null)}
            >
              <X />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <pre className="font-mono text-xs leading-5 text-text">
            <code>{shown?.text}</code>
          </pre>
        </div>
      </div>
    </aside>
  )
}
