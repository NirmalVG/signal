import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/keys"
import { isTerminalStatus } from "@/lib/api/types"

const POLL_INTERVAL_MS = 2000

export function useRepoStatus(repoId: string | null) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.repoStatus(repoId ?? ""),
    queryFn: () => api.getRepoStatus(repoId!),
    enabled: repoId !== null, // no repo selected → don't fire at all
    // Called after every fetch. Returning `false` stops the polling.
    refetchInterval: (q) => {
      const status = q.state.data?.status
      return status && isTerminalStatus(status) ? false : POLL_INTERVAL_MS
    },
    staleTime: 0, // status must never be served from a "fresh" cache
  })

  const status = query.data?.status

  // When indexing finishes, the sidebar's repo list is now out of date
  // (new repo / new status badge) — mark it stale so it refetches.
  useEffect(() => {
    if (status && isTerminalStatus(status)) {
      queryClient.invalidateQueries({ queryKey: queryKeys.repos })
    }
  }, [status, queryClient])

  return query
}
