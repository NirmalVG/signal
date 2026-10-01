"use client"

import { Fragment, useState } from "react"
import { ChevronRight, TriangleAlert, X } from "lucide-react"
import { CodeViewer, CodeViewerSkeleton } from "@/components/code/code-viewer"
import { CopyButton } from "@/components/code/copy-button"
import { MatchBadge } from "@/components/chat/match-badge"
import { Button } from "@/components/ui/button"
import { useRepoFile } from "@/hooks/use-repo-file"
import { kindLabel, languageFromPath } from "@/lib/language"
import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/store/workspace-store"

function Crumbs({ path }: { path: string }) {
  const parts = path.split("/")
  // Deep paths keep the last three segments — the ones you actually read.
  const shown = parts.length > 4 ? ["…", ...parts.slice(-3)] : parts
  return (
    <nav
      aria-label="File path"
      title={path}
      className="flex min-w-0 items-center gap-1 font-mono text-xs text-text-muted"
    >
      {shown.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <ChevronRight className="size-3 shrink-0 text-text-faint" />
          )}
          <span
            className={cn(
              "truncate",
              i === shown.length - 1 && "font-semibold text-text",
            )}
          >
            {part}
          </span>
        </Fragment>
      ))}
    </nav>
  )
}

export function CitationDrawer() {
  const citation = useWorkspaceStore((s) => s.selectedCitation)
  const selectCitation = useWorkspaceStore((s) => s.selectCitation)
  const repoId = useWorkspaceStore((s) => s.activeRepoId)
  const open = citation !== null

  // Remember the last citation so its content stays on screen while the
  // panel slides OUT (see F5 — otherwise it empties mid-animation).
  const [shown, setShown] = useState(citation)
  if (citation && citation !== shown) setShown(citation)

  const file = useRepoFile(repoId, shown?.file_path ?? null)
  const { grammar, label } = languageFromPath(shown?.file_path ?? "")
  const range = shown ? { start: shown.line_number, end: shown.end_line } : null

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
          {shown && <Crumbs path={shown.file_path} />}
          <div className="flex shrink-0 items-center gap-1">
            {shown && (
              <MatchBadge
                value={shown.similarity}
                title="How closely this chunk matched your question"
                className="mr-1"
              />
            )}
            {shown && (
              <CopyButton
                key={`${shown.file_path}:${shown.line_number}`}
                text={shown.text}
                label="Copy cited code"
              />
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

        {shown && (
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-surface px-4 py-2 font-mono text-[11px] text-text-muted">
            <span className="rounded-sm border border-border bg-background px-1.5 py-0.5 font-semibold text-text">
              {kindLabel(shown.kind)}
            </span>
            <span>
              Lines {shown.line_number}–{shown.end_line}
            </span>
            <span className="ml-auto text-text-faint">{label}</span>
          </div>
        )}

        <div className="min-h-0 flex-1">
          {shown && range && file.isLoading && <CodeViewerSkeleton />}

          {shown && range && file.data && (
            <CodeViewer
              code={file.data.content}
              firstLine={1}
              grammar={grammar}
              highlight={range}
            />
          )}

          {/* Graceful degradation: if the full file can't be loaded (deleted,
              too large, server down), show the indexed snippet instead of an
              empty panel. */}
          {shown && range && file.isError && (
            <div className="flex h-full flex-col">
              <p className="flex shrink-0 items-start gap-2 bg-tertiary-container px-4 py-2 text-xs leading-4 text-on-tertiary-container">
                <TriangleAlert className="mt-px size-3.5 shrink-0" />
                Couldn&apos;t load the full file, showing the indexed snippet.
              </p>
              <div className="min-h-0 flex-1">
                <CodeViewer
                  code={shown.text}
                  firstLine={shown.line_number}
                  grammar={grammar}
                  highlight={range}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
