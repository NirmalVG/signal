"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { AuthUser } from "@/lib/auth/user"

// Default is `null` = guest. Forgetting the provider makes the UI MORE
// restrictive, never less.
const AuthContext = createContext<AuthUser | null>(null)

export function AuthProvider({
  user,
  children,
}: {
  user: AuthUser | null
  children: ReactNode
}) {
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>
}

export function useAuthUser() {
  const user = useContext(AuthContext)
  return { user, isGuest: user === null }
}
