"use client"

import { useEffect, useRef } from "react"
import { AssistantMessage } from "@/components/chat/assistant-message"
import { SignalMark } from "@/components/brand/signal-mark"
import type { ChatMessage } from "@/store/workspace-store"

const SUGGESTIONS = [
  "What does this project do, at a high level?",
  "How is the code organized? Walk me through the main folders.",
  "Where does the app handle errors?",
]

// Distance from the bottom (px) within which we consider the user to be
// "following" the conversation and keep them pinned to the newest message.
const STICK_THRESHOLD = 120

export function ChatThread({
  messages,
  onAsk,
}: {
  messages: ChatMessage[]
  onAsk: (question: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    stickRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // Sending a question always jumps to the bottom; otherwise only follow
    // along if the user hasn't scrolled up to re-read something.
    if (messages.at(-1)?.role === "user") stickRef.current = true
    if (stickRef.current)
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages])

  return (
    <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto">
      <div
        role="log"
        aria-label="Conversation"
        className="mx-auto w-full max-w-[840px] space-y-6 px-4 py-8 md:px-8"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <SignalMark className="size-12" />
            <h2 className="mt-5 text-2xl font-semibold tracking-tight">
              Ask anything about this codebase
            </h2>
            <p className="mt-2 max-w-[46ch] text-sm leading-[22px] text-text-muted">
              Every answer cites the exact files and lines it came from, so you
              can verify it in one click.
            </p>
            <div className="mt-6 flex w-full max-w-[520px] flex-col gap-2">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => onAsk(q)}
                  className="rounded-md border border-border bg-surface px-4 py-3 text-left text-sm font-medium transition-[border-color,background-color,box-shadow] duration-150 hover:border-border-strong hover:bg-surface-hover hover:shadow-level-1 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) =>
            m.role === "user" ? (
              <div
                key={m.id}
                className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-lg rounded-br-sm bg-primary px-4 py-3 text-[15px] leading-6 text-on-primary"
              >
                {m.content}
              </div>
            ) : (
              <AssistantMessage key={m.id} message={m} />
            ),
          )
        )}
      </div>
    </div>
  )
}
