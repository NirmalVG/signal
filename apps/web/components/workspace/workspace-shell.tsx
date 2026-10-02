"use client"

import { useEffect, type CSSProperties } from "react"
import { CitationDrawer } from "@/components/workspace/citation-drawer"
import { Canvas } from "@/components/workspace/canvas"
import { RepoRail } from "@/components/workspace/repo-rail"
import { cn } from "@/lib/utils"
import { useWorkspaceStore } from "@/store/workspace-store"
import type { AuthUser } from "@/lib/auth/user"
import { AuthProvider } from "@/components/auth/auth-provider"

// Dimmed backdrop behind overlay panels. Clicking it dismisses the panel.
function Scrim({
  visible,
  onClick,
  className,
}: {
  visible: boolean
  onClick: () => void
  className: string
}) {
  return (
    <div
      aria-hidden="true"
      onClick={onClick}
      className={cn(
        "fixed inset-0 z-30 bg-text/25 transition-opacity duration-300",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
        className,
      )}
    />
  )
}

export function WorkspaceShell({ user }: { user: AuthUser | null }) {
  const collapsed = useWorkspaceStore((s) => s.sidebarCollapsed)
  const mobileNavOpen = useWorkspaceStore((s) => s.mobileNavOpen)
  const setMobileNav = useWorkspaceStore((s) => s.setMobileNav)
  const citation = useWorkspaceStore((s) => s.selectedCitation)
  const selectCitation = useWorkspaceStore((s) => s.selectCitation)

  // Esc dismisses whatever overlay is open — expected keyboard behavior.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return
      selectCitation(null)
      setMobileNav(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selectCitation, setMobileNav])

  // The grid's column widths are CSS variables, so the layout animates with
  // a plain CSS transition — React only flips two values.
  const style = {
    "--rail-w": collapsed ? "0px" : "280px",
    "--drawer-w": citation ? "40vw" : "0px",
  } as CSSProperties

  return (
    <AuthProvider user={user}>
      <div
        style={style}
        className={cn(
          "h-dvh overflow-hidden bg-background",
          // md–xl: rail + canvas. xl+: rail + canvas + drawer.
          "md:grid md:grid-cols-[var(--rail-w)_minmax(0,1fr)]",
          "xl:grid-cols-[var(--rail-w)_minmax(0,1fr)_var(--drawer-w)]",
          "md:transition-[grid-template-columns] md:duration-300 md:ease-out",
        )}
      >
        <RepoRail />
        <Canvas user={user} />
        <CitationDrawer />

        {/* Below md the rail is an overlay; below xl the drawer is one. */}
        <Scrim
          visible={mobileNavOpen}
          onClick={() => setMobileNav(false)}
          className="md:hidden"
        />
        <Scrim
          visible={citation !== null}
          onClick={() => selectCitation(null)}
          className="xl:hidden"
        />
      </div>
    </AuthProvider>
  )
}
