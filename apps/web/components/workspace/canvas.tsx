"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Menu, PanelLeft } from "lucide-react"
import { UserMenu } from "@/components/auth/user-menu"
import { ChatThread } from "@/components/chat/chat-thread"
import { Composer } from "@/components/chat/composer"
import { PipelineStepper } from "@/components/workspace/pipeline-stepper"
import { StatusDot } from "@/components/workspace/status-dot"
import { Button, buttonVariants } from "@/components/ui/button"
import { useChat } from "@/hooks/use-chat"
import { useRepoStatus } from "@/hooks/use-repo-status"
import { useRepos } from "@/hooks/use-repos"
import type { AuthUser } from "@/lib/auth/user"
import { useWorkspaceStore } from "@/store/workspace-store"

export function Canvas({ user }: { user: AuthUser | null }) {
  const activeRepoId = useWorkspaceStore((s) => s.activeRepoId)
  const setActiveRepo = useWorkspaceStore((s) => s.setActiveRepo)
  const toggleSidebar = useWorkspaceStore((s) => s.toggleSidebar)
  const setMobileNav = useWorkspaceStore((s) => s.setMobileNav)

  const isGuest = user === null

  const repos = useRepos()
  const liveStatus = useRepoStatus(activeRepoId)
  const chat = useChat(activeRepoId)

  // Guests land on a ready-to-ask sample repo instead of an empty
  // "Select a repository" screen. Runs only for guests, and only while
  // nothing is selected, so it never overrides a deliberate choice.
  useEffect(() => {
    if (!isGuest || activeRepoId) return
    const sample = repos.data?.find((r) => r.status === "indexed")
    if (sample) setActiveRepo(sample.id)
  }, [isGuest, activeRepoId, repos.data, setActiveRepo])

  // Fall back to the status query's data: right after an upload, the repo
  // list hasn't refetched yet, but useIngest already seeded this cache entry
  // (with the repo name) — so the UI never flashes "Select a repository".
  const repo = repos.data?.find((r) => r.id === activeRepoId) ?? liveStatus.data
  const status = liveStatus.data?.status ?? repo?.status
  const ready = status === "indexed"

  const placeholder = !repo
    ? "Select a repository to start"
    : ready
      ? "Ask anything about this codebase…"
      : "Available once indexing finishes…"

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

        {/* Account controls, pushed to the far right */}
        <div className="ml-auto shrink-0">
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Link
              href="/login"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {ready ? (
          <ChatThread messages={chat.messages} onAsk={chat.send} />
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="mx-auto w-full max-w-[840px] px-4 py-10 md:px-8">
              {!repo || !status ? (
                <div className="rounded-xl border border-dashed border-border-strong p-10 text-center">
                  <p className="text-base font-semibold">Select a repository</p>
                  <p className="mt-1 text-sm text-text-muted">
                    {isGuest
                      ? "Pick a sample repository from the sidebar, or sign in to add your own."
                      : "Pick one from the sidebar, or drop a .zip to add a new one."}
                  </p>
                </div>
              ) : (
                <PipelineStepper status={status} repoName={repo.name} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom dock — persistent on every breakpoint */}
      <div className="shrink-0 border-t border-border bg-surface p-3 md:p-4">
        <div className="mx-auto w-full max-w-[840px]">
          <Composer
            disabled={!ready}
            placeholder={placeholder}
            onSend={chat.send}
          />
        </div>
      </div>
    </main>
  )
}
