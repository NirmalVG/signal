"use client"

// TEMPORARY sanity check for the hooks — delete before real UI work.
import { useState } from "react"
import { useAsk } from "@/hooks/use-ask"
import { useIngest } from "@/hooks/use-ingest"
import { useRepos } from "@/hooks/use-repos"
import { useRepoStatus } from "@/hooks/use-repo-status"

export default function DevPage() {
  const [repoId, setRepoId] = useState<string | null>(null)
  const [question, setQuestion] = useState("")

  const repos = useRepos()
  const status = useRepoStatus(repoId)
  const ingest = useIngest()
  const ask = useAsk()

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8 font-mono text-sm">
      <section>
        <h2 className="font-bold">Repos ({repos.data?.length ?? "…"})</h2>
        {repos.data?.map((r) => (
          <button
            key={r.id}
            onClick={() => setRepoId(r.id)}
            className="block underline"
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
              ingest.mutate(file, { onSuccess: (d) => setRepoId(d.repo_id) })
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
          className="w-full border p-2"
        />
        <button
          disabled={!repoId || !question || ask.isPending}
          onClick={() => ask.mutate({ repoId: repoId!, question })}
          className="mt-2 border px-3 py-1"
        >
          {ask.isPending ? "thinking…" : "Ask"}
        </button>
        {ask.error && <p className="text-error">{ask.error.message}</p>}
        {ask.data && (
          <pre className="mt-2 whitespace-pre-wrap">
            {ask.data.answer}
            {"\n\n"}confidence {ask.data.confidence.toFixed(2)} ·{" "}
            {ask.data.latency_ms}ms · {ask.data.context.length} chunks
          </pre>
        )}
      </section>
    </main>
  )
}
