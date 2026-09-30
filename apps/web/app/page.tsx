// Place this file at: apps/web/src/app/page.tsx

"use client"

import { useEffect, useState, type ReactNode } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

type RepoStatus = "processing" | "extracted" | "indexing" | "indexed" | "failed"

interface Repo {
  id: string
  name: string
  status: RepoStatus
  ingested_at: string | null
}

interface Citation {
  file_path: string
  line_number: number
  end_line: number
  text: string
  kind: string
  similarity: number
}

interface QueryResponse {
  answer: string
  context: Citation[]
  confidence: number
  latency_ms: number
}

const STATUS_STYLES: Record<RepoStatus, string> = {
  processing: "bg-tertiary-container text-on-tertiary-container",
  extracted: "bg-tertiary-container text-on-tertiary-container",
  indexing: "bg-tertiary-container text-on-tertiary-container",
  indexed: "bg-secondary-container text-on-secondary-container",
  failed: "bg-error-container text-on-error-container",
}

function StatusBadge({ status }: { status: RepoStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  )
}

// Splits answer text on [file_path:line] citations and renders each match as
// a styled chip instead of raw bracket text — the citations are real data
// (validated server-side in answering.py), this just changes how they render.
function renderAnswerWithCitations(text: string): ReactNode[] {
  const pattern = /\[([^\]:]+):(\d+)\]/g
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    const [, filePath, line] = match
    nodes.push(
      <span
        key={key++}
        className="mx-0.5 inline-flex items-center gap-1 rounded-sm border border-secondary/25 bg-secondary-container px-1.5 py-0.5 align-middle font-mono text-[11px] font-semibold text-on-secondary-container"
      >
        {filePath}:{line}
      </span>,
    )
    lastIndex = pattern.lastIndex
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }
  return nodes
}

