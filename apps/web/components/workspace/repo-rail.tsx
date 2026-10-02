"use client"

import { useState } from "react"
import Link from "next/link"
import { Trash2 } from "lucide-react"
import { useAuthUser } from "@/components/auth/auth-provider"
import { SignalMark } from "@/components/brand/signal-mark"
import { StatusDot } from "@/components/workspace/status-dot"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { UploadZone } from "@/components/workspace/upload-zone"
import { useAppConfig } from "@/hooks/use-app-config"
import { useDeleteRepo } from "@/hooks/use-delete-repo"
import { useRepos } from "@/hooks/use-repos"
import type { Repo } from "@/lib/api/types"
import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/store/workspace-store"

export function RepoRail() {
  const collapsed = useWorkspaceStore((s) => s.sidebarCollapsed)
  const mobileNavOpen = useWorkspaceStore((s) => s.mobileNavOpen)
  const activeRepoId = useWorkspaceStore((s) => s.activeRepoId)
  const setActiveRepo = useWorkspaceStore((s) => s.setActiveRepo)
  const clearConversation = useWorkspaceStore((s) => s.clearConversation)
  const repos = useRepos()
  const { readOnly } = useAppConfig()
  const { isGuest } = useAuthUser()
  const deleteRepo = useDeleteRepo()
  const [target, setTarget] = useState<Repo | null>(null)

  // Deleting is only offered to signed-in users, and never on a read-only
  // instance. (UI only: the API enforces this for real in Steps 8-9.)
  const canManage = !readOnly && !isGuest

  function closeDialog() {
    setTarget(null)
    deleteRepo.reset() // clear any previous error for next time
  }

  function confirmDelete() {
    if (!target) return
    const id = target.id
    deleteRepo.mutate(id, {
      onSuccess: () => {
        if (activeRepoId === id) setActiveRepo(null)
        clearConversation(id)
        closeDialog()
      },
    })
  }

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
        <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <SignalMark className="size-7" />
            <span className="text-[17px] font-bold tracking-tight">Signal</span>
          </Link>
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
              {isGuest ? (
                "No sample repositories are available right now."
              ) : (
                <>
                  No repositories yet. Upload a{" "}
                  <code className="font-mono">.zip</code> to start asking
                  questions.
                </>
              )}
            </p>
          )}

          <ul className="space-y-1">
            {repos.data?.map((repo) => {
              const active = repo.id === activeRepoId
              return (
                <li key={repo.id} className="group relative">
                  <button
                    onClick={() => setActiveRepo(repo.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md py-2 pl-3 text-left transition-colors duration-150",
                      // Leave room for the trash icon only when it exists.
                      canManage ? "pr-11" : "pr-3",
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

                  {/* A sibling of the select button, NOT a child: interactive
                      elements must never be nested inside a <button>. Always
                      visible on touch screens (no hover there); on desktop it
                      appears on hover or keyboard focus. */}
                  {canManage && (
                    <button
                      onClick={() => setTarget(repo)}
                      aria-label={`Delete ${repo.name}`}
                      className={cn(
                        "absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-text-faint transition-[opacity,background-color,color] duration-150",
                        "hover:bg-error-container hover:text-error",
                        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-error/30",
                        "md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
                      )}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <UploadZone />
      </div>

      <ConfirmDialog
        open={target !== null}
        title="Delete this repository?"
        description={`"${target?.name ?? ""}" will be removed along with its index and chat history. This can't be undone.`}
        confirmLabel="Delete"
        pending={deleteRepo.isPending}
        error={deleteRepo.error?.message}
        onConfirm={confirmDelete}
        onCancel={closeDialog}
      />
    </aside>
  )
}
