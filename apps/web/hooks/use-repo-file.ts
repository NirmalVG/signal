import { useQuery } from "@tanstack/react-query"
import { api, ApiError } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/keys"

export function useRepoFile(repoId: string | null, path: string | null) {
  return useQuery({
    queryKey: queryKeys.repoFile(repoId ?? "", path ?? ""),
    queryFn: () => api.getRepoFile(repoId!, path!),
    enabled: repoId !== null && path !== null,
    // An uploaded repo never changes, so a fetched file is valid forever:
    // re-opening a citation is instant and costs no request.
    staleTime: Infinity,
    // Retrying a 404/413/400 can't succeed. Only retry server-side (5xx)
    // or network failures, and only once.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status < 500) && failureCount < 1,
  })
}
