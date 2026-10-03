import { useState } from "react"
import { deleteNote } from "./api"
import { useNotes } from "./useNotes"

export function NoteList() {
  const [query, setQuery] = useState("")
  const { notes, loading, error, reload } = useNotes(query)

  async function handleDelete(id: number) {
    await deleteNote(id)
    await reload()
  }

  return (
    <section>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search your notes"
        aria-label="Search notes"
      />

      {error && <p role="alert">{error}</p>}
      {loading && <p>Loading…</p>}
      {!loading && notes.length === 0 && <p>No notes found.</p>}

      <ul>
        {notes.map((note) => (
          <li key={note.id}>
            <strong>{note.pinned ? "📌 " : ""}{note.title}</strong>
            <p>{note.body}</p>
            <button onClick={() => handleDelete(note.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
