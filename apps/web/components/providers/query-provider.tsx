"use client"

import { useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

export function QueryProvider({ children }: { children: ReactNode }) {
  // useState with an initializer function = created ONCE per browser session.
  // A module-level `new QueryClient()` would be shared across users on the
  // server; creating it inline would reset the cache on every re-render.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // treat data as fresh for 30s — no refetch spam
            retry: 1, // one retry, then surface the error to the UI
            refetchOnWindowFocus: false, // calmer UX for a demo app
          },
        },
      }),
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
