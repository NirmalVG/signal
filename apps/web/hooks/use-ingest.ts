import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/keys"

export function useIngest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => api.ingestRepo(file),
    onSuccess: (data) => {
      // Seed the status cache with what the server just told us, so the UI
      // shows "extracted" instantly instead of flashing an empty state
      // while the first poll is in flight.
      queryClient.setQueryData(queryKeys.repoStatus(data.repo_id), {
        id: data.repo_id,
        name: data.name,
        status: data.status,
        ingested_at: null,
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.repos })
    },
  })
}
