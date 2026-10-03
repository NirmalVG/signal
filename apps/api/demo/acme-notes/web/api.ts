// Typed client for the Acme Notes API.
// It keeps the access token in memory only and retries when rate limited.

export interface Note {
  id: number
  title: string
  body: string
  pinned: boolean
  updated_at: string
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

const BASE_URL = "http://localhost:8000"
const MAX_RETRIES = 2

let accessToken: string | null = null

export function setToken(token: string | null): void {
  accessToken = token
}

async function request<T>(path: string, init: RequestInit = {}, attempt = 0): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set("Content-Type", "application/json")
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`)

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers })

  // The server says how long to wait with Retry-After; honour it, but give up
  // after a couple of tries instead of looping forever.
  if (response.status === 429 && attempt < MAX_RETRIES) {
    const seconds = Number(response.headers.get("Retry-After") ?? "1")
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
    return request<T>(path, init, attempt + 1)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(response.status, body.detail ?? response.statusText)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

export async function login(email: string, password: string): Promise<void> {
  const { token } = await request<{ token: string }>("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  setToken(token)
}

export const listNotes = () => request<Note[]>("/notes")

export const searchNotes = (query: string) =>
  request<Note[]>(`/search?q=${encodeURIComponent(query)}`)

export const createNote = (title: string, body: string) =>
  request<Note>("/notes", { method: "POST", body: JSON.stringify({ title, body }) })

export const deleteNote = (id: number) => request<void>(`/notes/${id}`, { method: "DELETE" })
