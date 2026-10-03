import { useCallback, useEffect, useState } from "react"
import { listNotes, searchNotes, type Note } from "./api"

const SEARCH_DELAY_MS = 300

// Loads the signed-in user's notes, or search results when a query is typed.
// Typing is debounced so we do not call the API on every keystroke.
export function useNotes(query: string) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setNotes(query.trim() ? await searchNotes(query) : await listNotes())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    const timer = setTimeout(load, query ? SEARCH_DELAY_MS : 0)
    return () => clearTimeout(timer)
  }, [load, query])

  return { notes, loading, error, reload: load }
}
