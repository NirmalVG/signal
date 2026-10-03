"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown, LayoutDashboard, Loader2, LogOut } from "lucide-react"
import type { AuthUser } from "@/lib/auth/user"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

function Avatar({ user, className }: { user: AuthUser; className?: string }) {
  const [failed, setFailed] = useState(false)
  const initial = (user.name || user.email).charAt(0).toUpperCase()

  if (user.avatarUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn("rounded-full object-cover", className)}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary font-semibold text-white",
        className,
      )}
    >
      {initial}
    </span>
  )
}

function SignOutButton() {
  const [pending, setPending] = useState(false)

  async function handleSignOut() {
    setPending(true)
    // "local" ends only this browser's session; the default ("global") would
    // also sign you out on your phone and every other device.
    const { error } = await createClient().auth.signOut({ scope: "local" })
    if (error) {
      setPending(false) // e.g. offline: stay signed in so you can try again
      return
    }
    // A full page load, on purpose. It throws away everything held in memory
    // (the React Query cache, the selected repo), so the next person at this
    // browser never sees the previous user's repository names.
    window.location.assign("/")
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-text-muted transition-colors duration-150 hover:bg-error-container hover:text-error focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-error/30 disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
      {pending ? "Signing out…" : "Sign out"}
    </button>
  )
}

export function UserMenu({
  user,
  showWorkspaceLink = false,
}: {
  user: AuthUser
  showWorkspaceLink?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape, but only listen while it's open.
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-1.5 rounded-full border border-border bg-surface p-0.5 pr-2 transition-colors duration-150 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
      >
        <Avatar user={user} className="size-8 text-xs" />
        <ChevronDown
          className={cn(
            "size-3.5 text-text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 animate-fade-up rounded-xl border border-border bg-surface p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_40px_-8px_rgba(15,23,42,0.18)]">
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <Avatar user={user} className="size-10 shrink-0 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-text-muted">{user.email}</p>
            </div>
          </div>

          <div className="my-1.5 h-px bg-border" />

          {showWorkspaceLink && (
            <Link
              href="/workspace"
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
            >
              <LayoutDashboard className="size-4" />
              Open workspace
            </Link>
          )}

          <SignOutButton />
        </div>
      )}
    </div>
  )
}
