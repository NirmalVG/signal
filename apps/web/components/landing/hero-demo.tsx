"use client"

import { useEffect, useState } from "react"
import { SignalMark } from "@/components/brand/signal-mark"
import { AssistantMessage } from "@/components/chat/assistant-message"
import { StatusDot } from "@/components/workspace/status-dot"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { frameAt, type DemoPhase } from "@/lib/demo-script"
import type { ChatMessage } from "@/store/workspace-store"

type Assistant = Extract<ChatMessage, { role: "assistant" }>

const QUESTION = "How does Signal stop the model from inventing citations?"

// The demo renders the REAL chat components with canned data, so what a
// visitor sees is exactly what the product looks like — no mock-up to drift.
// Illustrative content: line numbers match answering.py at the time of
// writing; update them if that file changes.
const THINKING: Assistant = {
  id: "demo-thinking",
  role: "assistant",
  status: "pending",
  content: "",
  context: [],
  confidence: 0,
  latencyMs: 0,
}

const ANSWER: Assistant = {
  id: "demo-answer",
  role: "assistant",
  status: "done",
  content:
    "After the model answers, Signal **verifies every citation**. Each cited file must be one of the chunks actually retrieved for your question [app/services/answering.py:63].\n\nIf the check fails, the model gets one firmer retry. If that also fails, you get a safe fallback instead of an unverified answer [app/services/answering.py:89].",
  context: [
    {
      file_path: "app/services/answering.py",
      line_number: 63,
      end_line: 67,
      kind: "code_semantic",
      similarity: 0.91,
      text: "",
    },
    {
      file_path: "app/services/answering.py",
      line_number: 89,
      end_line: 101,
      kind: "code_semantic",
      similarity: 0.84,
      text: "",
    },
  ],
  confidence: 0.91,
  latencyMs: 1420,
}

export function HeroDemo() {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<DemoPhase>("typing")
  const [chars, setChars] = useState(0)

  useEffect(() => {
    if (reduced) return
    const start = performance.now()
    const id = window.setInterval(() => {
      const frame = frameAt(performance.now() - start, QUESTION.length)
      // Setting an unchanged primitive is a no-op, so this only re-renders
      // when the visible frame actually changes.
      setPhase(frame.phase)
      setChars(frame.chars)
    }, 30)
    return () => window.clearInterval(id)
  }, [reduced])

  // Reduced motion: skip the choreography and show the finished state.
  const view = reduced
    ? { phase: "answer" as const, chars: QUESTION.length }
    : { phase, chars }

  return (
    <>
      <p className="sr-only">
        Example: asking how Signal stops the model from inventing citations
        returns an answer that cites answering.py, lines 63 to 67 and 89 to 101,
        with a 91 percent match score.
      </p>

      {/* The animation is decorative, so it's hidden from assistive tech
          (the sr-only text above describes it) and made non-interactive. */}
      <div
        aria-hidden="true"
        className="pointer-events-none relative select-none overflow-hidden rounded-xl border border-border bg-surface shadow-level-3"
      >
        <div className="flex h-11 items-center gap-2.5 border-b border-border bg-background px-4">
          <SignalMark className="size-5" />
          <span className="font-mono text-xs font-semibold">signal</span>
          <StatusDot status="indexed" />
          <span className="font-mono text-[11px] text-text-muted">indexed</span>
          <span className="ml-auto rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-text-faint">
            Sample
          </span>
        </div>

        {/* Fixed min-height: the card must not jump as phases change. */}
        <div className="min-h-[430px] space-y-5 bg-surface p-4 md:p-5">
          {view.chars > 0 && (
            <div className="ml-auto w-fit max-w-[92%] rounded-lg rounded-br-sm bg-primary px-4 py-3 text-[15px] leading-6 text-on-primary">
              {QUESTION.slice(0, view.chars)}
              {view.phase === "typing" && (
                <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-white" />
              )}
            </div>
          )}

          {view.phase === "thinking" && (
            <div className="animate-fade-up">
              <AssistantMessage message={THINKING} />
            </div>
          )}
          {view.phase === "answer" && (
            <div className="animate-fade-up">
              <AssistantMessage message={ANSWER} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
