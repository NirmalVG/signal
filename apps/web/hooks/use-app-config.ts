import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/keys"

// Server flags that rarely change, e.g. "this instance is a read-only demo".
export function useAppConfig() {
  const query = useQuery({
    queryKey: queryKeys.config,
    queryFn: api.getConfig,
    staleTime: Infinity,
  })

  return {
    readOnly: query.data?.read_only ?? false,
    // `ready` = we got an answer OR gave up (API down). Either way the UI can
    // stop waiting; the rest of the app already reports an unreachable API.
    ready: !query.isPending,
  }
}
