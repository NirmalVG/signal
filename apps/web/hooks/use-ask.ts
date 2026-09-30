import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

interface AskVariables {
  repoId: string
  question: string
}

export function useAsk() {
  return useMutation({
    mutationFn: ({ repoId, question }: AskVariables) =>
      api.askQuestion(repoId, question),
  })
}
