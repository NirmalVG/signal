import type { Citation } from "@/lib/api/types"

// The backend prompt makes the model cite as [file_path:line_number] and
// normalizes brackets to plain ASCII (answering.py). This matches that shape.
const CITATION_RE = /\[([^\][:]+):(\d+)\]/g

const HREF_PREFIX = "#cite:"

export function basename(path: string): string {
  return path.split("/").pop() ?? path
}

/** "auth.ts:42-58", or "auth.ts:42" for single-line chunks. */
export function formatRange(c: Citation): string {
  const range =
    c.end_line > c.line_number
      ? `${c.line_number}-${c.end_line}`
      : `${c.line_number}`
  return `${basename(c.file_path)}:${range}`
}

/**
 * Map a [path:line] mention back to a chunk the backend actually retrieved.
 * Preference order: exact start line → a chunk whose range contains the line
 * → any chunk from that file (the backend only guarantees the PATH is real).
 */
export function resolveCitation(
  context: Citation[],
  path: string,
  line: number,
): Citation | undefined {
  const sameFile = context.filter((c) => c.file_path === path)
  return (
    sameFile.find((c) => c.line_number === line) ??
    sameFile.find((c) => line >= c.line_number && line <= c.end_line) ??
    sameFile[0]
  )
}

function buildHref(path: string, line: number): string {
  // encodeURIComponent leaves ( and ) alone, but a ")" inside a markdown
  // link destination ends the link early — and Next.js route groups like
  // app/(auth)/page.tsx contain exactly that. Escape them by hand.
  const safe = encodeURIComponent(path).replace(
    /[()]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`,
  )
  return `${HREF_PREFIX}${safe}:${line}`
}

export function parseCitationHref(
  href: string | undefined,
): { path: string; line: number } | null {
  if (!href?.startsWith(HREF_PREFIX)) return null
  const rest = href.slice(HREF_PREFIX.length)
  const split = rest.lastIndexOf(":")
  if (split === -1) return null
  const line = Number(rest.slice(split + 1))
  if (!Number.isInteger(line)) return null
  return { path: decodeURIComponent(rest.slice(0, split)), line }
}

/**
 * Turn "[app/main.py:42]" into a markdown link the renderer can swap for a
 * clickable chip. Only mentions that resolve to a retrieved chunk are
 * converted (so "arr[0:5]" stays plain text), and fenced code blocks are
 * skipped entirely.
 */
export function linkifyCitations(
  markdown: string,
  context: Citation[],
): string {
  return markdown
    .split(/(```[\s\S]*?```)/g)
    .map((part, i) => {
      if (i % 2 === 1) return part // odd indexes are the code fences
      return part.replace(
        CITATION_RE,
        (whole, rawPath: string, rawLine: string) => {
          const path = rawPath.trim()
          const line = Number(rawLine)
          // Link text is a placeholder on purpose: a path like __init__.py
          // inside link text could be misread as markdown bold.
          return resolveCitation(context, path, line)
            ? `[c](${buildHref(path, line)})`
            : whole
        },
      )
    })
    .join("")
}
