// Place this file at: apps/web/src/app/page.tsx

"use client"

import { useState } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

type RepoStatus = "processing" | "extracted" | "indexing" | "indexed" | "failed"

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

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [repoId, setRepoId] = useState<string | null>(null)
  const [status, setStatus] = useState<RepoStatus | null>(null)
  const [question, setQuestion] = useState("")
  const [result, setResult] = useState<QueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}>
      <h1>Signal</h1>

      {error && (
        <div
          style={{
            background: "#fee",
            border: "1px solid #f00",
            color: "#900",
            padding: 12,
            marginBottom: 16,
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </div>
      )}

      <section style={{ marginBottom: 32 }}>
        <h2>1. Upload a repo</h2>
        <input
          type="file"
          accept=".zip"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button onClick={handleUpload} disabled={!file || loading}>
          Upload
        </button>
        {status && <p>Status: {status}</p>}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>2. Ask a question</h2>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What does the root layout component do?"
          disabled={status !== "indexed"}
          style={{ width: "100%" }}
        />
        <button onClick={handleAsk} disabled={status !== "indexed" || loading}>
          Ask
        </button>
      </section>

      {result && (
        <section>
          <h2>Answer</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{result.answer}</p>
          <p>
            <small>
              Confidence: {result.confidence.toFixed(2)} · {result.latency_ms}ms
            </small>
          </p>
        </section>
      )}
    </main>
  )
}
