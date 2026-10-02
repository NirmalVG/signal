import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

// The only user fields the UI ever sees. We pass this small plain object to
// client components instead of Supabase's full `User` (identities, app
// metadata, and so on).
export type AuthUser = {
  id: string
  email: string
  name: string
  avatarUrl: string | null
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ? toAuthUser(user) : null
}

function toAuthUser(user: User): AuthUser {
  // Google's profile claims are stored by Supabase in user_metadata.
  const meta = user.user_metadata ?? {}
  const email = user.email ?? ""
  return {
    id: user.id,
    email,
    name: meta.full_name ?? meta.name ?? (email.split("@")[0] || "Account"),
    avatarUrl: meta.avatar_url ?? meta.picture ?? null,
  }
}
