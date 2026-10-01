import type {
  AppConfig,
  IngestResponse,
  QueryResponse,
  Repo,
  RepoFile,
} from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

// A dedicated error type lets the UI branch on `error.status`
// (e.g. show "file too large" for 413) instead of parsing message strings.
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, init)

  if (!res.ok) {
    // FastAPI puts human-readable errors in `detail`; fall back to raw text.
    let message = res.statusText
    try {
      const body = await res.json()
      message = typeof body.detail === "string" ? body.detail : message
    } catch {
      // body wasn't JSON — keep statusText
    }
    throw new ApiError(res.status, message)
  }

  return res.json() as Promise<T>
}

export const api = {
  getConfig: () => request<AppConfig>("/config"),

  listRepos: () => request<Repo[]>("/repos"),

  getRepoStatus: (repoId: string) => request<Repo>(`/repos/${repoId}/status`),

  deleteRepo: (repoId: string) =>
    request<{ deleted: string }>(`/repos/${repoId}`, { method: "DELETE" }),

  getRepoFile: (repoId: string, path: string) =>
    request<RepoFile>(`/repos/${repoId}/file?path=${encodeURIComponent(path)}`),

  ingestRepo: (file: File) => {
    // No Content-Type header here on purpose: the browser must set
    // `multipart/form-data; boundary=...` itself, or the upload breaks.
    const body = new FormData()
    body.append("file", file)
    return request<IngestResponse>("/ingest", { method: "POST", body })
  },

  askQuestion: (repoId: string, question: string) =>
    request<QueryResponse>("/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo_id: repoId, question }),
    }),
}