function CodePane({ citation }: { citation: Citation }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-2">
        <span className="truncate font-mono text-xs text-text-muted">
          {citation.file_path}
          <span className="text-text-faint">
            :{citation.line_number}-{citation.end_line}
          </span>
        </span>
        <span className="shrink-0 rounded-sm bg-secondary-container px-1.5 py-0.5 font-mono text-[11px] font-semibold text-on-secondary-container">
          {Math.round(citation.similarity * 100)}%
        </span>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-xs leading-relaxed">
        <code className="font-mono text-text">{citation.text}</code>
      </pre>
    </div>
  )
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [repoId, setRepoId] = useState<string | null>(null)
  const [status, setStatus] = useState<RepoStatus | null>(null)
  const [question, setQuestion] = useState("")
  const [result, setResult] = useState<QueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [repos, setRepos] = useState<Repo[]>([])

  useEffect(() => {
    fetchRepos()
  }, [])

  async function fetchRepos() {
    try {
      const res = await fetch(`${API_URL}/api/repos`)
      if (!res.ok) return // non-fatal — the page still works without the list
      const data: Repo[] = await res.json()
      setRepos(data)
    } catch {
      // Silently skip — an empty repo list just means "no history yet",
      // not a broken page.
    }
  }

  function selectRepo(repo: Repo) {
    setRepoId(repo.id)
    setStatus(repo.status)
    setResult(null)
    setError(null)
  }

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`${API_URL}/api/ingest`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Upload failed (${res.status}): ${text}`)
      }

      const data = await res.json()
      setRepoId(data.repo_id)
      setStatus(data.status)
      pollStatus(data.repo_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setLoading(false)
    }
  }

  function pollStatus(id: string) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/repos/${id}/status`)

        if (!res.ok) {
          const text = await res.text()
          throw new Error(`Status check failed (${res.status}): ${text}`)
        }

        const data = await res.json()
        setStatus(data.status)

        if (data.status === "indexed" || data.status === "failed") {
          clearInterval(interval)
          setLoading(false)
          fetchRepos() // refresh the list so the newly-indexed repo appears
        }
      } catch (err) {
        clearInterval(interval)
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      }
    }, 2000)
  }

  async function handleAsk() {
    if (!repoId || !question) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: repoId, question }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Query failed (${res.status}): ${text}`)
      }

      const data: QueryResponse = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`${API_URL}/api/repos/${id}`, { method: "DELETE" })
      setRepos((prev) => prev.filter((r) => r.id !== id))
      if (repoId === id) {
        setRepoId(null)
        setStatus(null)
        setResult(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Ambient indigo glow — "Atmospheric Layering" from the Brand & Style
          section. Purely decorative: aria-hidden, no pointer events. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative mx-auto flex max-w-[840px] flex-col gap-8 px-6 py-16 sm:px-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl">
            Signal
          </h1>
          <p className="text-base text-text-muted">
            Ask your codebase anything. Cited answers, no guesswork.
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container">
            {error}
          </div>
        )}

        {/* Your repositories */}
        {repos.length > 0 && (
          <section className="rounded-lg border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_1px_2px_rgba(15,23,42,0.02)]">
            <h2 className="mb-4 text-lg font-semibold text-text">
              Your repositories
            </h2>
            <div className="flex flex-col gap-2">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  className={`flex items-center justify-between rounded-md border px-4 py-3 transition-colors ${
                    repoId === repo.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border-strong hover:bg-background"
                  }`}
                >
                  <button
                    onClick={() => selectRepo(repo)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span className="truncate font-mono text-sm text-text">
                      {repo.name}
                    </span>
                    <StatusBadge status={repo.status} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(repo.id)
                    }}
                    title="Delete repository"
                    className="ml-3 rounded-md p-1.5 text-text-faint transition-colors hover:bg-error-container hover:text-on-error-container"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Step 1 — Upload */}
        <section className="rounded-lg border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_1px_2px_rgba(15,23,42,0.02)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">
              1. Upload a repository
            </h2>
            {status && <StatusBadge status={status} />}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-md border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-border-strong hover:bg-background">
              {file ? file.name : "Choose .zip file"}
              <input
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-on-primary transition-all hover:bg-primary-hover hover:shadow-[0_4px_14px_rgba(99,102,241,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
            >
              Upload
            </button>
          </div>
        </section>

        {/* Step 2 — Ask */}
        <section className="rounded-lg border border-border bg-surface p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_1px_2px_rgba(15,23,42,0.02)]">
          <h2 className="mb-4 text-lg font-semibold text-text">
            2. Ask a question
          </h2>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What does the root layout component do?"
              disabled={status !== "indexed"}
              className="flex-1 rounded-2xl border-[1.5px] border-border bg-surface px-5 py-4 text-sm text-text placeholder:text-text-faint transition-all focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-background disabled:text-text-faint"
            />
            <button
              onClick={handleAsk}
              disabled={status !== "indexed" || loading}
              className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-on-primary transition-all hover:bg-primary-hover hover:shadow-[0_4px_14px_rgba(99,102,241,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
            >
              Ask
            </button>
          </div>
        </section>

        {/* Answer */}
        {result && (
          <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-[0_10px_25px_-5px_rgba(99,102,241,0.08),0_8px_10px_-6px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text">Answer</h2>
              <div className="flex items-center gap-2 font-mono text-[11px] text-text-muted">
                <span className="rounded-sm bg-background px-1.5 py-0.5">
                  confidence {result.confidence.toFixed(2)}
                </span>
                <span className="rounded-sm bg-background px-1.5 py-0.5">
                  {result.latency_ms}ms
                </span>
              </div>
            </div>

            <p className="whitespace-pre-wrap text-base leading-[1.6] text-text">
              {renderAnswerWithCitations(result.answer)}
            </p>

            {result.context.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Sources
                </h3>
                {result.context.map((c) => (
                  <CodePane
                    key={`${c.file_path}:${c.line_number}:${c.kind}`}
                    citation={c}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
