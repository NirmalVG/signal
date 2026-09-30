import { useAsk } from "@/hooks/use-ask"
import { useMessages, useWorkspaceStore } from "@/store/workspace-store"

// Glue between server state (useAsk mutation) and UI state (the store).
export function useChat(repoId: string | null) {
  const messages = useMessages(repoId)
  const ask = useAsk()
  const addMessage = useWorkspaceStore((s) => s.addMessage)
  const updateMessage = useWorkspaceStore((s) => s.updateMessage)

  function send(question: string) {
    const text = question.trim()
    if (!repoId || !text) return

    // Capture the repo NOW. If the user switches repos while the answer is
    // in flight, the response must still land in the thread it belongs to.
    const targetRepo = repoId
    const assistantId = crypto.randomUUID()

    addMessage(targetRepo, {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    })
    addMessage(targetRepo, {
      id: assistantId,
      role: "assistant",
      status: "pending",
      content: "",
      context: [],
      confidence: 0,
      latencyMs: 0,
    })

    // mutateAsync (not mutate + callbacks): callbacks passed to mutate() are
    // dropped if the user sends a second question before the first returns,
    // which would leave the first bubble stuck on "pending" forever. The
    // promise always settles, so every message is guaranteed to resolve.
    ask
      .mutateAsync({ repoId: targetRepo, question: text })
      .then((res) =>
        updateMessage(targetRepo, assistantId, {
          status: "done",
          content: res.answer,
          context: res.context,
          confidence: res.confidence,
          latencyMs: res.latency_ms,
        }),
      )
      .catch((err: Error) =>
        updateMessage(targetRepo, assistantId, {
          status: "error",
          content: err.message,
        }),
      )
  }

  // Derived from the messages themselves, so it stays correct even with
  // several questions in flight.
  const isPending = messages.some(
    (m) => m.role === "assistant" && m.status === "pending",
  )

  return { messages, send, isPending }
}
