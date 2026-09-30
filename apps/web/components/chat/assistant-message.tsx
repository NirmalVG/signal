"use client"

import { SignalMark } from "@/components/brand/signal-mark"
import { AnswerMarkdown } from "@/components/chat/answer-markdown"
import { CitationChip } from "@/components/chat/citation-chip"
import { MatchBadge } from "@/components/chat/match-badge"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/store/workspace-store"

type Assistant = Extract<ChatMessage, { role: "assistant" }>

function formatLatency(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

function Skeleton() {
  const bar =
    "h-3 rounded-full animate-shimmer bg-[length:200%_100%] bg-[linear-gradient(90deg,var(--color-border)_25%,var(--color-background)_50%,var(--color-border)_75%)]"
  return (
    <div aria-busy="true" aria-label="Signal is thinking" className="space-y-3">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-text-muted">
        Searching the codebase…
      </p>
      <div className={cn(bar, "w-[92%]")} />
      <div className={cn(bar, "w-[78%]")} />
      <div className={cn(bar, "w-[85%]")} />
      <div className={cn(bar, "w-[40%]")} />
    </div>
  )
}

export function AssistantMessage({ message }: { message: Assistant }) {
  return (
    <div className="flex gap-3">
      <SignalMark className="mt-1 size-7 shrink-0" />

      <article
        className={cn(
          "min-w-0 flex-1 rounded-lg border bg-surface p-5 shadow-level-1",
          message.status === "error"
            ? "border-error/30 bg-error-container/40"
            : "border-border",
        )}
      >
        {message.status === "pending" && <Skeleton />}

        {message.status === "error" && (
          <div role="alert">
            <p className="text-sm font-semibold text-on-error-container">
              Signal couldn&apos;t answer that
            </p>
            <p className="mt-1 text-sm text-on-error-container/90">
              {message.content}
            </p>
          </div>
        )}

        {message.status === "done" && (
          <>
            <AnswerMarkdown text={message.content} context={message.context} />

            <footer className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border pt-4">
              {message.context.length > 0 && (
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                  <span className="mr-1 font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-text-faint">
                    Sources · {message.context.length}
                  </span>
                  {message.context.map((c) => (
                    <CitationChip
                      key={`${c.file_path}:${c.line_number}`}
                      citation={c}
                    />
                  ))}
                </div>
              )}

              <div className="ml-auto flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-semibold">
                {message.context.length > 0 && (
                  <MatchBadge value={message.confidence} />
                )}
                <span
                  title="Time to answer"
                  className="rounded-sm border border-tertiary/25 bg-tertiary-container px-1.5 py-0.5 text-on-tertiary-container"
                >
                  {formatLatency(message.latencyMs)}
                </span>
              </div>
            </footer>
          </>
        )}
      </article>
    </div>
  )
}
