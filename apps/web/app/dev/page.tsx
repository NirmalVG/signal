"use client"

// TEMPORARY sanity check for the hooks — delete before real UI work.
import { useState } from "react"
import { useChat } from "@/hooks/use-chat"
import { useIngest } from "@/hooks/use-ingest"
import { useRepos } from "@/hooks/use-repos"
import { useRepoStatus } from "@/hooks/use-repo-status"
import { useWorkspaceStore } from "@/store/workspace-store"

export default function DevPage() {
  const [question, setQuestion] = useState("")

  // Active repo now lives in the Zustand store, not local state.
  const repoId = useWorkspaceStore((s) => s.activeRepoId)
  const setActiveRepo = useWorkspaceStore((s) => s.setActiveRepo)

  const repos = useRepos()
  const status = useRepoStatus(repoId)
  const ingest = useIngest()
  const chat = useChat(repoId)

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8 font-mono text-sm">
      <section>
        <h2 className="font-bold">Repos ({repos.data?.length ?? "…"})</h2>
        {repos.data?.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveRepo(r.id)}
            className={`block underline ${r.id === repoId ? "font-bold" : ""}`}
          >
            {r.name} — {r.status}
          </button>
        ))}
      </section>

      <section>
        <h2 className="font-bold">Upload</h2>
        <input
          type="file"
          accept=".zip"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file)
              ingest.mutate(file, {
                onSuccess: (d) => setActiveRepo(d.repo_id),
              })
          }}
        />
        {ingest.isPending && <p>uploading…</p>}
        {ingest.error && <p className="text-error">{ingest.error.message}</p>}
      </section>

      <section>
        <h2 className="font-bold">Live status</h2>
        <p>
          {repoId ?? "no repo"} → {status.data?.status ?? "—"}{" "}
          {status.isFetching && "(polling)"}
        </p>
      </section>

      <section>
        <h2 className="font-bold">Ask</h2>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && repoId && question.trim()) {
              chat.send(question)
              setQuestion("")
            }
          }}
          className="w-full border p-2"
          placeholder="Ask about the selected repo, press Enter"
        />
        <button
          disabled={!repoId || !question.trim()}
          onClick={() => {
            chat.send(question)
            setQuestion("")
          }}
          className="mt-2 border px-3 py-1"
        >
          Ask
        </button>
        {chat.isPending && <p className="mt-2">(answer in flight…)</p>}

        {chat.messages.map((m) => (
          <div key={m.id} className="mt-3 border-l-2 pl-3">
            {m.role === "user" ? (
              <pre className="whitespace-pre-wrap">▸ {m.content}</pre>
            ) : (
              <>
                <pre
                  className={`whitespace-pre-wrap ${m.status === "error" ? "text-error" : ""}`}
                >
                  {m.status === "pending" ? "… thinking" : `◂ ${m.content}`}
                </pre>
                {m.status === "done" && (
                  <p className="text-text-muted">
                    confidence {m.confidence.toFixed(2)} · {m.latencyMs}ms ·{" "}
                    {m.context.length} chunks
                  </p>
                )}
              </>
            )}
          </div>
        ))}
      </section>
    </main>
  )
}
