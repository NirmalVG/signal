import { createServerClient } from "@supabase/ssr"
import type { SerializeOptions } from "cookie"
import { cookies } from "next/headers"

type SupabaseCookie = {
  name: string
  value: string
  options: Partial<SerializeOptions>
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: SupabaseCookie[], headers: Record<string, string>) {
          void headers

          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component, which can't write cookies.
            // Safe to ignore: the proxy (Step 3) refreshes the session.
          }
        },
      },
    },
  )
}
