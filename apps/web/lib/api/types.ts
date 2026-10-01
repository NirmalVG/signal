// Mirrors the FastAPI response shapes (apps/api/app/routes + services).
// If a backend response changes, this is the ONE place the frontend learns about it.

export type RepoStatus =
  | "processing"
  | "extracted"
  | "indexing"
  | "indexed"
  | "failed"

export interface Repo {
  id: string
  name: string
  status: RepoStatus
  ingested_at: string | null
}

export interface IngestResponse {
  repo_id: string
  name: string
  status: RepoStatus
}

export interface Citation {
  file_path: string
  line_number: number
  end_line: number
  text: string
  kind: string
  similarity: number
}

export interface QueryResponse {
  answer: string
  context: Citation[]
  confidence: number
  latency_ms: number
}

// Non-secret server flags (GET /api/config) the UI adapts itself to.
export interface AppConfig {
  read_only: boolean
}

export interface RepoFile {
  path: string
  content: string
  line_count: number
}

// A status is "terminal" when polling can stop — nothing will change it again.
export const isTerminalStatus = (s: RepoStatus) =>
  s === "indexed" || s === "failed"
