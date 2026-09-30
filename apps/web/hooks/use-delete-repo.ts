import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/keys"

export function useDeleteRepo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (repoId: string) => api.deleteRepo(repoId),
    onSuccess: (_data, repoId) => {
      // Drop the deleted repo's status entry entirely — otherwise a component
      // still watching it would keep polling a 404 forever.
      queryClient.removeQueries({ queryKey: queryKeys.repoStatus(repoId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.repos })
    },
  })
}
