"use client"

import { useMemo, type ReactNode } from "react"
import Markdown, { type Components } from "react-markdown"
import { CitationChip } from "@/components/chat/citation-chip"
import type { Citation } from "@/lib/api/types"
import {
  linkifyCitations,
  parseCitationHref,
  resolveCitation,
} from "@/lib/citations"

// Renders LLM output. react-markdown builds React elements (never raw HTML),
// so a model that emits <script> or javascript: links can't execute anything.
// Treat model output as untrusted input, exactly like user input.
function buildComponents(context: Citation[]): Components {
  return {
    a({ href, children }) {
      const ref = parseCitationHref(href)
      const citation = ref && resolveCitation(context, ref.path, ref.line)
      if (citation) return <CitationChip citation={citation} />

      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline underline-offset-2"
        >
          {children as ReactNode}
        </a>
      )
    },
    p: ({ children }) => (
      <p className="mb-3 text-base leading-[26px] last:mb-0">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="mb-3 list-disc space-y-1.5 pl-5 text-base leading-[26px] marker:text-text-faint last:mb-0">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-base leading-[26px] marker:text-text-faint last:mb-0">
        {children}
      </ol>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    h1: ({ children }) => (
      <h3 className="mb-2 mt-4 text-base font-semibold">{children}</h3>
    ),
    h2: ({ children }) => (
      <h3 className="mb-2 mt-4 text-base font-semibold">{children}</h3>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 mt-4 text-base font-semibold">{children}</h3>
    ),
    // Inline code. Inside a <pre> the reset classes below cancel this styling.
    code: ({ children }) => (
      <code className="rounded-sm bg-surface-hover px-1 py-0.5 font-mono text-[13px] font-medium">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="mb-3 overflow-x-auto rounded-lg border border-border bg-background p-4 font-mono text-xs leading-5 last:mb-0 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-xs [&>code]:font-normal">
        {children}
      </pre>
    ),
  }
}

export function AnswerMarkdown({
  text,
  context,
}: {
  text: string
  context: Citation[]
}) {
  const source = useMemo(() => linkifyCitations(text, context), [text, context])
  // Stable across renders: a new `components` object would remount the tree.
  const components = useMemo(() => buildComponents(context), [context])

  return <Markdown components={components}>{source}</Markdown>
}
