"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { GoogleIcon } from "@/components/auth/google-icon"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export function GoogleButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If the user hits Back from Google's page, the browser may restore this
  // page from its back/forward cache with `loading` still true. Reset it.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) setLoading(false)
    }
    window.addEventListener("pageshow", onPageShow)
    return () => window.removeEventListener("pageshow", onPageShow)
  }, [])

  async function signIn() {
    if (loading) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Always show the account chooser, even if the browser is signed in
        // to exactly one Google account.
        queryParams: { prompt: "select_account" },
      },
    })

    // On success the browser is already navigating away, so we only
    // reach this point if something went wrong.
    if (error) {
      setError("Couldn't reach Google. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div>
      <Button
        variant="secondary"
        size="lg"
        onClick={signIn}
        aria-busy={loading}
        className="group w-full gap-3 text-[15px] font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-px hover:border-text-faint hover:shadow-[0_8px_20px_-6px_rgba(15,23,42,0.18)] active:translate-y-0 active:shadow-none disabled:opacity-100"
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="animate-spin text-text-muted" />
        ) : (
          <GoogleIcon className="!size-[18px]" />
        )}
        {loading ? "Redirecting to Google…" : "Continue with Google"}
      </Button>

      {error && (
        <p role="alert" className="mt-3 text-center text-sm text-error">
          {error}
        </p>
      )}
    </div>
  )
}
