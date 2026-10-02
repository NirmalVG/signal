import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { AlertCircle, ArrowLeft, Lock } from "lucide-react"
import { AuthShowcase } from "@/components/auth/auth-showcase"
import { GoogleButton } from "@/components/auth/google-button"
import { SignalMark } from "@/components/brand/signal-mark"
import { SITE } from "@/lib/site"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Sign in — Signal" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  // Already signed in? Skip the login screen entirely.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect("/workspace")

  const { error } = await searchParams

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="relative flex flex-col overflow-hidden px-6 py-8 sm:px-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[length:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black_20%,transparent_75%)]" />
        <div className="pointer-events-none absolute left-1/2 top-[-140px] -z-10 h-[360px] w-[520px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-text-muted transition-colors duration-150 hover:text-text"
        >
          <ArrowLeft className="size-4" /> Back to home
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px] animate-fade-up rounded-xl border border-border bg-surface p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-12px_rgba(15,23,42,0.12)]">
            <SignalMark className="size-11" />

            <h1 className="mt-6 text-[26px] font-bold leading-8 tracking-[-0.02em]">
              Welcome to Signal
            </h1>
            <p className="mt-2 text-[15px] leading-6 text-text-muted">
              Sign in to ask your codebase questions and verify every answer.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-2.5 rounded-md border border-error/20 bg-error-container px-3.5 py-3 text-sm text-on-error-container"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                We couldn&apos;t complete sign-in. Please try again.
              </div>
            )}

            <div className="mt-6">
              <GoogleButton />
            </div>

            <div className="mt-6 flex items-start gap-2.5 border-t border-border pt-5 text-xs leading-5 text-text-muted">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-secondary" />
              <p>
                Signal only receives your name, email and profile photo. Your
                Google password never reaches us.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-text-faint">
          Built by {SITE.author}
        </p>
      </section>

      <AuthShowcase />
    </main>
  )
}
