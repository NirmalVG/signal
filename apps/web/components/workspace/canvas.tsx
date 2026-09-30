"use client"

import { FileCode2, Menu, PanelLeft } from "lucide-react"
import { PipelineStepper } from "@/components/workspace/pipeline-stepper"
import { StatusDot } from "@/components/workspace/status-dot"
import { Button } from "@/components/ui/button"
import { useRepoStatus } from "@/hooks/use-repo-status"
import { useRepos } from "@/hooks/use-repos"
import type { Citation } from "@/lib/api/types"
import { useWorkspaceStore } from "@/store/workspace-store"

// TEMPORARY: lets us test the drawer before real citations exist (F6/F7).
const SAMPLE_CITATION: Citation = {
  file_path: "app/services/answering.py",
  line_number: 74,
  end_line: 82,
  kind: "function",
  similarity: 0.87,
  text: `def _citations_valid(answer_text: str, valid_paths: set[str]) -> bool:
    cited_paths = set(CITATION_PATTERN.findall(answer_text))
    # No citations at all is allowed — what's NOT allowed is
    # citing a path we never actually retrieved.
    return cited_paths.issubset(valid_paths)`,
}

export function Canvas() {
  const activeRepoId = useWorkspaceStore((s) => s.activeRepoId)
  const toggleSidebar = useWorkspaceStore((s) => s.toggleSidebar)
  const setMobileNav = useWorkspaceStore((s) => s.setMobileNav)
  const selectCitation = useWorkspaceStore((s) => s.selectCitation)

  const repos = useRepos()
  const liveStatus = useRepoStatus(activeRepoId)
  // Fall back to the status query's data: right after an upload, the repo
  // list hasn't refetched yet, but useIngest already seeded this cache entry
  // (with the repo name) — so the UI never flashes "Select a repository".
  const repo = repos.data?.find((r) => r.id === activeRepoId) ?? liveStatus.data
  const status = liveStatus.data?.status ?? repo?.status

  return (
    <main className="flex h-dvh min-w-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 md:px-4">
        {/* Two buttons, one visible per breakpoint — CSS picks, no JS needed */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open repositories"
          onClick={() => setMobileNav(true)}
        >
          <Menu />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex"
          aria-label="Toggle sidebar"
          onClick={toggleSidebar}
        >
          <PanelLeft />
        </Button>

        {repo && status && (
          <div className="flex min-w-0 items-center gap-2.5">
            <StatusDot status={status} />
            <h1 className="truncate text-[15px] font-semibold">{repo.name}</h1>
            <span className="font-mono text-[11px] text-text-muted">
              {status}
            </span>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[840px] px-4 py-10 md:px-8">
          {!repo || !status ? (
            <div className="rounded-xl border border-dashed border-border-strong p-10 text-center">
              <p className="text-base font-semibold">Select a repository</p>
              <p className="mt-1 text-sm text-text-muted">
                Pick one from the sidebar, or drop a .zip to add a new one.
              </p>
            </div>
          ) : status !== "indexed" ? (
            <PipelineStepper status={status} repoName={repo.name} />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">
                Chat thread arrives in the next step.
              </p>
              <Button
                variant="secondary"
                onClick={() => selectCitation(SAMPLE_CITATION)}
              >
                <FileCode2 /> Open sample citation
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom dock — persistent on every breakpoint (real composer: next step) */}
      <div className="shrink-0 border-t border-border bg-surface p-3 md:p-4">
        <div className="mx-auto w-full max-w-[840px]">
          <div className="rounded-lg border-[1.5px] border-border bg-surface px-5 py-4 text-sm text-text-faint">
            Ask anything about this codebase…
          </div>
        </div>
      </div>
    </main>
  )
}
