import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/keys"

export function useRepos() {
  return useQuery({
    queryKey: queryKeys.repos,
    queryFn: api.listRepos,
  })
}
