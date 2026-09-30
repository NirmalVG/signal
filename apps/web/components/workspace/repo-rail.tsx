"use client"

import { SignalMark } from "@/components/brand/signal-mark"
import { useRepos } from "@/hooks/use-repos"
import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/store/workspace-store"
import { StatusDot } from "@/components/workspace/status-dot"
import { UploadZone } from "@/components/workspace/upload-zone"

export function RepoRail() {
  const collapsed = useWorkspaceStore((s) => s.sidebarCollapsed)
  const mobileNavOpen = useWorkspaceStore((s) => s.mobileNavOpen)
  const activeRepoId = useWorkspaceStore((s) => s.activeRepoId)
  const setActiveRepo = useWorkspaceStore((s) => s.setActiveRepo)
  const repos = useRepos()

  return (
    <aside
      aria-label="Repositories"
      className={cn(
        "flex flex-col overflow-hidden border-r border-border bg-surface",
        // < md: an off-canvas overlay that slides in from the left.
        "fixed inset-y-0 left-0 z-40 w-[280px] shadow-level-3",
        "transition-[transform,visibility] duration-300 ease-out",
        mobileNavOpen ? "visible translate-x-0" : "invisible -translate-x-full",
        // >= md: a normal grid column. Its width is driven by --rail-w on
        // the shell, so we neutralize the overlay styles here.
        "md:static md:z-auto md:w-auto md:translate-x-0 md:shadow-none",
        collapsed ? "md:invisible" : "md:visible",
      )}
    >
      {/* Fixed-width inner wrapper: while the column animates to 0px, the
          content is clipped instead of squashed and re-wrapping. */}
      <div className="flex h-full w-[280px] flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
          <SignalMark className="size-7" />
          <span className="text-[17px] font-bold tracking-tight">Signal</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <h2 className="px-2 pb-2 font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-text-faint">
            Repositories
          </h2>

          {repos.isLoading && (
            <div className="space-y-2" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-11 animate-pulse rounded-md bg-background"
                />
              ))}
            </div>
          )}

          {repos.isError && (
            <p className="rounded-md bg-error-container p-3 text-[13px] text-on-error-container">
              Couldn&apos;t reach the API. Is the backend running?
            </p>
          )}

          {repos.data?.length === 0 && (
            <p className="rounded-lg border border-dashed border-border-strong p-4 text-[13px] leading-[18px] text-text-muted">
              No repositories yet. Upload a{" "}
              <code className="font-mono">.zip</code> to start asking questions.
            </p>
          )}

          <ul className="space-y-1">
            {repos.data?.map((repo) => {
              const active = repo.id === activeRepoId
              return (
                <li key={repo.id}>
                  <button
                    onClick={() => setActiveRepo(repo.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30",
                      active ? "bg-primary/8" : "hover:bg-surface-hover",
                    )}
                  >
                    <StatusDot status={repo.status} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {repo.name}
                      </span>
                      <span className="block font-mono text-[11px] text-text-muted">
                        {repo.status}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <UploadZone />
      </div>
    </aside>
  )
}
