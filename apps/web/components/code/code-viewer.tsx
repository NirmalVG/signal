"use client"

import { useLayoutEffect, useRef } from "react"
import { Highlight, type PrismTheme } from "prism-react-renderer"
import { cn } from "@/lib/utils"

// We only want prism's TOKENIZER, not its colors — colors come from our own
// design tokens below, so the theme is deliberately empty.
const EMPTY_THEME: PrismTheme = { plain: {}, styles: [] }

// Tokenizing thousands of lines on the main thread would stall the drawer's
// slide animation, so very large files fall back to plain text.
const MAX_HIGHLIGHT_LINES = 1500

// First matching token type wins. Everything else inherits the base color.
const CLASS_BY_TYPE: Record<string, string> = {
  comment: "text-syntax-comment italic",
  prolog: "text-syntax-comment italic",
  doctype: "text-syntax-comment italic",
  keyword: "text-syntax-keyword",
  builtin: "text-syntax-keyword",
  tag: "text-syntax-keyword",
  atrule: "text-syntax-keyword",
  selector: "text-syntax-keyword",
  string: "text-syntax-string",
  char: "text-syntax-string",
  "attr-value": "text-syntax-string",
  regex: "text-syntax-string",
  url: "text-syntax-string",
  number: "text-syntax-number",
  boolean: "text-syntax-number",
  constant: "text-syntax-number",
  symbol: "text-syntax-number",
  function: "text-syntax-function font-semibold",
  "class-name": "text-syntax-function font-semibold",
  punctuation: "text-text-muted",
  operator: "text-text-muted",
}

function tokenClass(types: string[]): string | undefined {
  for (const t of types) if (CLASS_BY_TYPE[t]) return CLASS_BY_TYPE[t]
}

export function CodeViewer({
  code,
  firstLine,
  grammar,
  highlight,
}: {
  code: string
  /** Line number of the first line of `code` (1 for a whole file). */
  firstLine: number
  grammar: string
  /** Inclusive line range to emphasize, in the same numbering as firstLine. */
  highlight: { start: number; end: number }
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const lineCount = code.split("\n").length
  const language = lineCount > MAX_HIGHLIGHT_LINES ? "plain" : grammar

  // Bring the cited range into view, about a third of the way down so the
  // lines above it still give context. Measured before paint: no flash.
  useLayoutEffect(() => {
    const box = scrollRef.current
    const row = box?.querySelector<HTMLElement>(
      `[data-line="${highlight.start}"]`,
    )
    if (box && row)
      box.scrollTop = Math.max(0, row.offsetTop - box.clientHeight * 0.3)
  }, [highlight.start, code])

  return (
    <div ref={scrollRef} className="relative h-full overflow-auto bg-surface">
      <Highlight
        code={code.replace(/\n$/, "")}
        language={language}
        theme={EMPTY_THEME}
      >
        {({ tokens }) => (
          // min-w-max: rows grow to the longest line instead of wrapping, so
          // the highlight bar spans the full scrollable width.
          <div className="min-w-max py-3 font-mono text-xs leading-5">
            {tokens.map((line, i) => {
              const n = firstLine + i
              const active = n >= highlight.start && n <= highlight.end
              return (
                <div
                  key={n}
                  data-line={n}
                  // A transparent border on EVERY row reserves the 3px, so
                  // highlighting a row never shifts its text sideways.
                  className={cn(
                    "flex border-l-[3px]",
                    active
                      ? "border-secondary bg-secondary-container"
                      : "border-transparent bg-surface hover:bg-surface-hover",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="sticky left-0 w-12 shrink-0 select-none bg-inherit pr-4 text-right text-text-faint"
                  >
                    {n}
                  </span>
                  <span className="whitespace-pre pr-6">
                    {line.map((token, k) => (
                      <span key={k} className={tokenClass(token.types)}>
                        {token.content}
                      </span>
                    ))}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Highlight>
    </div>
  )
}

export function CodeViewerSkeleton() {
  const widths = [
    "w-2/5",
    "w-3/5",
    "w-1/2",
    "w-4/5",
    "w-2/3",
    "w-1/3",
    "w-3/4",
    "w-1/2",
    "w-3/5",
  ]
  return (
    <div aria-busy="true" aria-label="Loading file" className="space-y-2.5 p-4">
      {widths.map((w, i) => (
        <div
          key={i}
          className={cn(
            "h-3 animate-shimmer rounded-full bg-[length:200%_100%] bg-[linear-gradient(90deg,var(--color-border)_25%,var(--color-background)_50%,var(--color-border)_75%)]",
            w,
          )}
        />
      ))}
    </div>
  )
}
